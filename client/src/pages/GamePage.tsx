import { useRef, useState, useEffect } from 'react';
import { socket } from '../socket';
import { ClientRoom, ChatMessage, WordEntry, ProximityMap } from '../types';
import ArticleDisplay from '../components/ArticleDisplay';
import Chat from '../components/Chat';
import Scoreboard from '../components/Scoreboard';
import WordInput from '../components/WordInput';
import Timer from '../components/Timer';
import EmojiPanel from '../components/EmojiPanel';
import WordList from '../components/WordList';
import { useI18n } from '../App';

type MobileTab = 'article' | 'words' | 'chat';

interface Props {
  room: ClientRoom;
  playerId: string;
  messages: ChatMessage[];
  wordList: WordEntry[];
  isLoading: boolean;
  proximityMap: ProximityMap;
  proximityWordMap: Record<string, string>;
  soundMuted: boolean;
  onToggleSound: () => void;
  onWordSubmit: (word: string, status: WordEntry['status']) => void;
  onLeave: () => void;
}

function useWindowWidth() {
  const [w, setW] = useState(typeof window !== 'undefined' ? window.innerWidth : 1024);
  useEffect(() => {
    const h = () => setW(window.innerWidth);
    window.addEventListener('resize', h);
    return () => window.removeEventListener('resize', h);
  }, []);
  return w;
}

