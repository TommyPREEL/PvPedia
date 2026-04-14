import { WordEntry } from '../types';
import { useT } from '../App';

interface Props {
  entries: WordEntry[];
  expanded?: boolean; // fill all available space
}

const STATUS_ICON: Record<WordEntry['status'], string> = {
  found:  '✓',
  miss:   '✗',
  common: '≈',
  close:  '~',
};
const STATUS_CLASS: Record<WordEntry['status'], string> = {
  found:  'text-emerald-300',
  miss:   'text-slate-500 line-through decoration-red-700/60',
  common: 'text-slate-500 italic',
  close:  'text-amber-300/80',
};
const DOT_CLASS: Record<WordEntry['status'], string> = {
  found:  'bg-emerald-400',
  miss:   'bg-red-500',
  common: 'bg-amber-500/70',
  close:  'bg-amber-400',
};

export default function WordList({ entries, expanded }: Props) {
  const t = useT();
  const found  = entries.filter((e) => e.status === 'found').length;
  const missed = entries.filter((e) => e.status === 'miss').length;
  const common = entries.filter((e) => e.status === 'common').length;
  const close  = entries.filter((e) => e.status === 'close').length;

  return (
    <div className={`flex flex-col ${expanded ? 'h-full' : ''}`}>
      {/* Header */}
      <div className="px-3 py-2 border-b border-slate-700/50 flex-shrink-0">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-widest">
            {t('myGuesses')}
          </h2>
          <div className="flex items-center gap-2 text-xs">
            <span className="text-emerald-400 font-semibold">{found}</span>
            <span className="text-slate-600">/</span>
            <span className="text-slate-400">{entries.length}</span>
          </div>
        </div>
        {entries.length > 0 && (
          <div className="flex gap-2 mt-1 text-xs text-slate-600">
            <span className="text-emerald-500">{found}✓</span>
            <span className="text-red-500">{missed}✗</span>
            {close > 0 && <span className="text-amber-400">{close}~</span>}
            {common > 0 && <span className="text-amber-500">{common}≈</span>}
          </div>
        )}
      </div>

      {/* List */}
      <div className={`overflow-y-auto px-3 py-1 ${expanded ? 'flex-1' : 'max-h-48'}`}>
        {entries.length === 0 ? (
          <p className="text-slate-600 text-xs text-center py-4">{t('noGuessesYet')}</p>
        ) : (
          <div className="space-y-0.5 py-1">
            {entries.map((entry, i) => (
              <div key={i} className="flex items-center gap-2 py-0.5 group">
                <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${DOT_CLASS[entry.status]}`} />
                <span className={`flex-1 font-mono text-xs truncate ${STATUS_CLASS[entry.status]}`}>
                  {entry.word}
                </span>
                <span className={`text-xs flex-shrink-0 opacity-70 ${
                  entry.status === 'found'  ? 'text-emerald-400' :
                  entry.status === 'close'  ? 'text-amber-400' :
                  entry.status === 'miss'   ? 'text-red-500' :
                  'text-amber-500'
                }`}>
                  {STATUS_ICON[entry.status]}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
