export type Language = 'en' | 'fr';
export type GameStatus = 'waiting' | 'playing' | 'finished';
export type GameMode = 'competitive' | 'coop';
export type Difficulty = 'easy' | 'medium' | 'hard';
export type Theme = 'people' | 'geography' | 'science' | 'history' | 'arts' | 'sports' | 'nature' | 'technology';

export interface PlayerScore {
  wordsSubmitted: number;
  wordsRevealedFirst: number;
  hasWon: boolean;
  winTime?: number;
  rank?: number;
}

export interface Player {
  id: string;
  name: string;
  isReady: boolean;
  isLeader: boolean;
  score: PlayerScore;
}

export interface Token {
  type: 'word' | 'other' | 'number';
  value: string;
  normalized?: string;
}

export interface GameState {
  status: GameStatus;
  articleTitle: string;
  targetNormalized: string;
  tokens: Token[];
  revealedWords: Set<string>;
  /** Per-player revealed words for competitive mode */
  playerRevealedWords: Map<string, Set<string>>;
  startTime?: number;
  winnerId?: string;
  winnerOrder: string[];
  /** Title words (original case) */
  titleWords: string[];
  /** Title words normalized */
  titleNormalized: string[];
  /** Which title word positions have been revealed by guesses (shared / coop / leader reveals) */
  titleRevealed: boolean[];
  /** Per-player title reveals for competitive mode */
  playerTitleRevealed: Map<string, boolean[]>;
  /** Full Wikipedia article URL */
  articleUrl: string;
}

export interface Room {
  code: string;
  leaderId: string;
  players: Map<string, Player>;
  language: Language;
  gameMode: GameMode;
  difficulty: Difficulty;
  /** Empty = no filter (all themes). Non-empty = only these themes are allowed. */
  themes: Theme[];
  /** When true, stopwords are pre-revealed at game start */
  revealStopwords: boolean;
  game: GameState;
  chatHistory: ChatMessage[];
  timerInterval?: ReturnType<typeof setInterval>;
}

export interface ChatMessage {
  id: string;
  playerId: string;
  playerName: string;
  message: string;
  timestamp: number;
  type: 'chat' | 'system' | 'win';
}

// ---- Session management ----
export interface SessionData {
  sessionToken: string;
  roomCode: string;
  playerId: string;
  playerName: string;
  disconnectTimer?: ReturnType<typeof setTimeout>;
}

// ---- Serialized (client-safe) types ----

export interface ClientToken {
  type: 'word' | 'other' | 'number';
  value: string;
  length: number;
  revealed: boolean;
  normalized?: string;
}

export interface ClientGameState {
  status: GameStatus;
  tokens: ClientToken[];
  revealedWords: string[];
  startTime?: number;
  winnerId?: string;
  winnerOrder: string[];
  articleTitle?: string; // only when finished
  titleWordLengths: number[]; // always — shape of title without revealing words
  /** Progressively revealed title words: string if revealed, null if hidden */
  titleRevealed: (string | null)[];
  /** Wikipedia article URL (only when finished) */
  articleUrl?: string;
}

export interface ClientPlayer {
  id: string;
  name: string;
  isReady: boolean;
  isLeader: boolean;
  score: PlayerScore;
}

export interface ClientRoom {
  code: string;
  leaderId: string;
  players: ClientPlayer[];
  language: Language;
  gameMode: GameMode;
  difficulty: Difficulty;
  themes: Theme[];
  /** When true, stopwords are pre-revealed at game start */
  revealStopwords: boolean;
  game: ClientGameState;
}

// ---- Event payloads ----

export interface WordRevealedPayload {
  normalized: string;
  revealedBy: string;
  revealedByName: string;
  isWin: boolean;
  articleTitle?: string;
  totalRevealed: number;
}

export interface PlayerWonPayload {
  playerId: string;
  playerName: string;
  winTime: number;
  wordsSubmitted: number;
  wordsRevealedFirst: number;
  rank: number;
}

export interface EmojiPayload {
  playerName: string;
  emoji: string;
  x: number;
}

export interface ProximityPayload {
  /** Maps normalized article words → similarity score 0–1 */
  map: { [normalized: string]: number };
}
