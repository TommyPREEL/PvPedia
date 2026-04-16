import axios from 'axios';
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

function validateArticle(
  title: string, extract: string, type: string,
): boolean {
  if (type !== 'standard') return false;
  if (!extract || extract.length < 200 || extract.length > 5000) return false;
  const wordCount = title.trim().split(/\s+/).length;
  if (wordCount > 3) return false;
  const targetNorm = normalizeWord(title.split(/\s+/)[0]);
  const tokens = tokenizeText(extract);
  return tokens.some((t) => t.type === 'word' && t.normalized === targetNorm);
}

export async function fetchRandomArticle(
  language: Language,
  difficulty: Difficulty = 'medium',
): Promise<WikiSummary> {
  const base = `https://${language}.wikipedia.org/api/rest_v1`;
  const headers = { 'User-Agent': 'PvPedia/1.0 (educational game)' };

  // Easy mode: pick from top-viewed articles
  if (difficulty === 'easy') {
    let topArticles: string[] = [];
    try { topArticles = await getTopArticles(language); } catch { /* fallback to random */ }

    if (topArticles.length > 0) {
      const shuffled = [...topArticles].sort(() => Math.random() - 0.5);
      for (let attempt = 0; attempt < Math.min(shuffled.length, 30); attempt++) {
        try {
          const randomTitle = shuffled[attempt];
          const res = await axios.get<{ title: string; extract: string; type: string }>(
            `${base}/page/summary/${encodeURIComponent(randomTitle)}`,
            { timeout: 8000, headers },
          );
          const { title, extract, type } = res.data;
          if (!validateArticle(title, extract, type)) continue;
          return { title, extract, url: buildArticleUrl(title, language) };
        } catch {
          await new Promise((r) => setTimeout(r, 200));
        }
      }
    }
    // If top articles failed, fall through to random
  }

  // Medium / Hard / fallback: random articles
  // Hard mode uses stricter extract length (shorter = less context = harder)
  const maxExtract = difficulty === 'hard' ? 2000 : 5000;
  const minExtract = difficulty === 'hard' ? 200 : 200;

  for (let attempt = 0; attempt < 25; attempt++) {
    try {
      const res = await axios.get<{ title: string; extract: string; type: string }>(
        `${base}/page/random/summary`,
        { timeout: 8000, headers },
      );

      const { title, extract, type } = res.data;

      if (type !== 'standard') continue;
      if (!extract || extract.length < minExtract || extract.length > maxExtract) continue;

      const wordCount = title.trim().split(/\s+/).length;
      if (wordCount > 3) continue;

      const targetNorm = normalizeWord(title.split(/\s+/)[0]);
      const tokens = tokenizeText(extract);
      const appearsInText = tokens.some(
        (t) => t.type === 'word' && t.normalized === targetNorm
      );
      if (!appearsInText) continue;

      return { title, extract, url: buildArticleUrl(title, language) };
    } catch {
      await new Promise((r) => setTimeout(r, 300));
    }
  }

  throw new Error(`Could not fetch a suitable ${language} Wikipedia article`);
}

// ---- Xenova Embedding Engine ----

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _embedder: any = null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _embedderPromise: Promise<any> | null = null;

/**
 * Load the multilingual sentence-embedding model once and cache it.
 * Safe to call multiple times — subsequent calls return the cached instance.
 */
export async function initEmbedder(): Promise<void> {
  if (_embedder) return;
  if (_embedderPromise) { await _embedderPromise; return; }
  _embedderPromise = (async () => {
    // Dynamic import works in both ESM and CJS thanks to @xenova/transformers v2 CJS build
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { pipeline } = await import('@xenova/transformers') as any;
    _embedder = await pipeline(
      'feature-extraction',
      'Xenova/paraphrase-multilingual-MiniLM-L12-v2',
      { quantized: true },  // ~40 MB INT8 model, supports EN + FR
    );
    console.log('[Embedder] paraphrase-multilingual-MiniLM-L12-v2 ready');
  })();
  await _embedderPromise;
}

/** Dot product of two Float32Arrays (cosine similarity when both are L2-normalised). */
function dot(a: Float32Array, b: Float32Array): number {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += a[i] * b[i];
  return s;
}

/** Levenshtein edit distance (iterative DP, O(n×m)). */
function levenshtein(a: string, b: string): number {
  const m = a.length, n = b.length;
  const dp: number[] = Array.from({ length: n + 1 }, (_, i) => i);
  for (let i = 1; i <= m; i++) {
    let prev = dp[0];
    dp[0] = i;
    for (let j = 1; j <= n; j++) {
      const tmp = dp[j];
      dp[j] = a[i - 1] === b[j - 1] ? prev : 1 + Math.min(prev, dp[j], dp[j - 1]);
      prev = tmp;
    }
  }
  return dp[n];
}

/**
 * Embed every article word in a single batched inference call.
 * Returns a Map of normalized word → L2-normalised embedding vector.
 * Call once per game start and cache the result in room.game.articleEmbeddings.
 */
export async function buildArticleEmbeddings(
  words: string[],
): Promise<Map<string, Float32Array>> {
  const filtered = words.filter((w) => w.length >= 2);
  if (!filtered.length) return new Map();
  await initEmbedder();
  const output = await _embedder(filtered, { pooling: 'mean', normalize: true });
  const map = new Map<string, Float32Array>();
  for (let i = 0; i < filtered.length; i++) {
    map.set(filtered[i], output[i].data as Float32Array);
  }
  return map;
}

/**
 * Compute proximity scores for a missed guess against cached article embeddings.
 * Combines two signals:
 *  1. Cosine similarity from Xenova embeddings (semantic: mère ↔ père)
 *  2. Levenshtein string similarity (morphological: un ↔ une, chat ↔ chats)
 * Takes the max of both — whichever fires gives the score.
 */
export async function getProximityMap(
  guessNorm: string,
  articleEmbeddings: Map<string, Float32Array>,
): Promise<{ [normalized: string]: number }> {
  if (!articleEmbeddings.size) return {};
  await initEmbedder();
  const out = await _embedder([guessNorm], { pooling: 'mean', normalize: true });
  const guessVec = out[0].data as Float32Array;

  const result: { [norm: string]: number } = {};
  for (const [word, vec] of articleEmbeddings) {
    // ── Cosine score: map [0.35, 1.0] → [0, 1] ────────────────────────────
    const cosine = dot(guessVec, vec);
    const cosScore = Math.max(0, (cosine - 0.35) / 0.65);

    // ── String score: morphological variants (edit distance) ───────────────
    // Only fires when edit distance ≤ ⌊maxLen/3⌋ (e.g. "un"↔"une", "chat"↔"chats")
    // but not for identical words (those are already revealed).
    const ed = levenshtein(guessNorm, word);
    const maxLen = Math.max(guessNorm.length, word.length);
    const strScore =
      ed > 0 && ed <= Math.floor(maxLen / 3)
        ? 1 - ed / maxLen
        : 0;

    const score = Math.max(cosScore, strScore);
    if (score > 0) result[word] = Math.min(1, score);
  }
  return result;
}
