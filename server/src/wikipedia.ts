import axios from 'axios';
import { Language, Token } from './types';

interface WikiSummary {
  title: string;
  extract: string;
}

// Normalize: lowercase + strip diacritics + keep only a-z
export function normalizeWord(word: string): string {
  return word
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z]/g, '');
}

// Tokenize plain text into word/non-word tokens
export function tokenizeText(text: string): Token[] {
  const tokens: Token[] = [];
  const regex = /([a-zA-Z\u00C0-\u017E\u1E00-\u1EFF]+)|([^a-zA-Z\u00C0-\u017E\u1E00-\u1EFF]+)/g;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    if (match[1]) {
      const norm = normalizeWord(match[1]);
      if (norm.length > 0) {
        tokens.push({ type: 'word', value: match[1], normalized: norm });
      } else {
        tokens.push({ type: 'other', value: match[1] });
      }
    } else if (match[2]) {
      tokens.push({ type: 'other', value: match[2] });
    }
  }

  return tokens;
}

export async function fetchRandomArticle(language: Language): Promise<WikiSummary> {
  const base = `https://${language}.wikipedia.org/api/rest_v1`;

  for (let attempt = 0; attempt < 20; attempt++) {
    try {
      const res = await axios.get<{ title: string; extract: string; type: string }>(
        `${base}/page/random/summary`,
        {
          timeout: 8000,
          headers: { 'User-Agent': 'PedantixCompetitive/1.0 (educational game)' },
        }
      );

      const { title, extract, type } = res.data;

      if (type !== 'standard') continue;
      if (!extract || extract.length < 200 || extract.length > 5000) continue;

      const wordCount = title.trim().split(/\s+/).length;
      if (wordCount > 3) continue;

      const targetNorm = normalizeWord(title.split(/\s+/)[0]);
      const tokens = tokenizeText(extract);
      const appearsInText = tokens.some(
        (t) => t.type === 'word' && t.normalized === targetNorm
      );
      if (!appearsInText) continue;

      return { title, extract };
    } catch {
      await new Promise((r) => setTimeout(r, 300));
    }
  }

  throw new Error(`Could not fetch a suitable ${language} Wikipedia article`);
}

/**
 * Query Datamuse for words semantically close to `word`,
 * then return a score map for words that appear in the article.
 * Scores are normalized to 0–1 (1 = most similar).
 */
type DatamuseWord = { word: string; score: number };

function mergeProximity(
  result: { [norm: string]: number },
  items: DatamuseWord[],
  weight: number,
  articleWords: Set<string>
) {
  if (!items.length) return;
  const maxScore = items[0].score || 1;
  for (const item of items) {
    const norm = normalizeWord(item.word);
    if (norm.length > 1 && articleWords.has(norm)) {
      const score = (item.score / maxScore) * weight;
      if (score > (result[norm] ?? 0)) result[norm] = score;
    }
  }
}

export async function getProximityMap(
  word: string,
  language: Language,
  articleWords: Set<string>
): Promise<{ [normalized: string]: number }> {
  try {
    const enc = encodeURIComponent;
    const langParam = language === 'fr' ? '&v=fr' : '';

    // ── Hop 1: ml + rel_syn + rel_trg in parallel ────────────────────────
    const hop1Urls = [
      `https://api.datamuse.com/words?ml=${enc(word)}&max=60${langParam}`,
      `https://api.datamuse.com/words?rel_syn=${enc(word)}&max=30`,
      `https://api.datamuse.com/words?rel_trg=${enc(word)}&max=30`,
    ];
    const hop1Weights = [1.0, 0.9, 0.85];

    const hop1Results = await Promise.allSettled(
      hop1Urls.map((url) => axios.get<DatamuseWord[]>(url, { timeout: 3500 }))
    );

    const result: { [norm: string]: number } = {};
    const hop1Data: DatamuseWord[][] = [];

    for (let i = 0; i < hop1Results.length; i++) {
      const r = hop1Results[i];
      const data = r.status === 'fulfilled' ? (r.value.data ?? []) : [];
      hop1Data.push(data);
      mergeProximity(result, data, hop1Weights[i], articleWords);
    }

    // ── Hop 2: top 5 related words not in article → ml queries ───────────
    const allHop1 = hop1Data.flat();
    const selfNorm = normalizeWord(word);
    const topSeeds = allHop1
      .map((item) => ({ norm: normalizeWord(item.word), raw: item.word, score: item.score }))
      .filter(({ norm }) => norm.length > 2 && !articleWords.has(norm) && norm !== selfNorm)
      .sort((a, b) => b.score - a.score)
      .slice(0, 5)
      .map(({ raw }) => raw);

    if (topSeeds.length) {
      const hop2Results = await Promise.allSettled(
        topSeeds.map((w) =>
          axios.get<DatamuseWord[]>(
            `https://api.datamuse.com/words?ml=${enc(w)}&max=30${langParam}`,
            { timeout: 3000 }
          )
        )
      );
      for (const r of hop2Results) {
        const data = r.status === 'fulfilled' ? (r.value.data ?? []) : [];
        mergeProximity(result, data, 0.5, articleWords);
      }
    }

    return result;
  } catch {
    return {};
  }
}
