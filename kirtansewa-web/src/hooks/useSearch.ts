import { useEffect, useRef, useState } from 'react';
import {
  EMPTY_RESULT,
  MIN_QUERY_LENGTH,
  getLoadedEngine,
  loadSearchEngine,
  normalize,
  search,
  type SearchResult,
} from '../lib/search';

export type SearchStatus = 'too-short' | 'loading' | 'ready' | 'error';

interface Options {
  /** Wait this long after the last keystroke before searching. */
  debounceMs?: number;
  /** Set false to keep the index (and any work) idle — e.g. a closed dropdown. */
  enabled?: boolean;
}

/**
 * Debounced search over the catalog index.
 *
 * Queries shorter than MIN_QUERY_LENGTH never touch the index. While a newer
 * query is still settling the previous result stays on screen, so the list
 * doesn't blank out between keystrokes.
 */
export function useSearch(query: string, options: Options = {}) {
  const { debounceMs = 150, enabled = true } = options;
  const trimmed = query.trim();
  const tooShort = normalize(trimmed).length < MIN_QUERY_LENGTH;

  const [entry, setEntry] = useState<SearchResult | null>(null);
  const [failedQuery, setFailedQuery] = useState<string | null>(null);
  const requestRef = useRef(0);

  useEffect(() => {
    if (!enabled || tooShort) return;

    const token = ++requestRef.current;
    const loaded = getLoadedEngine();

    const timer = setTimeout(() => {
      (loaded ? Promise.resolve(loaded) : loadSearchEngine())
        .then((engine) => {
          if (requestRef.current !== token) return;
          setEntry(search(engine, trimmed));
        })
        .catch(() => {
          if (requestRef.current !== token) return;
          setFailedQuery(trimmed);
        });
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [trimmed, tooShort, enabled, debounceMs]);

  const status: SearchStatus = tooShort
    ? 'too-short'
    : failedQuery === trimmed
      ? 'error'
      : entry
        ? 'ready'
        : 'loading';

  return {
    status,
    result: tooShort || status === 'error' ? EMPTY_RESULT : (entry ?? EMPTY_RESULT),
    tooShort,
  };
}
