import axios from 'axios';
import { JaroWinklerDistance, LevenshteinDistance, PorterStemmerFr, PorterStemmer } from 'natural';
import { Language, Token, Difficulty } from './types';

interface WikiSummary {
  title: string;
  extract: string;
  url: string;
}

// ---- Top-articles cache for difficulty mode ----
const topArticlesCache = new Map<string, { articles: string[]; fetchedAt: number }>();
const TOP_CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

async function getTopArticles(language: Language): Promise<string[]> {
  const cached = topArticlesCache.get(language);
  if (cached && Date.now() - cached.fetchedAt < TOP_CACHE_TTL) return cached.articles;

  const d = new Date();
  d.setDate(d.getDate() - 1); // yesterday (today might not be available yet)
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');

  const url = `https://wikimedia.org/api/rest_v1/metrics/pageviews/top/${language}.wikipedia/all-access/${year}/${month}/${day}`;
  const res = await axios.get(url, {
    timeout: 10000,
    headers: { 'User-Agent': 'PvPedia/1.0 (educational game)' },
  });

  const articles: string[] = (res.data.items?.[0]?.articles ?? [])
    .map((a: { article: string }) => a.article)
    .filter((title: string) =>
      !title.startsWith('Special:') &&
      !title.startsWith('Wikipedia:') &&
      !title.startsWith('Wikip\u00e9dia:') &&
      title !== 'Main_Page' &&
      title !== 'Wikip\u00e9dia:Accueil_principal'
    )
    .slice(0, 500);

  topArticlesCache.set(language, { articles, fetchedAt: Date.now() });
  return articles;
}

function buildArticleUrl(title: string, language: Language): string {
  return `https://${language}.wikipedia.org/wiki/${encodeURIComponent(title.replace(/ /g, '_'))}`;
}

// Normalize: lowercase + strip diacritics + keep only a-z
export function normalizeWord(word: string): string {
  return word
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z]/g, '');
}

// Tokenize plain text into word/number/other tokens
export function tokenizeText(text: string): Token[] {
  const tokens: Token[] = [];
  const regex = /([a-zA-Z\u00C0-\u017E\u1E00-\u1EFF]+)|(\d+)|([^a-zA-Z\u00C0-\u017E\u1E00-\u1EFF\d]+)/g;
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
      tokens.push({ type: 'number', value: match[2] });
    } else if (match[3]) {
      tokens.push({ type: 'other', value: match[3] });
    }
  }

  return tokens;
}

function htmlToPlainParagraphs(html: string): string[] {
  return html
    .split(/<\/?p[^>]*>/i)
    .map((p) =>
      p
        .replace(/<[^>]+>/g, ' ')
        .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, ' ')
        .replace(/\s{2,}/g, ' ')
        .trim()
    )
    .filter((p) => p.split(/\s+/).length >= 8); // skip very short fragments
}

/**
 * Fetch the full article via mobile-sections API and return clean plain text
 * with at least `minWords` words, accumulating whole paragraphs across sections.
 * Falls back to the summary extract on any error.
 */
async function fetchLeadExtract(
  title: string,
  language: Language,
  fallback: string,
  minWords = 150,
): Promise<string> {
  try {
    const url = `https://${language}.wikipedia.org/api/rest_v1/page/mobile-sections/${encodeURIComponent(title.replace(/ /g, '_'))}`;
    const res = await axios.get<{
      lead: { sections: Array<{ text: string }> };
      remaining?: { sections: Array<{ text: string; line?: string }> };
    }>(
      url,
      { timeout: 10000, headers: { 'User-Agent': 'PvPedia/1.0 (educational game)' } },
    );

    const allSections = [
      ...(res.data?.lead?.sections ?? []),
      ...(res.data?.remaining?.sections ?? []),
    ];

    const result: string[] = [];
    let totalWords = 0;

    for (const section of allSections) {
      if (!section.text) continue;
      for (const para of htmlToPlainParagraphs(section.text)) {
        result.push(para);
        totalWords += para.split(/\s+/).length;
        if (totalWords >= minWords) break;
      }
      if (totalWords >= minWords) break;
    }

    if (result.length === 0) return fallback;
    return result.join('\n\n');
  } catch {
    return fallback;
  }
}

