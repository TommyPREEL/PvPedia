import { forwardRef, useState, FormEvent } from 'react';
import { socket } from '../socket';
import { PlayerScore, WordEntry } from '../types';
import { useT } from '../App';

interface Props {
  disabled?: boolean;
  myScore?: PlayerScore;
  wordList: WordEntry[];
  onSubmit: (word: string, status: WordEntry['status']) => void;
}

const WordInput = forwardRef<HTMLInputElement, Props>(({ disabled, myScore, wordList, onSubmit }, ref) => {
  const t = useT();
  const [input, setInput] = useState('');
  const [shaking, setShaking] = useState(false);
  const [flash, setFlash] = useState<'ok' | 'err' | null>(null);

  const triggerShake = () => {
    setShaking(true);
    setTimeout(() => setShaking(false), 450);
  };
  const triggerFlash = (type: 'ok' | 'err') => {
    setFlash(type);
    setTimeout(() => setFlash(null), 600);
  };

  const handleSubmit = (e?: FormEvent) => {
    e?.preventDefault();
    const word = input.trim();
    if (!word || disabled) return;

    // Client-side duplicate check
    const alreadyGuessed = wordList.some((e) => e.word.toLowerCase() === word.toLowerCase());
    if (alreadyGuessed) {
      triggerShake();
      triggerFlash('err');
      setInput('');
      return;
    }

    socket.emit('submit-word', word, (res: { result: string }) => {
      if (res.result === 'win' || res.result === 'revealed') {
        triggerFlash('ok');
        onSubmit(word, 'found');
      } else if (res.result === 'not-found') {
        triggerShake();
        triggerFlash('err');
        onSubmit(word, 'miss');
      } else {
        triggerFlash('err');
      }
      setInput('');
    });
  };

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-2 flex-1">
      <div className="flex-1 relative">
        <input
          ref={ref}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value.replace(/\s/g, ''))}
          disabled={disabled}
          placeholder={disabled ? t('gameOver') : t('typeToReveal')}
          maxLength={60}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={false}
          style={shaking ? { animation: 'shake 0.4s ease-in-out' } : undefined}
          className={`input-base w-full text-base pr-20 transition-all duration-150
            ${flash === 'ok'  ? 'border-emerald-500 ring-2 ring-emerald-500/30 bg-emerald-950/20' : ''}
            ${flash === 'err' ? 'border-red-500 ring-2 ring-red-500/30 bg-red-950/20' : ''}
          `}
        />
        {/* Inline score counter */}
        {myScore && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5 text-xs pointer-events-none">
            <span className="text-slate-600" title="Total guesses">{myScore.wordsSubmitted}</span>
            <span className="text-emerald-600" title="Words revealed first">{myScore.wordsRevealedFirst}</span>
          </div>
        )}
      </div>
      <button type="submit" disabled={disabled || !input.trim()} className="btn-primary flex-shrink-0">
        {t('guess')}
      </button>
    </form>
  );
});

WordInput.displayName = 'WordInput';
export default WordInput;
