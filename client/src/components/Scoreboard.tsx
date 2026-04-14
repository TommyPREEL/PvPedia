import { ClientPlayer, GameStatus } from '../types';
import { useT } from '../App';

interface Props {
  players: ClientPlayer[];
  playerId: string;
  startTime?: number;
  gameStatus: GameStatus;
  compact?: boolean;
}

function fmtTime(ms: number): string {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  return m > 0 ? `${m}m${(s % 60).toString().padStart(2, '0')}s` : `${s}s`;
}

const MEDALS = ['🥇', '🥈', '🥉'];

export default function Scoreboard({ players, playerId, gameStatus, compact }: Props) {
  const t = useT();

  const sorted = [...players].sort((a, b) => {
    if (a.score.hasWon && b.score.hasWon) return (a.score.rank ?? 99) - (b.score.rank ?? 99);
    if (a.score.hasWon) return -1;
    if (b.score.hasWon) return 1;
    return b.score.wordsRevealedFirst - a.score.wordsRevealedFirst;
  });

  return (
    <div className={compact ? 'p-2' : 'p-3'}>
      {!compact && (
        <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-2">
          {t('scoreboard')}
        </h2>
      )}
      <div className="space-y-1">
        {sorted.map((player, idx) => {
          const isMe = player.id === playerId;
          const won = player.score.hasWon;
          const rank = player.score.rank;
          const medal = rank && rank <= 3 ? MEDALS[rank - 1] : rank ? `#${rank}` : null;

          return (
            <div
              key={player.id}
              className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-xs
                ${won ? 'bg-emerald-900/25 border border-emerald-800/40' : 'bg-slate-800/40'}
                ${isMe ? 'ring-1 ring-inset ring-indigo-500/40' : ''}
              `}
            >
              {/* Rank / position */}
              <span className="w-5 text-center flex-shrink-0 text-xs">
                {won ? (medal ?? '✓') : (gameStatus === 'playing' ? idx + 1 : '—')}
              </span>

              {/* Name */}
              <span className={`flex-1 font-medium truncate
                ${won ? 'text-emerald-300' : 'text-slate-200'}
                ${isMe && !won ? 'text-indigo-300' : ''}
              `}>
                {player.name}
                {isMe && (
                  <span className="text-indigo-500/70 ml-1 font-normal">{t('you')}</span>
                )}
                {player.isLeader && !isMe && <span className="ml-1">👑</span>}
              </span>

              {/* Stats */}
              <div className="flex items-center gap-1 text-slate-500 flex-shrink-0 font-mono">
                <span title="Guesses">{player.score.wordsSubmitted}</span>
                <span>·</span>
                <span className="text-emerald-500" title="Revealed first">
                  {player.score.wordsRevealedFirst}
                </span>
                {won && player.score.winTime != null && (
                  <>
                    <span>·</span>
                    <span className="text-amber-400" title="Finish time">
                      {fmtTime(player.score.winTime)}
                    </span>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
