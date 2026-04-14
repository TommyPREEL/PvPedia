import express from 'express';
import http from 'http';
import { Server, Socket } from 'socket.io';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import {
  createRoom, getRoom, joinRoom, removePlayer, setPlayerReady, setLanguage, setGameMode,
  addChatMessage, submitWord, startGame, serializeRoom, issueSession,
  getSession, deleteSession, startDisconnectGrace, cancelGrace, getArticleWordSet,
} from './roomManager';
import { fetchRandomArticle, tokenizeText, getProximityMap } from './wikipedia';
import { Language } from './types';

const app = express();
app.use(cors());
app.use(express.json());

const httpServer = http.createServer(app);
const io = new Server(httpServer, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
});

const socketToRoom = new Map<string, { roomCode: string; playerId: string }>();

// ---- Helpers ----

function broadcastRoom(roomCode: string) {
  const room = getRoom(roomCode);
  if (!room) return;
  if (room.gameMode === 'competitive' && room.game.status === 'playing') {
    // Send each player their personalized view
    for (const [socketId, meta] of socketToRoom) {
      if (meta.roomCode !== roomCode) continue;
      io.to(socketId).emit('room-updated', serializeRoom(room, meta.playerId));
    }
  } else {
    io.to(roomCode).emit('room-updated', serializeRoom(room));
  }
}

function systemMessage(roomCode: string, message: string) {
  const msg = addChatMessage(roomCode, {
    playerId: 'system', playerName: 'System', message,
    timestamp: Date.now(), type: 'system',
  });
  if (msg) io.to(roomCode).emit('chat-message', msg);
}

// ---- Socket.io ----

