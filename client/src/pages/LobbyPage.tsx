import { useState, FormEvent } from 'react';
import { socket } from '../socket';
import { ClientRoom } from '../types';
import { useI18n } from '../App';

interface Props {
  onJoined: (roomCode: string, playerId: string, sessionToken: string, room: ClientRoom) => void;
}

export default function LobbyPage({ onJoined }: Props) {
  const { uiLang, setUILang, t } = useI18n();
  const [mode, setMode] = useState<'home' | 'create' | 'join'>('home');
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleCreate = (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return setError('Enter your name');
    setLoading(true); setError('');
    socket.emit(
      'create-room',
      name.trim(),
      (res: { roomCode: string; playerId: string; sessionToken: string; room: ClientRoom } | { error: string }) => {
        setLoading(false);
        if ('error' in res) return setError(res.error);
        onJoined(res.roomCode, res.playerId, res.sessionToken, res.room);
      }
    );
  };

  const handleJoin = (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return setError('Enter your name');
    if (code.trim().length !== 4) return setError('Enter a valid 4-letter code');
    setLoading(true); setError('');
    socket.emit(
      'join-room',
      { roomCode: code.trim().toUpperCase(), playerName: name.trim() },
      (res: { success: true; playerId: string; sessionToken: string; room: ClientRoom } | { success: false; error: string }) => {
        setLoading(false);
        if (!res.success) return setError(res.error);
        onJoined(code.trim().toUpperCase(), res.playerId, res.sessionToken, res.room);
      }
    );
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md">

        {/* Top bar: language pill */}
        <div className="flex justify-end mb-6">
          <div className="lang-pill">
            <button
              className={uiLang === 'en' ? 'active' : 'inactive'}
              onClick={() => setUILang('en')}
            >EN</button>
            <button
              className={uiLang === 'fr' ? 'active' : 'inactive'}
              onClick={() => setUILang('fr')}
            >FR</button>
          </div>
        </div>

        {/* Logo */}
        <div className="text-center mb-8">
          <h1 className="text-5xl font-bold text-white tracking-tight">
            Pedantix
            <span className="text-indigo-400 ml-2 text-3xl font-light">{t('subtitle')}</span>
          </h1>
          <p className="text-slate-500 text-sm mt-2">{t('tagline')}</p>
        </div>

        <div className="card p-6">
          {mode === 'home' && (
            <div className="space-y-3">
              <button className="btn-primary w-full text-base py-3" onClick={() => setMode('create')}>
                {t('createRoom')}
              </button>
              <button className="btn-secondary w-full text-base py-3" onClick={() => setMode('join')}>
                {t('joinRoom')}
              </button>
            </div>
          )}

          {mode === 'create' && (
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <button type="button" className="btn-ghost text-lg px-2 py-1"
                  onClick={() => { setMode('home'); setError(''); }}>
                  {t('back')}
                </button>
                <h2 className="text-lg font-semibold">{t('createRoom')}</h2>
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">{t('yourName')}</label>
                <input className="input-base w-full" placeholder={t('namePlaceholder')}
                  value={name} onChange={(e) => setName(e.target.value)} maxLength={20} autoFocus />
              </div>
              {error && <p className="text-red-400 text-sm">{error}</p>}
              <button type="submit" className="btn-primary w-full" disabled={loading}>
                {loading ? t('creating') : t('createBtn')}
              </button>
            </form>
          )}

          {mode === 'join' && (
            <form onSubmit={handleJoin} className="space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <button type="button" className="btn-ghost text-lg px-2 py-1"
                  onClick={() => { setMode('home'); setError(''); }}>
                  {t('back')}
                </button>
                <h2 className="text-lg font-semibold">{t('joinRoom')}</h2>
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">{t('yourName')}</label>
                <input className="input-base w-full" placeholder={t('namePlaceholder')}
                  value={name} onChange={(e) => setName(e.target.value)} maxLength={20} autoFocus />
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">{t('roomCode')}</label>
                <input
                  className="input-base w-full font-mono text-2xl tracking-[.4em] uppercase text-center"
                  placeholder={t('roomCodePlaceholder')}
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 4))}
                  maxLength={4}
                />
              </div>
              {error && <p className="text-red-400 text-sm">{error}</p>}
              <button type="submit" className="btn-primary w-full" disabled={loading}>
                {loading ? t('joining') : t('joinBtn')}
              </button>
            </form>
          )}
        </div>

        {/* How to play */}
        <div className="mt-5 card p-4 text-sm space-y-1.5">
          <p className="text-slate-300 font-semibold mb-2">{t('howToPlay')}</p>
          <p className="text-slate-400">{t('howTo1')}</p>
          <p className="text-slate-400">{t('howTo2')}</p>
          <p className="text-slate-400">{t('howTo3')}</p>
        </div>
      </div>
    </div>
  );
}
