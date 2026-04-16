import { v4 as uuidv4 } from 'uuid';
import {
  Room, Player, Language, GameMode, Difficulty, ClientRoom, ClientToken, ClientGameState,
  ChatMessage, GameState, Token, SessionData,
} from './types';
import { normalizeWord } from './wikipedia';

// ---- Storage ----
const rooms = new Map<string, Room>();
/** sessionToken → SessionData */
const sessions = new Map<string, SessionData>();
/** playerId → sessionToken (for quick lookup on disconnect) */
const playerToToken = new Map<string, string>();

const GRACE_MS = 2 * 60 * 1000; // 2-minute reconnect window

// ---- Room code generation ----
const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
function generateCode() {
  let c = '';
  for (let i = 0; i < 4; i++) c += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  return c;
}
export function generateRoomCode() {
  let c = generateCode();
  while (rooms.has(c)) c = generateCode();
  return c;
}

// ---- Session helpers ----
export function issueSession(roomCode: string, playerId: string, playerName: string): string {
  const token = uuidv4();
  sessions.set(token, { sessionToken: token, roomCode, playerId, playerName });
  playerToToken.set(playerId, token);
  return token;
}

export function getSession(token: string): SessionData | undefined {
  return sessions.get(token);
}

export function deleteSession(token: string) {
  const s = sessions.get(token);
  if (s) {
    playerToToken.delete(s.playerId);
    sessions.delete(token);
  }
}

/**
 * Start a 2-minute grace timer before actually removing the player.
 * Returns the session token (or null if no session exists).
 */
export function startDisconnectGrace(
  playerId: string,
  onExpire: () => void
): string | null {
  const token = playerToToken.get(playerId);
  if (!token) return null;
  const session = sessions.get(token);
  if (!session) return null;

  // Clear any existing timer
  if (session.disconnectTimer) clearTimeout(session.disconnectTimer);

  session.disconnectTimer = setTimeout(() => {
    sessions.delete(token);
    playerToToken.delete(playerId);
    onExpire();
  }, GRACE_MS);

  return token;
}

export function cancelGrace(token: string) {
  const session = sessions.get(token);
  if (!session) return;
  if (session.disconnectTimer) {
    clearTimeout(session.disconnectTimer);
    session.disconnectTimer = undefined;
  }
}

// ---- Serialization ----
function serializeTokensFromSet(game: GameState, revealedSet: Set<string>): ClientToken[] {
  const finished = game.status === 'finished';
  return game.tokens.map((token) => {
    if (token.type === 'other') {
      return { type: 'other', value: token.value, length: token.value.length, revealed: true };
    }
    if (token.type === 'number') {
      return { type: 'number', value: finished ? token.value : '', length: token.value.length, revealed: finished };
    }
    const norm = token.normalized ?? '';
    const revealed = revealedSet.has(norm);
    return {
      type: 'word',
      value: revealed ? token.value : '',
      length: token.value.length,
      revealed,
      normalized: revealed ? norm : undefined,
    };
  });
}

function getEffectiveRevealedSet(room: Room, playerId?: string): Set<string> {
  if (room.gameMode === 'competitive' && room.game.status === 'playing' && playerId) {
    const personal = room.game.playerRevealedWords.get(playerId) ?? new Set<string>();
    const effective = new Set(room.game.revealedWords);
    for (const w of personal) effective.add(w);
    return effective;
  }
  return room.game.revealedWords;
}

function getEffectiveTitleRevealed(room: Room, playerId?: string): boolean[] {
  const shared = room.game.titleRevealed;
  if (room.gameMode === 'competitive' && room.game.status === 'playing' && playerId) {
    const personal = room.game.playerTitleRevealed.get(playerId) ?? shared.map(() => false);
    // merge: a slot is visible if the shared (leader) reveals it OR the player personally revealed it
    return shared.map((s, i) => s || personal[i]);
  }
  return shared;
}

export function serializeRoom(room: Room, playerId?: string): ClientRoom {
  const finished = room.game.status === 'finished';
  const revealedSet = getEffectiveRevealedSet(room, playerId);
  const clientGame: ClientGameState = {
    status: room.game.status,
    tokens: room.game.status !== 'waiting' ? serializeTokensFromSet(room.game, revealedSet) : [],
    revealedWords: Array.from(revealedSet),
    startTime: room.game.startTime,
    winnerId: room.game.winnerId,
    winnerOrder: room.game.winnerOrder,
    articleTitle: finished ? room.game.articleTitle : undefined,
    titleWordLengths: room.game.articleTitle
      ? room.game.articleTitle.split(/\s+/).filter(Boolean).map((w) => w.length)
      : [],
    titleRevealed: getEffectiveTitleRevealed(room, playerId).map((revealed, i) =>
      revealed ? room.game.titleWords[i] : null,
    ),
    articleUrl: finished ? room.game.articleUrl : undefined,
  };
  return {
    code: room.code,
    leaderId: room.leaderId,
    players: Array.from(room.players.values()).map((p) => ({ ...p })),
    language: room.language,
    gameMode: room.gameMode,
    difficulty: room.difficulty,
    game: clientGame,
  };
}

