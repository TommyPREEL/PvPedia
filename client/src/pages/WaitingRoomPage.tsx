import { useState } from 'react';
import { socket } from '../socket';
import { ClientRoom, ChatMessage, Theme } from '../types';
import Chat from '../components/Chat';
import { useI18n } from '../App';

const ALL_THEMES: Theme[] = ['people', 'geography', 'science', 'history', 'arts', 'sports', 'nature', 'technology'];

interface Props {
  room: ClientRoom;
  playerId: string;
  messages: ChatMessage[];
  isLoading: boolean;
  soundMuted: boolean;
  onToggleSound: () => void;
}

export default function WaitingRoomPage({ room, playerId, messages, isLoading, soundMuted, onToggleSound }: Props) {
  const { uiLang, setUILang, t } = useI18n();
  const [startError, setStartError] = useState('');
  const isLeader = room.leaderId === playerId;
  const me = room.players.find((p) => p.id === playerId);
  const allReady = room.players.every((p) => p.isReady);

  return (
    <div className="min-h-screen flex items-center justify-center p-4 safe-top">
      <div className="w-full max-w-3xl">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl xs:text-3xl font-bold text-white">
              PvPedia <span className="text-indigo-400 font-light">{t('subtitle')}</span>
            </h1>
            <p className="text-slate-500 text-sm mt-0.5">{t('waitingFor')}</p>
          </div>
          <div className="flex items-center gap-2">
            {/* Sound toggle */}
            <button onClick={onToggleSound} className="btn-ghost text-xl px-2 py-1"
              title={soundMuted ? 'Unmute' : 'Mute'}>
              {soundMuted ? '🔇' : '🔊'}
            </button>
            {/* UI language pill */}
            <div className="lang-pill">
              <button className={uiLang === 'en' ? 'active' : 'inactive'} onClick={() => setUILang('en')}>EN</button>
              <button className={uiLang === 'fr' ? 'active' : 'inactive'} onClick={() => setUILang('fr')}>FR</button>
            </div>
            {/* Room code */}
            <div className="card px-3 py-1.5 text-center ml-1">
              <p className="text-xs text-slate-500 uppercase tracking-widest leading-none mb-0.5">{t('roomCode')}</p>
              <p className="font-mono font-bold text-indigo-400 text-xl tracking-widest leading-none">{room.code}</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 tablet:grid-cols-2 gap-4">
          {/* Players list */}
          <div className="card p-4">
            <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">
              {t('players')} ({room.players.length})
            </h2>
            <ul className="space-y-1.5">
              {room.players.map((player) => (
                <li key={player.id} className={`flex items-center gap-3 p-2.5 rounded-lg
                  ${player.id === playerId ? 'bg-indigo-900/30 border border-indigo-700/40' : 'bg-slate-800/50'}`}>
                  <span className={`w-2 h-2 rounded-full flex-shrink-0 ${player.isReady ? 'bg-emerald-400' : 'bg-slate-600'}`} />
                  <span className="flex-1 font-medium text-slate-100 truncate">{player.name}</span>
                  {player.isLeader && (
                    <span className="text-xs bg-amber-900/50 text-amber-300 px-2 py-0.5 rounded-full border border-amber-700/40">
                      {t('leader')}
                    </span>
                  )}
                  {!player.isLeader && (
                    <span className={`text-xs px-2 py-0.5 rounded-full border flex-shrink-0
                      ${player.isReady
                        ? 'bg-emerald-900/40 text-emerald-300 border-emerald-700/40'
                        : 'bg-slate-800 text-slate-500 border-slate-700'}`}>
                      {player.isReady ? t('ready') : t('notReady')}
                    </span>
                  )}
                </li>
              ))}
            </ul>

            {/* Controls */}
            <div className="mt-4 space-y-3">
              {!isLeader && me && (
                <>
                  {room.themes.length > 0 && (
                    <div>
                      <p className="text-xs text-slate-500 mb-1.5">{t('themes')}</p>
                      <div className="flex flex-wrap gap-1.5">
                        {ALL_THEMES.map((theme) => (
                          <span
                            key={theme}
                            className={`text-xs px-2.5 py-1 rounded-full border ${
                              room.themes.includes(theme)
                                ? 'bg-indigo-900/50 text-indigo-300 border-indigo-600/50'
                                : 'bg-slate-800 text-slate-600 border-slate-700 opacity-40 line-through'
                            }`}
                          >
                            {t(`theme_${theme}` as Parameters<typeof t>[0])}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  <button onClick={() => socket.emit('player-ready', !me.isReady)}
                    className={me.isReady ? 'btn-secondary w-full' : 'btn-success w-full'}>
                    {me.isReady ? t('cancelReady') : t('ready')}
                  </button>
                </>
              )}
              {isLeader && (
                <div className="space-y-3">
                  <div>
                    <p className="text-xs text-slate-500 mb-2">{t('language')}</p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => socket.emit('change-language', 'en')}
                        className={`flex-1 btn text-sm py-1.5 ${room.language === 'en' ? 'btn-primary' : 'btn-secondary'}`}>
                        {t('english')}
                      </button>
                      <button
                        onClick={() => socket.emit('change-language', 'fr')}
                        className={`flex-1 btn text-sm py-1.5 ${room.language === 'fr' ? 'btn-primary' : 'btn-secondary'}`}>
                        {t('french')}
                      </button>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 mb-2">{t('gameMode')}</p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => socket.emit('set-game-mode', 'competitive')}
                        className={`flex-1 btn text-sm py-1.5 ${room.gameMode === 'competitive' ? 'btn-primary' : 'btn-secondary'}`}
                        title={t('compModeDesc')}>
                        {t('competitiveMode')}
                      </button>
                      <button
                        onClick={() => socket.emit('set-game-mode', 'coop')}
                        className={`flex-1 btn text-sm py-1.5 ${room.gameMode === 'coop' ? 'btn-primary' : 'btn-secondary'}`}
                        title={t('coopModeDesc')}>
                        {t('coopMode')}
                      </button>
                    </div>
                    <p className="text-xs text-slate-500 mt-1.5">
                      {room.gameMode === 'competitive' ? t('compModeDesc') : t('coopModeDesc')}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 mb-2">{t('difficulty')}</p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => socket.emit('set-difficulty', 'easy')}
                        className={`flex-1 btn text-sm py-1.5 ${room.difficulty === 'easy' ? 'btn-primary' : 'btn-secondary'}`}
                        title={t('easyModeDesc')}>
                        {t('easyMode')}
                      </button>
                      <button
                        onClick={() => socket.emit('set-difficulty', 'medium')}
                        className={`flex-1 btn text-sm py-1.5 ${room.difficulty === 'medium' ? 'btn-primary' : 'btn-secondary'}`}
                        title={t('mediumModeDesc')}>
                        {t('mediumMode')}
                      </button>
                      <button
                        onClick={() => socket.emit('set-difficulty', 'hard')}
                        className={`flex-1 btn text-sm py-1.5 ${room.difficulty === 'hard' ? 'btn-primary' : 'btn-secondary'}`}
                        title={t('hardModeDesc')}>
                        {t('hardMode')}
                      </button>
                    </div>
                    <p className="text-xs text-slate-500 mt-1.5">
                      {room.difficulty === 'easy' ? t('easyModeDesc') : room.difficulty === 'hard' ? t('hardModeDesc') : t('mediumModeDesc')}
                    </p>
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs text-slate-500">{t('themes')}</p>
                      <span className="text-xs text-slate-500">
                        {room.themes.length === 0
                          ? t('themesDesc')
                          : t('themesFiltered', { n: String(room.themes.length) })}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {ALL_THEMES.map((theme) => {
                        const active = room.themes.length === 0 || room.themes.includes(theme);
                        const toggle = () => {
                          let next: Theme[];
                          if (room.themes.length === 0) {
                            // All on → deselect this one
                            next = ALL_THEMES.filter((t) => t !== theme);
                          } else if (room.themes.includes(theme)) {
                            next = room.themes.filter((t) => t !== theme);
                            // If none left, reset to all
                            if (next.length === 0) next = [];
                          } else {
                            next = [...room.themes, theme];
                            if (next.length === ALL_THEMES.length) next = [];
                          }
                          socket.emit('set-themes', next);
                        };
                        return (
                          <button
                            key={theme}
                            onClick={toggle}
                            className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                              active
                                ? 'bg-indigo-900/50 text-indigo-300 border-indigo-600/50'
                                : 'bg-slate-800 text-slate-500 border-slate-700 line-through opacity-50'
                            }`}
                          >
                            {t(`theme_${theme}` as Parameters<typeof t>[0])}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <button
                    onClick={() => { setStartError(''); socket.emit('start-game', (r: { error?: string }) => { if (r?.error) setStartError(r.error); }); }}
                    disabled={!allReady || isLoading}
                    className="btn-primary w-full">
                    {isLoading ? t('loadingArticle') : allReady ? t('startGame') : t('waitingPlayers')}
                  </button>
                  {startError && <p className="text-red-400 text-sm">{startError}</p>}
                </div>
              )}
            </div>
          </div>

          {/* Chat */}
          <div className="card flex flex-col overflow-hidden" style={{ height: '380px' }}>
            <Chat messages={messages} playerId={playerId} />
          </div>
        </div>

        <p className="mt-4 text-center text-slate-600 text-xs">
          {t('shareCode')} <span className="font-mono font-bold text-slate-400">{room.code}</span> {t('withFriends')}
        </p>
      </div>
    </div>
  );
}
