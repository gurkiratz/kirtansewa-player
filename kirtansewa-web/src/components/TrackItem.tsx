import { Music2, Play } from 'lucide-react';
import { PlayingIndicator } from './ui/PlayingIndicator';
import { Highlight } from './ui/Highlight';

interface Props {
  title: string;
  subtitle?: string;
  coverUrl?: string | null;
  variant: 'card' | 'row';
  /** 1-based number shown in row variant. */
  number?: number;
  isActive?: boolean;
  isPlaying?: boolean;
  /** Query tokens to emphasise inside the title. */
  highlight?: string[];
  onClick: () => void;
  trailing?: React.ReactNode;
}

/**
 * One track, in either of the two shapes the app uses: a compact card for grid
 * views and a full-width row for list views.
 */
export function TrackItem({
  title,
  subtitle,
  coverUrl,
  variant,
  number,
  isActive = false,
  isPlaying = false,
  highlight,
  onClick,
  trailing,
}: Props) {
  const label = highlight?.length ? <Highlight text={title} tokens={highlight} /> : title;

  if (variant === 'card') {
    return (
      <button
        onClick={onClick}
        title={title}
        className={`group relative w-full text-left rounded-sm border px-3 py-2.5 transition-all duration-150 ${
          isActive
            ? 'border-gold/50 bg-gold/10'
            : 'border-border bg-card hover:border-gold/40 hover:bg-white/5 hover:-translate-y-0.5'
        }`}
      >
        <div className="flex items-start gap-2">
          <span
            className={`mt-0.5 shrink-0 ${isActive ? 'text-gold' : 'text-text-muted group-hover:text-gold'}`}
          >
            {isActive ? (
              <PlayingIndicator animate={isPlaying} />
            ) : (
              <Play size={12} className="fill-current" />
            )}
          </span>
          <span
            className={`text-[12.5px] leading-snug line-clamp-2 ${
              isActive ? 'text-gold' : 'text-text-primary'
            }`}
          >
            {label}
          </span>
        </div>
        {subtitle && (
          <p className="mt-1 pl-[1.15rem] text-[11px] text-text-secondary truncate">{subtitle}</p>
        )}
      </button>
    );
  }

  return (
    <div
      className={`w-full flex items-center gap-3 px-4 md:px-5 h-13 transition-colors group ${
        isActive
          ? 'bg-gold/15 border-l-4 border-l-gold'
          : 'border-b border-border/50 hover:bg-white/5'
      }`}
    >
      <button onClick={onClick} className="flex-1 min-w-0 flex items-center gap-3 h-full py-2 text-left">
        {coverUrl !== undefined ? (
          <span className="w-9 h-9 shrink-0 rounded-sm overflow-hidden bg-card flex items-center justify-center">
            {coverUrl ? (
              <img src={coverUrl} alt="" loading="lazy" className="w-full h-full object-cover" />
            ) : (
              <Music2 size={14} className="text-text-muted" />
            )}
          </span>
        ) : (
          <span
            className={`w-8 text-center shrink-0 text-sm ${isActive ? 'text-gold' : 'text-text-primary/50'}`}
          >
            {isActive ? (
              <PlayingIndicator animate={isPlaying} className="mx-auto" />
            ) : (
              number
            )}
          </span>
        )}
        <span className="flex-1 min-w-0">
          <span
            className={`block text-[13px] font-medium truncate leading-tight ${
              isActive ? 'text-gold' : 'text-text-primary'
            }`}
          >
            {label}
          </span>
          {subtitle && (
            <span className="block text-[11px] text-text-secondary truncate leading-tight mt-0.5">
              {subtitle}
            </span>
          )}
        </span>
      </button>
      {trailing}
    </div>
  );
}