// ---- Room CRUD ----
export function createRoom(playerName: string, playerId: string): Room {
  const code = generateRoomCode();
  const leader: Player = {
    id: playerId, name: playerName, isReady: true, isLeader: true,
    score: { wordsSubmitted: 0, wordsRevealedFirst: 0, hasWon: false },
  };
  const room: Room = {
    code, leaderId: playerId,
    players: new Map([[playerId, leader]]),
    language: 'fr',
    gameMode: 'competitive',
    difficulty: 'medium',
    game: {
      status: 'waiting', articleTitle: '', targetNormalized: '',
      tokens: [], revealedWords: new Set(), playerRevealedWords: new Map(), winnerOrder: [],
      titleWords: [], titleNormalized: [], titleRevealed: [], playerTitleRevealed: new Map(), articleUrl: '',
    },
    chatHistory: [],
  };
  rooms.set(code, room);
  return room;
}

export function getRoom(code: string): Room | undefined {
  return rooms.get(code);
}

export function joinRoom(
  code: string, playerName: string, playerId: string
): { success: true; room: Room } | { success: false; error: string } {
  const room = rooms.get(code);
  if (!room) return { success: false, error: 'Room not found' };
  if (room.game.status === 'playing') return { success: false, error: 'Game already in progress' };
  if (room.players.size >= 20) return { success: false, error: 'Room is full' };

  const player: Player = {
    id: playerId, name: playerName, isReady: false, isLeader: false,
    score: { wordsSubmitted: 0, wordsRevealedFirst: 0, hasWon: false },
  };
  room.players.set(playerId, player);
  return { success: true, room };
}

export function removePlayer(code: string, playerId: string): Room | null {
  const room = rooms.get(code);
  if (!room) return null;
  room.players.delete(playerId);

  if (room.players.size === 0) {
    if (room.timerInterval) clearInterval(room.timerInterval);
    rooms.delete(code);
    return null;
  }

  if (room.leaderId === playerId) {
    const newLeader = room.players.values().next().value as Player;
    newLeader.isLeader = true;
    newLeader.isReady = true;
    room.leaderId = newLeader.id;
  }
  return room;
}

export function setPlayerReady(code: string, playerId: string, ready: boolean): Room | null {
  const room = rooms.get(code);
  if (!room) return null;
  const player = room.players.get(playerId);
  if (!player || player.isLeader) return room;
  player.isReady = ready;
  return room;
}

export function setLanguage(code: string, playerId: string, language: Language): Room | null {
  const room = rooms.get(code);
  if (!room || room.leaderId !== playerId) return null;
  room.language = language;
  return room;
}

export function addChatMessage(
  code: string,
  message: Omit<ChatMessage, 'id'>
): ChatMessage | null {
  const room = rooms.get(code);
  if (!room) return null;
  const msg: ChatMessage = { ...message, id: uuidv4() };
  room.chatHistory.push(msg);
  if (room.chatHistory.length > 200) room.chatHistory.shift();
  return msg;
}

// ---- Game logic ----

export function startGame(code: string, tokens: Token[], articleTitle: string, articleUrl: string): Room | null {
  const room = rooms.get(code);
  if (!room) return null;

  const titleWords = articleTitle.split(/\s+/).filter(Boolean);
  const titleNormalized = titleWords.map((w) => normalizeWord(w));
  const titleRevealed = titleWords.map(() => false);

  const playerRevealedWords = new Map<string, Set<string>>();
  const playerTitleRevealed = new Map<string, boolean[]>();
  for (const pid of room.players.keys()) {
    playerRevealedWords.set(pid, new Set());
    playerTitleRevealed.set(pid, titleWords.map(() => false));
  }

  room.game = {
    status: 'playing',
    articleTitle,
    targetNormalized: normalizeWord(articleTitle.split(/\s+/)[0]),
    tokens,
    revealedWords: new Set(),
    playerRevealedWords,
    startTime: Date.now(),
    winnerOrder: [],
    titleWords,
    titleNormalized,
    titleRevealed,
    playerTitleRevealed,
    articleUrl,
  };

  for (const player of room.players.values()) {
    player.score = { wordsSubmitted: 0, wordsRevealedFirst: 0, hasWon: false };
    if (!player.isLeader) player.isReady = false;
  }
  return room;
}

export type SubmitResult =
  | { result: 'win';           normalized: string; articleTitle: string; rank: number }
  | { result: 'revealed';      normalized: string }
  | { result: 'already-known'; normalized: string }
  | { result: 'not-found';     normalized: string }
  | { result: 'error' };

