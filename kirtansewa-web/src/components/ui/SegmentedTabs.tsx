export interface TabItem<T extends string> {
  value: T;
  label: string;
  /** Shown as a muted suffix, e.g. "Tracks 128". */
  count?: number;
}

interface Props<T extends string> {
  items: TabItem<T>[];
  value: T;
  onChange: (value: T) => void;
  size?: 'sm' | 'md';
  className?: string;
  ariaLabel?: string;
}

/** Pill tab switcher shared by the search dropdown and the results page. */
export function SegmentedTabs<T extends string>({
  items,
  value,
  onChange,
  size = 'md',
  className = '',
  ariaLabel,
}: Props<T>) {
  const pad = size === 'sm' ? 'px-2.5 py-1 text-[11px]' : 'px-3 py-1.5 text-xs';

  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={`inline-flex items-center gap-1 rounded-full border border-border bg-card/60 p-0.5 ${className}`}
    >
      {items.map((item) => {
        const active = item.value === value;
        return (
          <button
            key={item.value}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(item.value)}
            className={`rounded-full transition-colors whitespace-nowrap ${pad} ${
              active
                ? 'bg-gold/15 text-gold'
                : 'text-text-secondary hover:text-text-primary hover:bg-white/5'
            }`}
          >
            {item.label}
            {item.count !== undefined && (
              <span className={`ml-1.5 tabular-nums ${active ? 'text-gold/70' : 'text-text-muted'}`}>
                {item.count > 999 ? '999+' : item.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
