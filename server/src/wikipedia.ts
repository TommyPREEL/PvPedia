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
export async function getProximityMap(
  word: string,
  language: Language,
  articleWords: Set<string>
): Promise<{ [normalized: string]: number }> {
  try {
    const param = language === 'fr' ? `&v=fr` : '';
    const url = `https://api.datamuse.com/words?ml=${encodeURIComponent(word)}&max=60${param}`;
    const res = await axios.get<{ word: string; score: number }[]>(url, { timeout: 3500 });
    const data = res.data;
    if (!data?.length) return {};

    const maxScore = data[0].score || 1;
    const result: { [normalized: string]: number } = {};

    for (const item of data) {
      const norm = normalizeWord(item.word);
      if (norm.length > 1 && articleWords.has(norm)) {
        const existing = result[norm] ?? 0;
        const score = item.score / maxScore;
        if (score > existing) result[norm] = score;
      }
    }

    return result;
  } catch {
    return {};
  }
}
