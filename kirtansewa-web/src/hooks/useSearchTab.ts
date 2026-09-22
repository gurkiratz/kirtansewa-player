import { useCallback, useState } from 'react';
import type { SearchTab } from '../components/search/suggestionRows';

const KEY = 'search-tab';

/**
 * Tracks-vs-artists preference, shared between the dropdown and the results
 * page so the two never disagree about what the user is looking for.
 */
export function useSearchTab(): [SearchTab, (tab: SearchTab) => void] {
  const [tab, setTabState] = useState<SearchTab>(() =>
    localStorage.getItem(KEY) === 'artists' ? 'artists' : 'tracks'
  );

  const setTab = useCallback((next: SearchTab) => {
    localStorage.setItem(KEY, next);
    setTabState(next);
  }, []);

  return [tab, setTab];
}
