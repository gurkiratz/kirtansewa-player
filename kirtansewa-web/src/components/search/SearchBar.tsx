import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Search, X } from 'lucide-react';
import { MIN_QUERY_LENGTH, normalize, prefetchSearchIndex } from '../../lib/search';
import { useSearch } from '../../hooks/useSearch';
import { useSearchTab } from '../../hooks/useSearchTab';
import { SearchSuggestions } from './SearchSuggestions';
import {
  LOAD_MORE_STEP,
  TRACKS_PER_GROUP,
  buildSuggestionRows,
  isSelectable,
  type SuggestionRow,
} from './suggestionRows';

interface Props {
  placeholder?: string;
  className?: string;
  inputClassName?: string;
}

/**
 * The single search entry point, shared by the desktop top bar and the mobile
 * header.
 *
 * Typing >= MIN_QUERY_LENGTH characters opens a YouTube-style suggestion panel;
 * Enter (or picking the last row) commits to the full results page at /?q=.
 */
export function SearchBar({
  placeholder = 'Search tracks and artists',
  className = '',
  inputClassName = '',
}: Props) {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const urlQuery = params.get('q') ?? '';

  const [input, setInput] = useState(urlQuery);
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useSearchTab();
  const [activeIndex, setActiveIndex] = useState(-1);
  const [expanded, setExpanded] = useState<Record<string, number>>({});
  const [scrollTarget, setScrollTarget] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Follow the URL when navigation (not typing) changes the committed query.
  const [syncedUrlQuery, setSyncedUrlQuery] = useState(urlQuery);
  if (syncedUrlQuery !== urlQuery) {
    setSyncedUrlQuery(urlQuery);
    setInput(urlQuery);
  }

  const longEnough = normalize(input).length >= MIN_QUERY_LENGTH;
  const { status, result } = useSearch(input, { enabled: open && longEnough });

  const tokens = useMemo(() => {
    const n = normalize(result.query);
    return n ? n.split(' ') : [];
  }, [result.query]);

  const rows = useMemo(
    () => (status === 'ready' ? buildSuggestionRows(result, tab, expanded) : []),
    [result, status, tab, expanded]
  );
  const selectableRows = useMemo(() => rows.filter(isSelectable), [rows]);

  // A new query or tab invalidates both the highlight and per-group expansion.
  // Done during render so the dropdown never paints a stale highlight.
  const rowsKey = `${result.query}\u0000${tab}`;
  const [lastRowsKey, setLastRowsKey] = useState(rowsKey);
  if (lastRowsKey !== rowsKey) {
    const queryChanged = lastRowsKey.split('\u0000')[0] !== result.query;
    setLastRowsKey(rowsKey);
    setActiveIndex(-1);
    if (queryChanged) setExpanded({});
  }

  const close = useCallback(() => {
    setOpen(false);
    setActiveIndex(-1);
  }, []);

  // Close when focus or a click lands outside the bar.
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: MouseEvent | TouchEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) close();
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('touchstart', onPointerDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('touchstart', onPointerDown);
    };
  }, [open, close]);

  const submit = useCallback(
    (value: string) => {
      close();
      inputRef.current?.blur();
      const trimmed = value.trim();
      navigate(trimmed ? `/?q=${encodeURIComponent(trimmed)}` : '/');
    },
    [close, navigate]
  );

  const handleSelect = useCallback(
    (row: SuggestionRow) => {
      switch (row.kind) {
        case 'track':
          // Land on the artist page with this track already playing.
          close();
          inputRef.current?.blur();
          navigate(`/artist/${row.slug}?play=${row.localIndex}`);
          break;
        case 'artist':
          close();
          inputRef.current?.blur();
          navigate(`/artist/${row.slug}`);
          break;
        case 'more':
          setExpanded((prev) => ({
            ...prev,
            [row.slug]: (prev[row.slug] ?? TRACKS_PER_GROUP) + LOAD_MORE_STEP,
          }));
          setScrollTarget(row.slug);
          break;
        case 'all':
          submit(row.query);
          break;
      }
    },
    [close, navigate, submit]
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      if (open) close();
      else inputRef.current?.blur();
      return;
    }

    if (e.key === 'Enter') {
      e.preventDefault();
      const row = activeIndex >= 0 ? selectableRows[activeIndex] : undefined;
      if (row) handleSelect(row);
      else submit(input);
      return;
    }

    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      if (!open || selectableRows.length === 0) return;
      e.preventDefault();
      const delta = e.key === 'ArrowDown' ? 1 : -1;
      setActiveIndex((prev) => {
        const next = prev + delta;
        if (next < -1) return selectableRows.length - 1;
        if (next >= selectableRows.length) return -1;
        return next;
      });
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);
    setOpen(true);
  };

  const clear = () => {
    setInput('');
    setOpen(false);
    inputRef.current?.focus();
  };

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <Search
        size={14}
        className="absolute left-3 top-1/2 -translate-y-1/2 text-text-primary/50 pointer-events-none"
      />
      <input
        ref={inputRef}
        type="search"
        role="combobox"
        aria-expanded={open}
        aria-autocomplete="list"
        autoComplete="off"
        placeholder={placeholder}
        value={input}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        // Pull the index down while the user is still reaching for the keyboard.
        onFocus={() => {
          prefetchSearchIndex();
          if (normalize(input).length >= MIN_QUERY_LENGTH) setOpen(true);
        }}
        onMouseEnter={prefetchSearchIndex}
        className={`w-full bg-card border border-border rounded-md pl-8 pr-8 py-1.5 text-sm text-text-primary placeholder:text-text-primary/50 focus:outline-none focus:border-gold/50 transition-colors [&::-webkit-search-cancel-button]:hidden ${inputClassName}`}
      />
      {input && (
        <button
          onClick={clear}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-primary/40 hover:text-text-primary transition-colors"
          aria-label="Clear search"
        >
          <X size={14} />
        </button>
      )}

      {open && longEnough && (
        <div className="drop-in absolute left-0 right-0 top-[calc(100%+6px)] z-50 rounded-lg border border-border bg-panel shadow-2xl shadow-black/60 overflow-hidden">
          <SearchSuggestions
            rows={rows}
            status={status}
            tokens={tokens}
            tab={tab}
            trackCount={result.trackCount}
            artistCount={result.artists.length}
            onTabChange={setTab}
            activeIndex={activeIndex}
            onActiveIndexChange={setActiveIndex}
            onSelect={handleSelect}
            scrollTarget={scrollTarget}
            onScrollHandled={() => setScrollTarget(null)}
          />
        </div>
      )}
    </div>
  );
}
