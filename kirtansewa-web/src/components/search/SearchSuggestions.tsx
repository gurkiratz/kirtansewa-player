import { useEffect, useRef, useState } from 'react';
import { ChevronRight, CornerDownLeft, Music2, Search, User } from 'lucide-react';
import { MIN_QUERY_LENGTH } from '../../lib/search';
import type { SearchStatus } from '../../hooks/useSearch';
import { SegmentedTabs } from '../ui/SegmentedTabs';
import { Highlight } from '../ui/Highlight';
import type { SearchTab, SuggestionRow } from './suggestionRows';

interface Props {
  rows: SuggestionRow[];
  status: SearchStatus;
  tokens: string[];
  tab: SearchTab;
  trackCount: number;
  artistCount: number;
  onTabChange: (tab: SearchTab) => void;
  /**
   * Keyboard selection: index into the *selectable* rows, or -1. This is the
   * row Enter commits to — hovering deliberately does not write to it.
   */
  activeIndex: number;
  /** Called with -1 when the pointer takes over, to drop the Enter target. */
  onActiveIndexChange: (index: number) => void;
  onSelect: (row: SuggestionRow) => void;
  /** Slug whose group header should be scrolled into view, then cleared. */
  scrollTarget: string | null;
  onScrollHandled: () => void;
}

export function SearchSuggestions({
  rows,
  status,
  tokens,
  tab,
  trackCount,
  artistCount,
  onTabChange,
  activeIndex,
  onActiveIndexChange,
  onSelect,
  scrollTarget,
  onScrollHandled,
}: Props) {
  const listRef = useRef<HTMLDivElement>(null);
  const groupRefs = useRef(new Map<string, HTMLDivElement>());
  const activeRef = useRef<HTMLButtonElement>(null);
  // Hover is presentation only, and is dropped the moment the pointer leaves
  // the list — so it can never decide what Enter does.
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  // "Load more" pulls its own artist back into view when the group has grown
  // past the bottom of the scroll area.
  useEffect(() => {
    if (!scrollTarget) return;
    const header = groupRefs.current.get(scrollTarget);
    const list = listRef.current;
    if (header && list) {
      // Measure against the scroll box rather than offsetTop: the headers are
      // sticky, so their offsetParent is the panel, not this scroller.
      const delta = header.getBoundingClientRect().top - list.getBoundingClientRect().top;
      if (delta > list.clientHeight * 0.4) {
        list.scrollTo({ top: list.scrollTop + delta - 4, behavior: 'smooth' });
      }
    }
    onScrollHandled();
  }, [scrollTarget, onScrollHandled]);

  // Keep the keyboard-highlighted row visible.
  useEffect(() => {
    activeRef.current?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex]);

  let selectableIndex = -1;

  return (
    <div className="flex flex-col max-h-[70vh] md:max-h-[28rem]">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border shrink-0">
        <SegmentedTabs
          size="sm"
          ariaLabel="Search result type"
          items={[
            { value: 'tracks', label: 'Tracks', count: trackCount },
            { value: 'artists', label: 'Artists', count: artistCount },
          ]}
          value={tab}
          onChange={(v) => onTabChange(v as SearchTab)}
        />
      </div>

      {status === 'loading' && (
        <div className="px-4 py-6 text-center text-text-muted text-xs">Searching…</div>
      )}

      {status === 'error' && (
        <div className="px-4 py-6 text-center text-text-muted text-xs">
          Search is unavailable right now.
        </div>
      )}

      {status === 'too-short' && (
        <div className="px-4 py-6 text-center text-text-muted text-xs">
          Type at least {MIN_QUERY_LENGTH} characters.
        </div>
      )}

      {status === 'ready' && rows.length === 0 && (
        <div className="px-4 py-6 text-center text-text-muted text-xs">No matches.</div>
      )}

      <div
        ref={listRef}
        onMouseLeave={() => setHoverIndex(null)}
        className="overflow-y-auto overscroll-contain"
      >
        {rows.map((row, i) => {
          if (row.kind === 'group') {
            const slug = row.slug;
            return (
              <div
                key={`g-${slug}-${i}`}
                ref={(el) => {
                  if (el) groupRefs.current.set(slug, el);
                  else groupRefs.current.delete(slug);
                }}
                className="sticky top-0 z-10 bg-panel/95 backdrop-blur-sm px-3 pt-2.5 pb-1.5 text-[11px] uppercase tracking-wider text-text-secondary truncate"
              >
                {row.artistName}
              </div>
            );
          }

          selectableIndex++;
          const index = selectableIndex;
          const active = index === activeIndex;
          // Arrow keys win over a resting pointer.
          const highlighted = activeIndex >= 0 ? active : hoverIndex === index;

          return (
            <button
              key={`${row.kind}-${index}`}
              ref={active ? activeRef : undefined}
              // onMouseDown fires before the input's blur, so the click lands.
              onMouseDown={(e) => {
                e.preventDefault();
                onSelect(row);
              }}
              // Hovering highlights the row but hands the Enter target back to
              // the query itself, so a resting pointer can't hijack Enter.
              onMouseEnter={() => {
                setHoverIndex(index);
                if (activeIndex !== -1) onActiveIndexChange(-1);
              }}
              className={`w-full flex items-center gap-2.5 px-3 py-2 text-left transition-colors ${
                highlighted ? 'bg-white/8' : ''
              }`}
            >
              <RowIcon row={row} />
              <span className="flex-1 min-w-0">
                <RowLabel row={row} tokens={tokens} />
              </span>
              {row.kind === 'artist' && (
                <span className="text-[11px] text-text-muted shrink-0 tabular-nums">
                  {row.trackCount}
                </span>
              )}
              {active && (row.kind === 'track' || row.kind === 'artist' || row.kind === 'all') && (
                <CornerDownLeft size={12} className="text-text-muted shrink-0" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function RowIcon({ row }: { row: SuggestionRow }) {
  const cls = 'shrink-0 text-text-muted';
  if (row.kind === 'track') return <Music2 size={14} className={cls} />;
  if (row.kind === 'artist') return <User size={14} className={cls} />;
  if (row.kind === 'more') return <ChevronRight size={14} className={cls} />;
  return <Search size={14} className={cls} />;
}

function RowLabel({ row, tokens }: { row: SuggestionRow; tokens: string[] }) {
  switch (row.kind) {
    case 'track':
      return (
        <span className="block text-[13px] text-text-primary truncate">
          <Highlight text={row.name} tokens={tokens} />
        </span>
      );
    case 'artist':
      return (
        <span className="block text-[13px] text-text-primary truncate">
          <Highlight text={row.artistName} tokens={tokens} />
        </span>
      );
    case 'more':
      return (
        <span className="block text-[12px] text-text-secondary truncate">
          Load {row.remaining} more from {row.artistName}
        </span>
      );
    case 'all':
      return (
        <span className="block text-[12px] text-text-secondary truncate">
          See all results for “{row.query}”
        </span>
      );
    default:
      return null;
  }
}
