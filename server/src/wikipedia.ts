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
          headers: { 'User-Agent': 'PvPedia/1.0 (educational game)' },
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
