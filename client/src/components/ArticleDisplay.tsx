import { ClientToken, ProximityMap, ProximityWordEntry } from '../types';
import { proximityColor, proximityTextColor } from '../sounds';
import { useI18n } from '../App';

interface Props {
  tokens: ClientToken[];
  revealedWords: string[];
  articleTitle?: string;
  titleWordLengths: number[];
  titleRevealed: (string | null)[];
  proximityMap: ProximityMap;
  proximityWordMap: Record<string, ProximityWordEntry>;
  onHiddenWordClick: () => void;
}

function normalizeForTitle(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z]/g, '');
}

export default function ArticleDisplay({
  tokens, revealedWords, articleTitle, titleWordLengths, titleRevealed, proximityMap, proximityWordMap, onHiddenWordClick,
}: Props) {
  const { t } = useI18n();
  const revealedSet = new Set(revealedWords);

  const titleNorms = articleTitle
    ? articleTitle.split(/\s+/).map(normalizeForTitle).filter(Boolean)
    : [];

  if (!tokens || tokens.length === 0) {
    return (
      <div className="text-slate-500 text-center mt-16">
        <div className="text-5xl mb-4">📖</div>
        <p>Waiting for the article…</p>
      </div>
    );
  }

  // During gameplay articleTitle is hidden — use titleWordLengths for blank boxes.
  // When finished, articleTitle is revealed — show actual words.
  const titleWords = articleTitle ? articleTitle.split(/\s+/).filter(Boolean) : [];
  const showTitle = titleWordLengths.length > 0 || titleWords.length > 0;

  return (
    <div className="article-text text-[0.95rem] leading-loose text-slate-200 select-text">
      {showTitle && (
        <div className="title-display">
          <p className="text-xs text-slate-500 uppercase tracking-widest mb-3 text-center">{t('findTheArticle')}</p>
          <div className="flex flex-wrap justify-center gap-x-3 gap-y-2 items-center mb-8">
            {articleTitle
              ? /* Game finished — show actual words */
                titleWords.map((word, wi) => (
                  <span key={wi} className="title-word-revealed-block">{word}</span>
                ))
              : /* Game in progress — show revealed words or blank boxes with letter count */
                titleWordLengths.map((len, wi) => {
                  const revealedWord = titleRevealed?.[wi];
                  if (revealedWord) {
                    return (
                      <span key={wi} className="title-word-revealed-block" style={{ fontSize: '1.5rem' }}>
                        {revealedWord}
                      </span>
                    );
                  }
                  return (
                    <span
                      key={wi}
                      className="title-word-hidden-block relative"
                      style={{ width: `${Math.max(len * 1.1, 2)}ch` }}
                    >
                      <span className="absolute inset-0 flex items-center justify-center text-slate-500 text-[10px] pointer-events-none">
                        {len}
                      </span>
                    </span>
                  );
                })
            }
          </div>
        </div>
      )}
      {tokens.map((token, i) => {
        if (token.type === 'other') {
          return <span key={i}>{token.value}</span>;
        }

        // Number token — hidden during game, revealed when finished
        if (token.type === 'number') {
          if (token.revealed) {
            return <span key={i}>{token.value}</span>;
          }
          return (
            <span
              key={i}
              className="word-hidden"
              style={{ width: `${Math.max(token.length * 0.58, 0.6)}em` }}
              onClick={onHiddenWordClick}
            >
              <span className="word-length-label">{token.length}</span>
            </span>
          );
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

        const proximityEntry = proximityWordMap[norm];
        const showPlaceholder = !!proximityEntry && token.length >= 4;

        return (
          <span
            key={i}
            className="word-hidden"
            style={{
              width: `${Math.max(token.length * 0.58, 0.6)}em`,
              ...(bgColor ? { '--word-bg': bgColor } as React.CSSProperties : {}),
            }}
            onClick={onHiddenWordClick}
          >
            {showPlaceholder ? (
              <span
                className="proximity-placeholder"
                style={{ color: proximityTextColor(proximityEntry.score) }}
              >
                {proximityEntry.word}
              </span>
            ) : (
              <span className="word-length-label">{token.length}</span>
            )}
          </span>
        );
      })}
    </div>
  );
}