io.on('connection', (socket: Socket) => {

  // ── RECONNECT SESSION ────────────────────────────────────────────────────────
  socket.on('reconnect-session', (
    sessionToken: string,
    cb: (res: { success: true; playerId: string; room: import('./types').ClientRoom } | { success: false; error: string }) => void
  ) => {
    const session = getSession(sessionToken);
    if (!session) return cb({ success: false, error: 'Session expired' });

    const room = getRoom(session.roomCode);
    if (!room || !room.players.has(session.playerId)) {
      deleteSession(sessionToken);
      return cb({ success: false, error: 'Room no longer active' });
    }

    cancelGrace(sessionToken);
    socket.join(session.roomCode);
    socketToRoom.set(socket.id, { roomCode: session.roomCode, playerId: session.playerId });

    systemMessage(session.roomCode, `${session.playerName} reconnected`);
    broadcastRoom(session.roomCode);
    cb({ success: true, playerId: session.playerId, room: serializeRoom(room, session.playerId) });
    socket.emit('chat-history', room.chatHistory);
  });

  // ── CREATE ROOM ──────────────────────────────────────────────────────────────
  socket.on('create-room', (
    playerName: string,
    cb: (res: { roomCode: string; playerId: string; sessionToken: string; room: import('./types').ClientRoom } | { error: string }) => void
  ) => {
    if (!playerName || typeof playerName !== 'string' || !playerName.trim()) {
      return cb({ error: 'Invalid player name' });
    }
    const name = playerName.trim().slice(0, 20);
    const playerId = uuidv4();
    const room = createRoom(name, playerId);
    const sessionToken = issueSession(room.code, playerId, name);

    socket.join(room.code);
    socketToRoom.set(socket.id, { roomCode: room.code, playerId });
    systemMessage(room.code, `${name} created the room`);
    cb({ roomCode: room.code, playerId, sessionToken, room: serializeRoom(room) });
    broadcastRoom(room.code);
  });

  // ── JOIN ROOM ────────────────────────────────────────────────────────────────
  socket.on('join-room', (
    payload: { roomCode: string; playerName: string },
    cb: (res: { success: true; playerId: string; sessionToken: string; room: import('./types').ClientRoom } | { success: false; error: string }) => void
  ) => {
    const { roomCode, playerName } = payload ?? {};
    if (!roomCode || !playerName || typeof playerName !== 'string') {
      return cb({ success: false, error: 'Invalid payload' });
    }
    const name = playerName.trim().slice(0, 20);
    if (!name) return cb({ success: false, error: 'Invalid name' });

    const playerId = uuidv4();
    const result = joinRoom(roomCode.toUpperCase(), name, playerId);
    if (!result.success) return cb(result);

    const sessionToken = issueSession(roomCode.toUpperCase(), playerId, name);
    socket.join(roomCode.toUpperCase());
    socketToRoom.set(socket.id, { roomCode: roomCode.toUpperCase(), playerId });
    systemMessage(roomCode.toUpperCase(), `${name} joined the room`);
    broadcastRoom(roomCode.toUpperCase());
    cb({ success: true, playerId, sessionToken, room: serializeRoom(result.room) });
    socket.emit('chat-history', result.room.chatHistory);
  });

  // ── PLAYER READY ─────────────────────────────────────────────────────────────
  socket.on('player-ready', (ready: boolean) => {
    const meta = socketToRoom.get(socket.id);
    if (!meta) return;
    const room = setPlayerReady(meta.roomCode, meta.playerId, ready);
    if (room) broadcastRoom(meta.roomCode);
  });

  // ── CHANGE LANGUAGE ──────────────────────────────────────────────────────────
  socket.on('change-language', (language: Language) => {
    const meta = socketToRoom.get(socket.id);
    if (!meta) return;
    if (language !== 'en' && language !== 'fr') return;
    const room = setLanguage(meta.roomCode, meta.playerId, language);
    if (room) {
      systemMessage(meta.roomCode, `Language changed to ${language === 'en' ? 'English' : 'French'}`);
      broadcastRoom(meta.roomCode);
    }
  });

  // ── CHANGE GAME MODE ─────────────────────────────────────────────────────────
  socket.on('set-game-mode', (mode: 'competitive' | 'coop') => {
    const meta = socketToRoom.get(socket.id);
    if (!meta) return;
    if (mode !== 'competitive' && mode !== 'coop') return;
    const room = setGameMode(meta.roomCode, meta.playerId, mode);
    if (room) broadcastRoom(meta.roomCode);
  });

  // ── START GAME ───────────────────────────────────────────────────────────────
  socket.on('start-game', async (cb?: (res: { error?: string }) => void) => {
    const meta = socketToRoom.get(socket.id);
    if (!meta) return cb?.({ error: 'Not in a room' });

    const room = getRoom(meta.roomCode);
    if (!room) return cb?.({ error: 'Room not found' });
    if (room.leaderId !== meta.playerId) return cb?.({ error: 'Not the leader' });
    if (room.game.status === 'playing') return cb?.({ error: 'Game already running' });

    const notReady = Array.from(room.players.values()).find((p) => !p.isReady);
    if (notReady) return cb?.({ error: `${notReady.name} is not ready` });

    try {
      io.to(meta.roomCode).emit('game-loading', true);
      const article = await fetchRandomArticle(room.language);
      const tokens = tokenizeText(article.extract);
      const updatedRoom = startGame(meta.roomCode, tokens, article.title);
      if (!updatedRoom) return cb?.({ error: 'Failed to start game' });
      io.to(meta.roomCode).emit('game-loading', false);
      systemMessage(meta.roomCode, 'Game started! Find the secret word!');
      io.to(meta.roomCode).emit('game-started', serializeRoom(updatedRoom));
      cb?.({});
    } catch {
      io.to(meta.roomCode).emit('game-loading', false);
      cb?.({ error: 'Failed to fetch article. Try again.' });
    }
  });

  // ── NEW GAME ─────────────────────────────────────────────────────────────────
  socket.on('new-game', (cb?: (res: { error?: string }) => void) => {
    const meta = socketToRoom.get(socket.id);
    if (!meta) return cb?.({ error: 'Not in a room' });

    const room = getRoom(meta.roomCode);
    if (!room) return cb?.({ error: 'Room not found' });
    if (room.leaderId !== meta.playerId) return cb?.({ error: 'Not the leader' });

    for (const player of room.players.values()) {
      if (!player.isLeader) player.isReady = false;
    }
    room.game.status = 'waiting';
    broadcastRoom(meta.roomCode);
    systemMessage(meta.roomCode, 'Starting a new round. Get ready!');
    cb?.({});
  });

  // ── QUICK RESTART ─────────────────────────────────────────────────────────────
  socket.on('quick-restart', async (cb?: (res: { error?: string }) => void) => {
    const meta = socketToRoom.get(socket.id);
    if (!meta) return cb?.({ error: 'Not in a room' });

    const room = getRoom(meta.roomCode);
    if (!room) return cb?.({ error: 'Room not found' });
    if (room.leaderId !== meta.playerId) return cb?.({ error: 'Not the leader' });

    try {
      io.to(meta.roomCode).emit('game-loading', true);
      const article = await fetchRandomArticle(room.language);
      const tokens = tokenizeText(article.extract);
      const updatedRoom = startGame(meta.roomCode, tokens, article.title);
      if (!updatedRoom) return cb?.({ error: 'Failed to start game' });
      io.to(meta.roomCode).emit('game-loading', false);
      systemMessage(meta.roomCode, '⚡ New round started!');
      io.to(meta.roomCode).emit('game-started', serializeRoom(updatedRoom));
      cb?.({});
    } catch {
      io.to(meta.roomCode).emit('game-loading', false);
      cb?.({ error: 'Failed to fetch article. Try again.' });
    }
  });

  // ── LEAVE ROOM ─────────────────────────────────────────────────────────────────
  socket.on('leave-room', () => {
    const meta = socketToRoom.get(socket.id);
    if (!meta) return;
    socketToRoom.delete(socket.id);
    socket.leave(meta.roomCode);

    const room = getRoom(meta.roomCode);
    if (!room) return;
    const playerName = room.players.get(meta.playerId)?.name ?? 'Someone';
    const updatedRoom = removePlayer(meta.roomCode, meta.playerId);
    if (updatedRoom) {
      systemMessage(meta.roomCode, `${playerName} left the room`);
      broadcastRoom(meta.roomCode);
    }
  });

  // ── REVEAL ALL WORDS (leader, reveals entire article for everyone) ──────────
  socket.on('reveal-all-words', (cb?: (res: { error?: string }) => void) => {
    const meta = socketToRoom.get(socket.id);
    if (!meta) return cb?.({ error: 'Not in a room' });

    const room = getRoom(meta.roomCode);
    if (!room) return cb?.({ error: 'Room not found' });
    if (room.leaderId !== meta.playerId) return cb?.({ error: 'Not the leader' });
    if (room.game.status !== 'playing') return cb?.({ error: 'Game not running' });

    // Add every article word to revealedWords
    for (const t of room.game.tokens) {
      if (t.type === 'word' && t.normalized) {
        room.game.revealedWords.add(t.normalized);
      }
    }

    systemMessage(meta.roomCode, `💡 Leader revealed the entire article!`);
    broadcastRoom(meta.roomCode);
    cb?.({});
  });

  // ── SUBMIT WORD ──────────────────────────────────────────────────────────────
  socket.on('submit-word', async (
    word: string,
    cb?: (res: { result: string; normalized?: string }) => void
  ) => {
    const meta = socketToRoom.get(socket.id);
    if (!meta || !word || typeof word !== 'string') return;

    const room = getRoom(meta.roomCode);
    if (!room) return;
    const player = room.players.get(meta.playerId);
    if (!player) return;

    const result = submitWord(meta.roomCode, meta.playerId, word.trim());

    switch (result.result) {
      case 'win': {
        io.to(meta.roomCode).emit('word-revealed', {
          normalized: result.normalized,
          revealedBy: meta.playerId,
          revealedByName: player.name,
          isWin: true,
          articleTitle: result.articleTitle,
          totalRevealed: room.game.revealedWords.size,
        });
        io.to(meta.roomCode).emit('player-won', {
          playerId: meta.playerId,
          playerName: player.name,
          winTime: player.score.winTime ?? 0,
          wordsSubmitted: player.score.wordsSubmitted,
          wordsRevealedFirst: player.score.wordsRevealedFirst,
          rank: result.rank,
        });
        const medals = ['🥇', '🥈', '🥉'];
        const medal = result.rank <= 3 ? medals[result.rank - 1] : `#${result.rank}`;
        systemMessage(meta.roomCode, `${medal} ${player.name} found the word! (${player.score.wordsSubmitted} attempts)`);
        broadcastRoom(meta.roomCode);
        break;
      }
      case 'revealed': {
        if (room.gameMode === 'competitive') {
          // Only the guesser gets the event — others see the change via broadcastRoom
          socket.emit('word-revealed', {
            normalized: result.normalized,
            revealedBy: meta.playerId,
            revealedByName: player.name,
            isWin: false,
            totalRevealed: 0,
          });
        } else {
          io.to(meta.roomCode).emit('word-revealed', {
            normalized: result.normalized,
            revealedBy: meta.playerId,
            revealedByName: player.name,
            isWin: false,
            totalRevealed: room.game.revealedWords.size,
          });
        }
        broadcastRoom(meta.roomCode);
        break;
      }
      case 'not-found': {
        socket.emit('word-feedback', { result: 'not-found', word: word.trim() });
        broadcastRoom(meta.roomCode);
        // Async proximity query — doesn't block the response
        const articleWords = getArticleWordSet(meta.roomCode);
        getProximityMap(result.normalized, room.language, articleWords).then((map) => {
          if (Object.keys(map).length > 0) {
            socket.emit('proximity-update', { map });
          }
        });
        break;
      }
      case 'too-common': {
        socket.emit('word-feedback', { result: 'too-common', word: word.trim() });
        broadcastRoom(meta.roomCode);
        break;
      }
      case 'already-known': {
        socket.emit('word-feedback', { result: 'already-known', word: word.trim() });
        break;
      }
      default:
        break;
    }

    cb?.({ result: result.result, normalized: 'normalized' in result ? result.normalized : undefined });
  });

  // ── CHAT MESSAGE ─────────────────────────────────────────────────────────────
  socket.on('chat-message', (message: string) => {
    const meta = socketToRoom.get(socket.id);
    if (!meta || !message || typeof message !== 'string') return;
    const trimmed = message.trim().slice(0, 300);
    if (!trimmed) return;

    const room = getRoom(meta.roomCode);
    if (!room) return;
    const player = room.players.get(meta.playerId);
    if (!player) return;

    const msg = addChatMessage(meta.roomCode, {
      playerId: meta.playerId, playerName: player.name,
      message: trimmed, timestamp: Date.now(), type: 'chat',
    });
    if (msg) io.to(meta.roomCode).emit('chat-message', msg);
  });

  // ── EMOJI ─────────────────────────────────────────────────────────────────────
  socket.on('send-emoji', (emoji: string) => {
    const meta = socketToRoom.get(socket.id);
    if (!meta || !emoji || typeof emoji !== 'string') return;

    const room = getRoom(meta.roomCode);
    if (!room) return;
    const player = room.players.get(meta.playerId);
    if (!player) return;

    io.to(meta.roomCode).emit('emoji-broadcast', {
      playerName: player.name,
      emoji: emoji.slice(0, 10),
      x: Math.floor(Math.random() * 80) + 10,
    });
  });

  // ── DISCONNECT ────────────────────────────────────────────────────────────────
  socket.on('disconnect', () => {
    const meta = socketToRoom.get(socket.id);
    if (!meta) return;
    socketToRoom.delete(socket.id);

    const room = getRoom(meta.roomCode);
    if (!room) return;
    const playerName = room.players.get(meta.playerId)?.name ?? 'Someone';
    const isInGame = room.game.status === 'playing' || room.game.status === 'finished';

    if (isInGame) {
      // Grace period — don't remove immediately
      const token = startDisconnectGrace(meta.playerId, () => {
        // Grace expired → actually remove
        const updatedRoom = removePlayer(meta.roomCode, meta.playerId);
        if (updatedRoom) {
          systemMessage(meta.roomCode, `${playerName} left the game`);
          broadcastRoom(meta.roomCode);
        }
      });
      if (token) {
        systemMessage(meta.roomCode, `${playerName} disconnected (2 min grace)`);
        broadcastRoom(meta.roomCode);
        return;
      }
    }

    // Not in a game — remove immediately
    const updatedRoom = removePlayer(meta.roomCode, meta.playerId);
    if (updatedRoom) {
      systemMessage(meta.roomCode, `${playerName} left the room`);
      broadcastRoom(meta.roomCode);
    }
  });
});

// ---- HTTP ----
app.get('/health', (_req, res) => res.json({ ok: true }));

const PORT = process.env.PORT ?? 3850;
httpServer.listen(PORT, () => {
  console.log(`Pedantix Competitive server on port ${PORT}`);
});
