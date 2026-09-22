import { useCallback, useSyncExternalStore } from 'react';

/** Matches Tailwind's `md` breakpoint. */
export const DESKTOP_QUERY = '(min-width: 768px)';

/**
 * Reactive media query.
 *
 * Needed where a breakpoint changes behaviour rather than just styling — most
 * of all which element scrolls: on mobile the document scrolls (so iOS
 * status-bar tap-to-top works), on desktop each panel scrolls itself.
 */
export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const mql = window.matchMedia(query);
      mql.addEventListener('change', onChange);
      return () => mql.removeEventListener('change', onChange);
    },
    [query]
  );

  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(query).matches,
    () => false
  );
}