export default function GamePage({
  room, playerId, messages, wordList, isLoading, proximityMap, proximityWordMap,
  soundMuted, onToggleSound, onWordSubmit, onLeave,
}: Props) {
  const { uiLang, setUILang, t } = useI18n();
  const inputRef = useRef<HTMLInputElement>(null);
  const [activeTab, setActiveTab] = useState<MobileTab>('article');
  const width = useWindowWidth();

  const isMobile = width < 820;
  const isLaptop = width >= 1024;

  const isLeader = room.leaderId === playerId;
  const me = room.players.find((p) => p.id === playerId);
  const gameFinished = room.game.status === 'finished';

  const totalGuesses = room.players.reduce((s, p) => s + p.score.wordsSubmitted, 0);
  const totalRevealed = room.game.revealedWords.length;

  const focusInput = () => inputRef.current?.focus();

  const [revealOpen, setRevealOpen] = useState(false);
  const [revealInput, setRevealInput] = useState('');
  const [revealError, setRevealError] = useState('');

  const handleNewGame = () => socket.emit('new-game', (r: { error?: string }) => { if (r?.error) alert(r.error); });
  const handleQuickRestart = () => socket.emit('quick-restart', (r: { error?: string }) => { if (r?.error) alert(r.error); });
  const handleLeave = () => { if (confirm('Leave the room?')) onLeave(); };

  const handleReveal = (e: React.FormEvent) => {
    e.preventDefault();
    const word = revealInput.trim();
    if (!word) return;
    socket.emit('reveal-word', word, (res: { error?: string }) => {
      if (res?.error) {
        setRevealError(res.error);
        setTimeout(() => setRevealError(''), 2500);
      } else {
        setRevealOpen(false);
        setRevealInput('');
        setRevealError('');
      }
    });
  };

  // Auto-switch to article tab on game start
  useEffect(() => { setActiveTab('article'); }, [room.game.status]);

  const TABS: { id: MobileTab; icon: string; label: string }[] = [
    { id: 'article', icon: '📖', label: t('article') },
    { id: 'words',   icon: '📝', label: t('wordList') },
    { id: 'chat',    icon: '💬', label: t('chat') },
  ];

  return (
    <div className="flex flex-col overflow-hidden" style={{ height: '100dvh' }}>

      {/* ─── Top bar ─────────────────────────────────────────── */}
      <header className="flex-shrink-0 bg-slate-900 border-b border-slate-700/50 px-3 py-2
                         flex items-center gap-2 safe-top min-h-[52px]">
        {/* Room code */}
        <div className="flex items-center gap-1 flex-shrink-0">
          <span className="text-slate-500 text-xs hidden xs:inline">{t('room')}</span>
          <span className="font-mono font-bold text-indigo-400 text-base">{room.code}</span>
        </div>

        <div className="h-4 w-px bg-slate-700 mx-1 hidden xs:block" />

        {/* Timer */}
        <Timer startTime={room.game.startTime} running={room.game.status === 'playing'} />

        <div className="h-4 w-px bg-slate-700 mx-1 hidden tablet:block" />

        {/* Global stats */}
        <div className="hidden tablet:flex items-center gap-3 text-xs">
          <span>
            <span className="text-white font-semibold">{totalGuesses}</span>
            <span className="text-slate-500 ml-1">{t('guesses')}</span>
          </span>
          <span>
            <span className="text-emerald-400 font-semibold">{totalRevealed}</span>
            <span className="text-slate-500 ml-1">{t('revealed')}</span>
          </span>
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Right controls */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {/* Language badge */}
          <span className="text-xs bg-slate-800 border border-slate-700 px-2 py-1 rounded-full
                           text-slate-400 hidden xs:inline-flex">
            {room.language === 'en' ? '🇬🇧' : '🇫🇷'}
          </span>

          {/* UI lang pill */}
          <div className="lang-pill hidden tablet:flex">
            <button className={uiLang === 'en' ? 'active' : 'inactive'} onClick={() => setUILang('en')}>EN</button>
            <button className={uiLang === 'fr' ? 'active' : 'inactive'} onClick={() => setUILang('fr')}>FR</button>
          </div>

          {/* Sound toggle */}
          <button onClick={onToggleSound} className="btn-ghost text-base px-1.5 py-1" title={soundMuted ? 'Unmute' : 'Mute'}>
            {soundMuted ? '🔇' : '🔊'}
          </button>

          {/* Reveal word — leader, game in progress */}
          {isLeader && !gameFinished && !isLoading && (
            revealOpen ? (
              <form onSubmit={handleReveal} className="flex items-center gap-1">
                <div className="flex flex-col items-start">
                  <input
                    autoFocus
                    value={revealInput}
                    onChange={(e) => { setRevealInput(e.target.value); setRevealError(''); }}
                    placeholder={t('revealWordPlaceholder')}
                    className="bg-slate-800 border border-amber-500/60 text-white text-xs rounded px-2 py-1 w-32
                               focus:outline-none focus:border-amber-400 placeholder-slate-500"
                  />
                  {revealError && (
                    <span className="text-red-400 text-[10px] mt-0.5 absolute translate-y-6">{revealError}</span>
                  )}
                </div>
                <button type="submit" className="btn-secondary text-xs py-1 px-2 border-amber-500/60 hover:border-amber-400"
                        title={t('revealWordConfirm')}>
                  💡
                </button>
                <button type="button" onClick={() => { setRevealOpen(false); setRevealInput(''); setRevealError(''); }}
                        className="btn-ghost text-xs py-1 px-1 text-slate-400" title={t('revealWordCancel')}>
                  ✕
                </button>
              </form>
            ) : (
              <button onClick={() => setRevealOpen(true)}
                      className="btn-secondary text-xs py-1.5 px-2.5 border-amber-500/40 hover:border-amber-400 text-amber-300"
                      title={t('revealWord')}>
                {t('revealWordHint')}
              </button>
            )
          )}

          {/* Quick restart — leader, any time */}
          {isLeader && !isLoading && (
            <button onClick={handleQuickRestart} className="btn-secondary text-xs py-1.5 px-2.5" title={t('quickRestart')}>
              ⚡ {t('quickRestart')}
            </button>
          )}

          {/* New game (waiting room flow) — leader, only after finish */}
          {gameFinished && isLeader && (
            <button onClick={handleNewGame} className="btn-primary text-xs py-1.5 px-2.5">
              {t('newGame')}
            </button>
          )}

          {/* Leave */}
          <button onClick={handleLeave} className="btn-ghost text-xs py-1.5 px-2 text-slate-500 hover:text-red-400" title={t('leaveGame')}>
            🚪
          </button>
        </div>
      </header>

      {/* ─── Win banner ──────────────────────────────────────── */}
      {gameFinished && room.game.articleTitle && (
        <div className="flex-shrink-0 bg-gradient-to-r from-amber-900/70 via-amber-800/50 to-amber-900/70
                        border-b border-amber-600/40 px-4 py-2.5 text-center win-banner">
          <span className="text-amber-200 font-bold text-sm">
            {t('theAnswerWas')}{' '}
            <span className="text-yellow-300 text-lg font-bold uppercase tracking-wide">
              {room.game.articleTitle}
            </span>
          </span>
          {isLeader && (
            <span className="text-amber-400/70 text-xs ml-3 hidden xs:inline">
              {t('canStartNewGame')}
            </span>
          )}
        </div>
      )}

      {/* ─── Main layout ─────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden min-h-0">

        {/* Left sidebar: word list (laptop+ only) */}
        {isLaptop && (
          <aside className="w-52 flex-shrink-0 flex flex-col border-r border-slate-700/50 overflow-hidden">
            <WordList entries={wordList} />
          </aside>
        )}

        {/* Article panel */}
        <main
          className={`overflow-y-auto p-4 tablet:p-5 min-w-0
            ${isMobile ? (activeTab === 'article' ? 'flex-1' : 'hidden') : 'flex-1'}`}
        >
          {/* Mobile scoreboard shown above article */}
          {isMobile && activeTab === 'article' && (
            <div className="mb-3">
              <Scoreboard players={room.players} playerId={playerId}
                startTime={room.game.startTime} gameStatus={room.game.status} compact />
            </div>
          )}
          <ArticleDisplay
            tokens={room.game.tokens}
            revealedWords={room.game.revealedWords}
            articleTitle={room.game.articleTitle}
            titleWordLengths={room.game.titleWordLengths}
            proximityMap={proximityMap}
            proximityWordMap={proximityWordMap}
            onHiddenWordClick={focusInput}
          />
        </main>

        {/* Mobile word list panel */}
        {isMobile && activeTab === 'words' && (
          <div className="flex-1 overflow-y-auto">
            <WordList entries={wordList} expanded />
          </div>
        )}

        {/* Mobile chat panel */}
        {isMobile && activeTab === 'chat' && (
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="flex-shrink-0 border-b border-slate-700/50 p-2">
              <Scoreboard players={room.players} playerId={playerId}
                startTime={room.game.startTime} gameStatus={room.game.status} compact />
            </div>
            <div className="flex-1 flex flex-col overflow-hidden">
              <Chat messages={messages} playerId={playerId} />
            </div>
          </div>
        )}

        {/* Right sidebar (tablet+) */}
        {!isMobile && (
          <aside className="w-72 laptop:w-80 flex-shrink-0 flex flex-col border-l border-slate-700/50 overflow-hidden">
            {/* Scoreboard */}
            <div className="flex-shrink-0 border-b border-slate-700/50 overflow-y-auto" style={{ maxHeight: '40%' }}>
              <Scoreboard players={room.players} playerId={playerId}
                startTime={room.game.startTime} gameStatus={room.game.status} />
            </div>
            {/* Word list (tablet only — hidden on laptop since it's in the left sidebar) */}
            {!isLaptop && (
              <div className="flex-shrink-0 border-b border-slate-700/50 overflow-y-auto" style={{ maxHeight: '25%' }}>
                <WordList entries={wordList} />
              </div>
            )}
            {/* Chat */}
            <div className="flex-1 flex flex-col overflow-hidden">
              <Chat messages={messages} playerId={playerId} />
            </div>
          </aside>
        )}
      </div>

      {/* ─── Footer: word input ──────────────────────────────── */}
      <footer className={`flex-shrink-0 bg-slate-900 border-t border-slate-700/50 px-3 py-2
                          ${!isMobile ? 'safe-bottom' : ''}`}>
        <div className="flex items-center gap-2 max-w-screen-lg mx-auto">
          <WordInput
            ref={inputRef}
            disabled={gameFinished || isLoading}
            myScore={me?.score}
            wordList={wordList}
            onSubmit={onWordSubmit}
          />
          <EmojiPanel />
        </div>
      </footer>

      {/* ─── Mobile tab bar ──────────────────────────────────── */}
      {isMobile && (
        <nav className="mobile-tab-bar flex-shrink-0 flex border-t border-slate-700/50 bg-slate-900">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex flex-col items-center justify-center text-xs font-medium transition-colors
                ${activeTab === tab.id
                  ? 'text-indigo-400 border-t-2 border-indigo-500 -mt-px'
                  : 'text-slate-500 hover:text-slate-300'}`}
            >
              <span className="text-lg leading-none">{tab.icon}</span>
              <span className="mt-0.5">{tab.label}</span>
            </button>
          ))}
        </nav>
      )}
    </div>
  );
}