export async function fetchRandomArticle(
  language: Language,
  difficulty: Difficulty = 'medium',
): Promise<WikiSummary> {
  const base = `https://${language}.wikipedia.org/api/rest_v1`;
  const headers = { 'User-Agent': 'PvPedia/1.0 (educational game)' };
  const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

  const isValid = (title: string, extract: string, type: string) =>
    type === 'standard' && !!extract && title.trim().split(/\s+/).length <= 3;

  // Easy mode: pick from top-viewed articles
  if (difficulty === 'easy') {
    let topArticles: string[] = [];
    try { topArticles = await getTopArticles(language); } catch { /* fallback to random */ }

    if (topArticles.length > 0) {
      const shuffled = [...topArticles].sort(() => Math.random() - 0.5);
      for (const randomTitle of shuffled.slice(0, 20)) {
        try {
          const res = await axios.get<{ title: string; extract: string; type: string }>(
            `${base}/page/summary/${encodeURIComponent(randomTitle)}`,
            { timeout: 8000, headers },
          );
          const { title, extract, type } = res.data;
          if (!isValid(title, extract, type)) continue;
          const fullExtract = await fetchLeadExtract(title, language, extract);
          return { title, extract: fullExtract, url: buildArticleUrl(title, language) };
        } catch (err: unknown) {
          const status = (err as { response?: { status?: number } })?.response?.status;
          if (status === 429) await delay(2000);
        }
      }
    }
    // fallthrough to random
  }

  for (let attempt = 0; attempt < 10; attempt++) {
    try {
      const res = await axios.get<{ title: string; extract: string; type: string }>(
        `${base}/page/random/summary`,
        { timeout: 8000, headers },
      );
      const { title, extract, type } = res.data;
      if (!isValid(title, extract, type)) continue;
      const fullExtract = await fetchLeadExtract(title, language, extract);
      return { title, extract: fullExtract, url: buildArticleUrl(title, language) };
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      await delay(status === 429 ? 3000 : 500);
    }
  }

  throw new Error(`Could not fetch a suitable ${language} Wikipedia article`);
}

// ---- Proximity (natural NLP — synchronous, no model download) ----

/**
 * Compute proximity scores between a guessed word and all article words.
 * Uses French/English-aware stemming, prefix matching, Jaro-Winkler, and
 * Levenshtein distance — works out of the box with no warmup or downloads.
 *
 * Returns a map: article normalized word → score 0–1.
 * Only words scoring ≥ 0.12 are included.
 */
export function getProximityMap(
  guessNorm: string,
  articleWords: string[],
  language: Language,
): Record<string, number> {
  if (!articleWords.length || guessNorm.length < 2) return {};

  const stemmer = language === 'fr' ? PorterStemmerFr : PorterStemmer;
  const guessStem = stemmer.stem(guessNorm);
  const result: Record<string, number> = {};

  for (const word of articleWords) {
    if (word === guessNorm || word.length < 2) continue;

    const wordStem = stemmer.stem(word);
    let score = 0;

    // 1. Prefix match (e.g. "roi"→"rois", "chant"→"chanteur", "grand"→"grande")
    if (word.startsWith(guessNorm) || guessNorm.startsWith(word)) {
      const shorter = Math.min(guessNorm.length, word.length);
      const longer  = Math.max(guessNorm.length, word.length);
      score = Math.max(score, 0.55 + 0.4 * (shorter / longer));
    }

    // 2. Same stem — morphological variants (plurals, conjugations, gender)
    if (guessStem.length >= 3 && guessStem === wordStem) {
      score = Math.max(score, 0.80);
    }

    // 3. Stem Jaro-Winkler — related but different stems
    if (guessStem.length >= 3 && wordStem.length >= 3 && guessStem !== wordStem) {
      const sJw = JaroWinklerDistance(guessStem, wordStem, {});
      if (sJw > 0.78) score = Math.max(score, sJw * 0.75);
    }

    // 4. Raw Jaro-Winkler on normalised forms
    const jw = JaroWinklerDistance(guessNorm, word, {});
    if (jw > 0.78) score = Math.max(score, jw * 0.88);

    // 5. Levenshtein — catches transpositions and 1-2 char differences
    const maxLen = Math.max(guessNorm.length, word.length);
    if (maxLen >= 3) {
      const ed = LevenshteinDistance(guessNorm, word, { insertion_cost: 1, deletion_cost: 1, substitution_cost: 1 });
      const ratio = 1 - ed / maxLen;
      if (ratio >= 0.50) score = Math.max(score, ratio * 0.85);
    }

    if (score >= 0.09) result[word] = Math.min(1, score);
  }

  return result;
}
