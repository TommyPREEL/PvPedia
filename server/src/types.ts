export type Language = 'en' | 'fr';
export type GameStatus = 'waiting' | 'playing' | 'finished';

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
  type: 'word' | 'other';
  value: string;
  normalized?: string;
}

export interface GameState {
  status: GameStatus;
  articleTitle: string;
  targetNormalized: string;
  tokens: Token[];
  revealedWords: Set<string>;
  startTime?: number;
  winnerId?: string;
  winnerOrder: string[];
}

export interface Room {
  code: string;
  leaderId: string;
  players: Map<string, Player>;
  language: Language;
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
  type: 'word' | 'other';
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
