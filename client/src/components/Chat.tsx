import { useState, useRef, useEffect, FormEvent } from 'react';
import { socket } from '../socket';
import { ChatMessage } from '../types';
import { useT } from '../App';

interface Props {
  messages: ChatMessage[];
  playerId: string;
}

function fmt(ts: number) {
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function Chat({ messages, playerId }: Props) {
  const t = useT();
  const [input, setInput] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);

  useEffect(() => {
    if (autoScroll) bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, autoScroll]);

  const handleScroll = () => {
    if (!listRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = listRef.current;
    setAutoScroll(scrollHeight - scrollTop - clientHeight < 60);
  };

  const send = (e: FormEvent) => {
    e.preventDefault();
    const m = input.trim();
    if (!m) return;
    socket.emit('chat-message', m);
    setInput('');
  };

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Header */}
      <div className="px-3 py-2 border-b border-slate-700/50 flex-shrink-0">
        <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-widest">{t('chat')}</h2>
      </div>

      {/* Messages */}
      <div
        ref={listRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-3 py-2 space-y-0.5 min-h-0"
      >
        {messages.length === 0 && (
          <p className="text-slate-600 text-xs text-center mt-4">{t('noMessages')}</p>
        )}
        {messages.map((msg) => (
          <div key={msg.id} className="text-xs leading-relaxed animate-fade-in">
            {msg.type === 'system' && (
              <p className="text-slate-600 italic py-0.5">— {msg.message}</p>
            )}
            {msg.type === 'win' && (
              <p className="text-amber-400 font-semibold py-0.5">🏆 {msg.message}</p>
            )}
            {msg.type === 'chat' && (
              <div className="flex gap-1.5 items-baseline">
                <span className="text-slate-600 flex-shrink-0">{fmt(msg.timestamp)}</span>
                <span className={`font-semibold flex-shrink-0 ${
                  msg.playerId === playerId ? 'text-indigo-400' : 'text-slate-300'
                }`}>
                  {msg.playerName}:
                </span>
                <span className="text-slate-200 break-words min-w-0">{msg.message}</span>
              </div>
            )}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <form onSubmit={send} className="flex-shrink-0 px-3 py-2 border-t border-slate-700/50 flex gap-2">
        <input
          className="input-base flex-1 text-xs py-1.5"
          placeholder={t('sendPlaceholder')}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          maxLength={300}
        />
        <button type="submit" className="btn-secondary text-xs px-2.5 py-1.5 flex-shrink-0">
          {t('send')}
        </button>
      </form>
    </div>
  );
}