/** Reveal title positions matching `normalized`.
 *  Competitive: writes to the player's personal title array.
 *  Coop: writes to the shared title array.
 *  Returns true if at least one new position was revealed. */
function revealMatchingTitlePositions(
  game: GameState,
  normalized: string,
  playerId: string,
  gameMode: GameMode,
): boolean {
  if (gameMode === 'competitive') {
    const personalTitle = game.playerTitleRevealed.get(playerId) ?? game.titleRevealed.map(() => false);
    let changed = false;
    for (let i = 0; i < game.titleNormalized.length; i++) {
      if (game.titleNormalized[i] === normalized && !game.titleRevealed[i] && !personalTitle[i]) {
        personalTitle[i] = true;
        changed = true;
      }
    }
    if (changed) game.playerTitleRevealed.set(playerId, personalTitle);
    return changed;
  } else {
    let changed = false;
    for (let i = 0; i < game.titleNormalized.length; i++) {
      if (game.titleNormalized[i] === normalized && !game.titleRevealed[i]) {
        game.titleRevealed[i] = true;
        changed = true;
      }
    }
    return changed;
  }
}

export function submitWord(code: string, playerId: string, word: string): SubmitResult {
  const room = rooms.get(code);
  if (!room || room.game.status !== 'playing') return { result: 'error' };

  const player = room.players.get(playerId);
  if (!player) return { result: 'error' };

  const normalized = normalizeWord(word);
  if (!normalized) return { result: 'not-found', normalized: word };

  player.score.wordsSubmitted++;
  const { game } = room;

  // Win condition
  if (normalized === game.targetNormalized) {
    if (player.score.hasWon) return { result: 'already-known', normalized };

    game.revealedWords.add(normalized);
    player.score.wordsRevealedFirst++;
    player.score.hasWon = true;
    game.winnerOrder.push(playerId);
    const rank = game.winnerOrder.length;
    player.score.rank = rank;
    player.score.winTime = game.startTime ? Date.now() - game.startTime : 0;

    // Reveal matching title positions on win
    for (let i = 0; i < game.titleNormalized.length; i++) {
      if (game.titleNormalized[i] === normalized) game.titleRevealed[i] = true;
    }

    if (rank === 1) {
      game.status = 'finished';
      game.winnerId = playerId;
      // Merge all personal sets into shared so finished view shows everyone's progress
      for (const personalSet of game.playerRevealedWords.values()) {
        for (const w of personalSet) game.revealedWords.add(w);
      }
      // Reveal every title word in the body text and in the title display
      for (const norm of game.titleNormalized) game.revealedWords.add(norm);
      game.titleRevealed.fill(true);
      if (room.timerInterval) { clearInterval(room.timerInterval); room.timerInterval = undefined; }
    }
    return { result: 'win', normalized, articleTitle: game.articleTitle, rank };
  }

  // Check article body
  const existsInBody = game.tokens.some((t) => t.type === 'word' && t.normalized === normalized);

  // Check title words (reveal matching non-target positions)
  const newTitleReveal =
    normalized !== game.targetNormalized &&
    revealMatchingTitlePositions(game, normalized, playerId, room.gameMode);

  if (!existsInBody && !newTitleReveal) return { result: 'not-found', normalized };

  if (room.gameMode === 'competitive') {
    const personalSet = game.playerRevealedWords.get(playerId) ?? new Set<string>();
    if ((personalSet.has(normalized) || game.revealedWords.has(normalized)) && !newTitleReveal) {
      return { result: 'already-known', normalized };
    }
    if (existsInBody) {
      personalSet.add(normalized);
      game.playerRevealedWords.set(playerId, personalSet);
    }
    player.score.wordsRevealedFirst++;
    return { result: 'revealed', normalized };
  } else {
    if (game.revealedWords.has(normalized) && !newTitleReveal) return { result: 'already-known', normalized };
    if (existsInBody) game.revealedWords.add(normalized);
    player.score.wordsRevealedFirst++;
    return { result: 'revealed', normalized };
  }
}

export function setGameMode(code: string, playerId: string, mode: GameMode): Room | null {
  const room = rooms.get(code);
  if (!room || room.leaderId !== playerId) return null;
  if (room.game.status !== 'waiting') return null;
  room.gameMode = mode;
  return room;
}

export function setDifficulty(code: string, playerId: string, difficulty: Difficulty): Room | null {
  const room = rooms.get(code);
  if (!room || room.leaderId !== playerId) return null;
  if (room.game.status !== 'waiting') return null;
  room.difficulty = difficulty;
  return room;
}

/** Build the set of all unique normalized words in the article (for proximity queries). */
export function getArticleWordSet(code: string): Set<string> {
  const room = rooms.get(code);
  if (!room) return new Set();
  const s = new Set<string>();
  for (const t of room.game.tokens) {
    if (t.type === 'word' && t.normalized) s.add(t.normalized);
  }
  return s;
}
