import { useState, useRef, useEffect } from 'react';
import { socket } from '../socket';

const GROUPS = [
  { label: 'Reactions', list: ['😂','😮','😱','🤔','😅','🥳','🎉','🔥','💀','👏'] },
  { label: 'Game',      list: ['🏆','⚡','💡','✅','❌','🎯','💪','🤯','🧠','📖'] },
  { label: 'Animals',   list: ['🐢','🦊','🐱','🐶','🦁','🦄','🐸','🦋','🐧','🦉'] },
];

export default function EmojiPanel() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const send = (emoji: string) => { socket.emit('send-emoji', emoji); setOpen(false); };

  return (
    <div ref={ref} className="relative flex-shrink-0">
      <button
        className="btn-secondary text-lg px-2.5 py-2 leading-none"
        onClick={() => setOpen((v) => !v)}
        title="Send emoji"
      >
        😀
      </button>

      {open && (
        <div className="absolute bottom-full right-0 mb-2 w-72 card p-3 shadow-2xl animate-slide-in z-40">
          {GROUPS.map((g) => (
            <div key={g.label} className="mb-3 last:mb-0">
              <p className="text-xs text-slate-500 mb-1.5">{g.label}</p>
              <div className="flex flex-wrap gap-0.5">
                {g.list.map((e) => (
                  <button
                    key={e}
                    onClick={() => send(e)}
                    className="text-2xl hover:scale-125 transition-transform active:scale-110 p-1 rounded
                               hover:bg-slate-700/50"
                  >
                    {e}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
