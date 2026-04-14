import { useState, useEffect } from 'react';

interface Props {
  startTime?: number;
  running: boolean;
}

function format(ms: number): string {
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
  return `${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
}

export default function Timer({ startTime, running }: Props) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!startTime) return;
    const tick = () => setElapsed(Date.now() - startTime);
    tick();
    if (!running) return;
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [startTime, running]);

  if (!startTime) return null;

  return (
    <div className="flex items-center gap-1 text-xs flex-shrink-0">
      <span className="text-slate-500">⏱</span>
      <span className="font-mono font-semibold text-slate-200">{format(elapsed)}</span>
    </div>
  );
}
