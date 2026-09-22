import { useState } from 'react';

export type ViewMode = 'grid' | 'list';

/** Grid/list preference, remembered per surface under its own storage key. */
export function useViewMode(storageKey: string, fallback: ViewMode = 'grid') {
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    const stored = localStorage.getItem(storageKey);
    return stored === 'grid' || stored === 'list' ? stored : fallback;
  });

  const toggleView = () =>
    setViewMode((prev) => {
      const next = prev === 'grid' ? 'list' : 'grid';
      localStorage.setItem(storageKey, next);
      return next;
    });

  return { viewMode, toggleView };
}
