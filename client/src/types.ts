export type Language = 'en' | 'fr';
export type GameStatus = 'waiting' | 'playing' | 'finished';

export interface PlayerScore {
  wordsSubmitted: number;
  wordsRevealedFirst: number;
  hasWon: boolean;
  winTime?: number;
  rank?: number;
}

export interface ClientPlayer {
  id: string;
  name: string;
  isReady: boolean;
  isLeader: boolean;
  score: PlayerScore;
}

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
  articleTitle?: string;
  titleWordLengths: number[];
}

export interface ClientRoom {
  code: string;
  leaderId: string;
  players: ClientPlayer[];
  language: Language;
  gameMode: 'competitive' | 'coop';
  game: ClientGameState;
}

export interface ChatMessage {
  id: string;
  playerId: string;
  playerName: string;
  message: string;
  timestamp: number;
  type: 'chat' | 'system' | 'win';
}

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

export interface FloatingEmoji {
  id: string;
  emoji: string;
  playerName: string;
  x: number;
}

export interface WordEntry {
  word: string;
  /** 'found' = in article, 'miss' = not found, 'common' = too common, 'close' = proximity match */
  status: 'found' | 'miss' | 'common' | 'close';
  timestamp: number;
}

/** Proximity word entry: tracks the guessed word and its score for an article word */
export interface ProximityWordEntry {
  word: string;
  score: number;
}

/** Maps article's normalized words → proximity score 0–1 */
export type ProximityMap = { [normalized: string]: number };

export interface StoredSession {
  sessionToken: string;
  roomCode: string;
  playerId: string;
  playerName: string;
}
