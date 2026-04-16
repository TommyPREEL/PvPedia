import {
  useState, useEffect, useCallback, useRef, createContext, useContext,
} from 'react';
import { socket } from './socket';
import {
  ClientRoom, ChatMessage, WordRevealedPayload, PlayerWonPayload,
  EmojiPayload, FloatingEmoji, WordEntry, ProximityMap, ProximityWordEntry, StoredSession,
} from './types';
import { UILang, TFn, createT } from './i18n';
import { sounds } from './sounds';
import LobbyPage from './pages/LobbyPage';
import WaitingRoomPage from './pages/WaitingRoomPage';
import GamePage from './pages/GamePage';

// ---- i18n context ----
interface I18nCtx { uiLang: UILang; setUILang: (l: UILang) => void; t: TFn }
export const I18nContext = createContext<I18nCtx>({
  uiLang: 'fr', setUILang: () => {}, t: createT('fr'),
});
export const useT = () => useContext(I18nContext).t;
export const useI18n = () => useContext(I18nContext);

// ---- Session helpers ----
const SESSION_KEY = 'pvpedia_session';
function saveSession(d: StoredSession) { sessionStorage.setItem(SESSION_KEY, JSON.stringify(d)); }
function loadSession(): StoredSession | null {
  try { return JSON.parse(sessionStorage.getItem(SESSION_KEY) ?? 'null'); } catch { return null; }
}
function clearSession() { sessionStorage.removeItem(SESSION_KEY); }

// ---- Notification ----
interface Notif { id: string; message: string; type: 'info' | 'success' | 'error' }

type AppPage = 'lobby' | 'waiting' | 'game';

