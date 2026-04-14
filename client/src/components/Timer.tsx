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

function colorClass(ms: number): string {
  if (ms < 60_000) return 'text-emerald-400';
  if (ms < 180_000) return 'text-amber-400';
  return 'text-red-400';
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

  const color = colorClass(elapsed);

  return (
    <div className={`flex items-center gap-1.5 flex-shrink-0 ${color}`}>
      {running && <span className="timer-pulse-dot" />}
      <span className="font-mono font-bold text-base tabular-nums tracking-tight">
        {format(elapsed)}
      </span>
    </div>
  );
}
