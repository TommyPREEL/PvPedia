import { useState, useRef } from 'react';
import { ClientToken, ProximityMap } from '../types';
import { proximityColor } from '../sounds';

interface Props {
  tokens: ClientToken[];
  revealedWords: string[];
  articleTitle?: string;
  proximityMap: ProximityMap;
  proximityWordMap: Record<string, string>;
  onHiddenWordClick: () => void;
}

function normalizeForTitle(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z]/g, '');
}

interface HintState { text: string; tokenIndex: number }

export default function ArticleDisplay({
  tokens, revealedWords, articleTitle, proximityMap, proximityWordMap, onHiddenWordClick,
}: Props) {
  const revealedSet = new Set(revealedWords);
  const [hint, setHint] = useState<HintState | null>(null);
  const hintTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const titleNorms = articleTitle
    ? articleTitle.split(/\s+/).map(normalizeForTitle).filter(Boolean)
    : [];

  const showHint = (text: string, idx: number) => {
    if (hintTimer.current) clearTimeout(hintTimer.current);
    setHint({ text, tokenIndex: idx });
    hintTimer.current = setTimeout(() => setHint(null), 2000);
  };

  const handleHiddenClick = (e: React.MouseEvent, idx: number, length: number) => {
    e.stopPropagation();
    const label = length === 1 ? '1 letter' : `${length} letters`;
    showHint(label, idx);
    onHiddenWordClick();
  };

  if (!tokens || tokens.length === 0) {
    return (
      <div className="text-slate-500 text-center mt-16">
        <div className="text-5xl mb-4">📖</div>
        <p>Waiting for the article…</p>
      </div>
    );
  }

  const titleWords = articleTitle ? articleTitle.split(/\s+/).filter(Boolean) : [];

  return (
    <div className="article-text text-[0.95rem] leading-loose text-slate-200 select-text">
      {titleWords.length > 0 && (
        <div className="title-display">
          <p className="text-xs text-slate-500 uppercase tracking-widest mb-3 text-center">Find the article</p>
          <div className="flex flex-wrap justify-center gap-x-3 gap-y-2 items-center mb-8">
            {titleWords.map((word, wi) => {
              const norm = normalizeForTitle(word);
              const isRevealed = revealedSet.has(norm);
              return isRevealed ? (
                <span key={wi} className="title-word-revealed-block">{word}</span>
              ) : (
                <span
                  key={wi}
                  className="title-word-hidden-block"
                  style={{ width: `${Math.max(word.length * 1.1, 2)}ch` }}
                />
              );
            })}
          </div>
        </div>
      )}
      {tokens.map((token, i) => {
        if (token.type === 'other') {
          return <span key={i}>{token.value}</span>;
        }

        const norm = token.normalized ?? '';
        const isRevealed = revealedSet.has(norm);
        const isTitle = titleNorms.includes(norm);

        if (isRevealed) {
          return (
            <span key={i} className={isTitle ? 'word-target' : 'word-revealed'}>
              {token.value}
            </span>
          );
        }

        // Hidden word
        const score = proximityMap[norm];
        const hasProximity = score != null && score > 0.04;
        const bgColor = hasProximity ? proximityColor(score) : undefined;

        const proximityWord = proximityWordMap[norm];
        const showPlaceholder = !!proximityWord && score != null && score > 0.25 && token.length >= 4;

        const isShowingHint = hint?.tokenIndex === i;

        return (
          <span
            key={i}
            className="word-hidden"
            style={{
              width: `${Math.max(token.length * 0.58, 0.6)}em`,
              ...(bgColor ? { '--word-bg': bgColor } as React.CSSProperties : {}),
            }}
            onClick={(e) => handleHiddenClick(e, i, token.length)}
            onMouseEnter={() => {
              if (hintTimer.current) clearTimeout(hintTimer.current);
              setHint({ text: `${token.length} letter${token.length !== 1 ? 's' : ''}`, tokenIndex: i });
            }}
            onMouseLeave={() => {
              hintTimer.current = setTimeout(() => setHint(null), 400);
            }}
          >
            {showPlaceholder && !isShowingHint && (
              <span className="proximity-placeholder">{proximityWord}</span>
            )}
            {isShowingHint && (
              <span className="hint-tooltip">
                {token.length} letter{token.length !== 1 ? 's' : ''}
                {hasProximity && (
                  <span style={{ marginLeft: '4px', opacity: 0.7 }}>
                    {score > 0.7 ? '🔥' : score > 0.4 ? '🌡️' : '❄️'}
                  </span>
                )}
              </span>
            )}
          </span>
        );
      })}
    </div>
  );
}