export default function App() {
  const [uiLang, setUILang] = useState<UILang>('fr');
  const t = createT(uiLang);

  const [page, setPage] = useState<AppPage>('lobby');
  const [room, setRoom] = useState<ClientRoom | null>(null);
  const [playerId, setPlayerId] = useState('');
  const playerIdRef = useRef(''); // always-current ref for event handlers
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [notifications, setNotifications] = useState<Notif[]>([]);
  const [floatingEmojis, setFloatingEmojis] = useState<FloatingEmoji[]>([]);
  const [wordList, setWordList] = useState<WordEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [proximityMap, setProximityMap] = useState<ProximityMap>({});
  const [proximityWordMap, setProximityWordMap] = useState<Record<string, ProximityWordEntry>>({});
  const [titleProximityScores, setTitleProximityScores] = useState<number[]>([]);
  const [titleProximityWords, setTitleProximityWords] = useState<(string | null)[]>([]);
  const [soundMuted, setSoundMuted] = useState(false);

  const notifId = useRef(0);

  const notify = useCallback((message: string, type: Notif['type'] = 'info') => {
    const id = String(notifId.current++);
    setNotifications((p) => [...p.slice(-4), { id, message, type }]);
    setTimeout(() => setNotifications((p) => p.filter((n) => n.id !== id)), 4000);
  }, []);

  // Track word list
  const trackWord = useCallback((word: string, status: WordEntry['status']) => {
    setWordList((prev) => {
      const lw = word.toLowerCase();
      const existing = prev.find((e) => e.word.toLowerCase() === lw);
      if (existing) {
        if (status === 'found' && existing.status !== 'found') {
          return prev.map((e) => e.word.toLowerCase() === lw ? { ...e, status: 'found' } : e);
        }
        return prev;
      }
      return [{ word, status, timestamp: Date.now() }, ...prev];
    });
  }, []);

  useEffect(() => {
    socket.connect();

    // Try reconnecting saved session
    const session = loadSession();
    if (session) {
      socket.emit(
        'reconnect-session',
        session.sessionToken,
        (res: { success: true; playerId: string; room: ClientRoom } | { success: false; error: string }) => {
          if (res.success) {
            setPlayerId(res.playerId);
            playerIdRef.current = res.playerId;
            setRoom(res.room);
            setPage(res.room.game.status === 'playing' || res.room.game.status === 'finished' ? 'game' : 'waiting');
            notify('Reconnected to room', 'success');
          } else {
            clearSession();
          }
        }
      );
    }

    socket.on('room-updated', (updatedRoom: ClientRoom) => {
      setRoom(updatedRoom);
      setPage((prev) => {
        if (updatedRoom.game.status === 'playing') return 'game';
        if (updatedRoom.game.status === 'waiting' && prev === 'game') {
          setWordList([]);
          setProximityMap({});
          setProximityWordMap({});
          setTitleProximityScores([]);
          setTitleProximityWords([]);
          return 'waiting';
        }
        return prev;
      });
    });

    socket.on('game-started', (updatedRoom: ClientRoom) => {
      setRoom(updatedRoom);
      setPage('game');
      setWordList([]);
      setProximityMap({});
      setProximityWordMap({});
      setTitleProximityScores([]);
      setTitleProximityWords([]);
      // Sync UI language to the room's game language
      setUILang(updatedRoom.language as UILang);
    });

    socket.on('game-loading', (loading: boolean) => setIsLoading(loading));

    socket.on('chat-message', (msg: ChatMessage) => {
      setMessages((p) => [...p.slice(-199), msg]);
    });

    socket.on('chat-history', (history: ChatMessage[]) => setMessages(history));

    socket.on('word-revealed', (payload: WordRevealedPayload) => {
      if (payload.isWin) {
        notify(`🎉 ${payload.revealedByName} found: "${payload.articleTitle}"!`, 'success');
        setProximityMap({});
        setTitleProximityScores([]);
        setTitleProximityWords([]);
        if (payload.revealedBy === playerIdRef.current) sounds.playWin();
      } else {
        // Leader hint reveal — add the word to everyone's word list
        trackWord(payload.normalized, 'found');
        if (payload.revealedBy === playerIdRef.current) {
          notify(`✅ "${payload.normalized}" revealed!`, 'info');
          sounds.playRevealed();
        } else {
          notify(`💡 "${payload.normalized}" revealed by ${payload.revealedByName}`, 'info');
          sounds.playOtherRevealed();
        }
      }
    });

    socket.on('player-won', (_p: PlayerWonPayload) => { /* handled by room-updated */ });

    socket.on('word-feedback', (payload: { result: string; word: string }) => {
      if (payload.result === 'not-found') {
        sounds.playNotFound();
      } else if (payload.result === 'already-known') {
        notify(t('alreadyGuessed', { word: payload.word }), 'info');
      }
    });

    socket.on('proximity-update', (payload: { map: ProximityMap; guessWord: string; titleProximityScores?: number[] }) => {
      const guessWord = payload.guessWord;
      setProximityMap((prev) => {
        const merged: ProximityMap = { ...prev };
        for (const [k, v] of Object.entries(payload.map)) {
          if ((merged[k] ?? 0) < v) merged[k] = v;
        }
        return merged;
      });
      if (guessWord) {
        let hasCloseMatch = false;
        setProximityWordMap((prev) => {
          const next = { ...prev };
          for (const [k, v] of Object.entries(payload.map)) {
            // Track any match >= 0.09 (server minimum) — low scores render as faint text via proximityTextColor
            if (v >= 0.09) {
              const existing = next[k];
              if (!existing || v > existing.score) {
                next[k] = { word: guessWord, score: v };
              }
            }
            // Word list 'close' marker only for meaningful proximity
            if (v > 0.25) hasCloseMatch = true;
          }
          return next;
        });
        // Retroactively mark this word as 'close' in the word list (only if it was a miss)
        if (hasCloseMatch) {
          setWordList((prev) =>
            prev.map((e) =>
              e.word.toLowerCase() === guessWord.toLowerCase() && e.status === 'miss'
                ? { ...e, status: 'close' }
                : e
            )
          );
        }
      }
      // Accumulate title word proximity scores + best-guess word per slot
      if (payload.titleProximityScores && payload.titleProximityScores.length > 0) {
        setTitleProximityScores((prev) => {
          const next = [...prev];
          payload.titleProximityScores!.forEach((score, i) => {
            if (score > (next[i] ?? 0)) next[i] = score;
          });
          return next;
        });
        if (guessWord) {
          setTitleProximityWords((prev) => {
            const next = [...prev];
            payload.titleProximityScores!.forEach((score, i) => {
              if (score > 0.09 && score > (titleProximityScores[i] ?? 0)) {
                next[i] = guessWord;
              }
            });
            return next;
          });
        }
      }
    });

    socket.on('emoji-broadcast', (payload: EmojiPayload) => {
      const id = String(Date.now()) + Math.random();
      const fe: FloatingEmoji = { id, emoji: payload.emoji, playerName: payload.playerName, x: payload.x };
      setFloatingEmojis((p) => [...p, fe]);
      setTimeout(() => setFloatingEmojis((p) => p.filter((e) => e.id !== id)), 3300);
    });

    return () => {
      ['room-updated','game-started','game-loading','chat-message','chat-history',
       'word-revealed','player-won','word-feedback','proximity-update','emoji-broadcast']
        .forEach((e) => socket.off(e));
      socket.disconnect();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleWordSubmit = useCallback((word: string, status: WordEntry['status']) => {
    trackWord(word, status);
    // Sounds are triggered by server events (word-revealed, word-feedback) to avoid
    // double-play; for 'found' the reveal event handles it.
  }, [trackWord]);

  const handleJoined = useCallback((
    rid: string, pid: string, st: string, r: ClientRoom
  ) => {
    setPlayerId(pid);
    playerIdRef.current = pid;
    setRoom(r);
    setPage('waiting');
    saveSession({ sessionToken: st, roomCode: rid, playerId: pid, playerName: r.players.find(p => p.id === pid)?.name ?? '' });
    notify(`Joined room ${rid}`, 'success');
  }, [notify]);

  const handleLeave = useCallback(() => {
    socket.emit('leave-room');
    clearSession();
    setRoom(null);
    setPlayerId('');
    playerIdRef.current = '';
    setMessages([]);
    setWordList([]);
    setProximityMap({});
    setProximityWordMap({});
    setTitleProximityScores([]);
    setTitleProximityWords([]);
    setPage('lobby');
  }, []);

  const toggleSound = () => setSoundMuted(sounds.toggle());

  return (
    <I18nContext.Provider value={{ uiLang, setUILang, t }}>
      <div className="relative min-h-screen">
        {page === 'lobby' && <LobbyPage onJoined={handleJoined} />}

        {page === 'waiting' && room && (
          <WaitingRoomPage
            room={room}
            playerId={playerId}
            messages={messages}
            isLoading={isLoading}
            soundMuted={soundMuted}
            onToggleSound={toggleSound}
          />
        )}

        {page === 'game' && room && (
          <GamePage
            room={room}
            playerId={playerId}
            messages={messages}
            wordList={wordList}
            isLoading={isLoading}
            proximityMap={proximityMap}
            proximityWordMap={proximityWordMap}
            titleProximityScores={titleProximityScores}
            titleProximityWords={titleProximityWords}
            soundMuted={soundMuted}
            onToggleSound={toggleSound}
            onWordSubmit={handleWordSubmit}
            onLeave={handleLeave}
          />
        )}

        {/* Floating emojis */}
        {floatingEmojis.map((fe) => (
          <div
            key={fe.id}
            className="floating-emoji"
            style={{ left: `${fe.x}%` }}
          >
            <span className="floating-emoji-icon">{fe.emoji}</span>
            <span className="floating-emoji-name">{fe.playerName}</span>
          </div>
        ))}

        {/* Notifications */}
        <div className="fixed top-4 right-4 flex flex-col gap-2 z-50 pointer-events-none max-w-xs">
          {notifications.map((n) => (
            <div key={n.id} className={`notification-enter px-4 py-3 rounded-lg text-sm font-medium shadow-xl border
              ${n.type === 'success' ? 'bg-emerald-900/90 border-emerald-600 text-emerald-100' : ''}
              ${n.type === 'error'   ? 'bg-red-900/90 border-red-600 text-red-100' : ''}
              ${n.type === 'info'    ? 'bg-slate-800/95 border-slate-600 text-slate-100' : ''}
            `}>{n.message}</div>
          ))}
        </div>

        {/* Loading overlay */}
        {isLoading && (
          <div className="fixed inset-0 bg-slate-950/80 flex items-center justify-center z-50 backdrop-blur-sm">
            <div className="card p-8 flex flex-col items-center gap-4">
              <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-slate-300 font-medium">{t('fetchingArticle')}</p>
            </div>
          </div>
        )}
      </div>
    </I18nContext.Provider>
  );
}
