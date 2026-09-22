import { useState, useMemo, useEffect, useRef, useLayoutEffect, useCallback } from "react";
import { useNavigationType } from "react-router-dom";
import { ArrowUpDown } from "lucide-react";
import { useDataStore } from "../store/dataStore";
import { useLibraryStore } from "../store/libraryStore";
import { ViewToggle } from "../components/ui/ViewToggle";
import { DESKTOP_QUERY, useMediaQuery } from "../hooks/useMediaQuery";
import { useViewMode } from "../hooks/useViewMode";
import {
  ArtistGridView,
  ArtistListView,
} from "../components/artists/ArtistViews";

type SortKey = "name" | "favorites";

const PAGE_SIZE = 20;
const SCROLL_STATE_KEY = "artist-grid-scroll";

type SavedScroll = { scrollTop: number; visibleCount: number };

function readSavedScroll(): SavedScroll | null {
  try {
    const raw = sessionStorage.getItem(SCROLL_STATE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SavedScroll;
    if (typeof parsed.scrollTop !== "number" || typeof parsed.visibleCount !== "number") return null;
    return parsed;
  } catch {
    return null;
  }
}

export function ArtistGrid() {
  const artists = useDataStore((s) => s.artists);
  const scrapedSlugs = useDataStore((s) => s.scrapedSlugs);
  const imageUrls = useDataStore((s) => s.imageUrls);
  const trackCounts = useDataStore((s) => s.trackCounts);
  const loading = useDataStore((s) => s.loading);
  const favoriteArtists = useLibraryStore((s) => s.favoriteArtists);

  const [sortBy, setSortBy] = useState<SortKey>(
    () => (localStorage.getItem("artist-sort") as SortKey) || "name"
  );
  const { viewMode, toggleView } = useViewMode("artist-view");

  const toggleSort = () =>
    setSortBy((prev) => {
      const next = prev === "name" ? "favorites" : "name";
      localStorage.setItem("artist-sort", next);
      return next;
    });

  const sorted = useMemo(() => {
    const favSet = new Set(favoriteArtists);
    return [...artists].sort((a, b) => {
      if (sortBy === "favorites") {
        const aFav = favSet.has(a.slug) ? 1 : 0;
        const bFav = favSet.has(b.slug) ? 1 : 0;
        if (aFav !== bFav) return bFav - aFav;
      }
      return a.name.localeCompare(b.name);
    });
  }, [artists, favoriteArtists, sortBy]);

  const scrollRef = useRef<HTMLDivElement>(null);

  // Mobile scrolls the document; desktop scrolls this panel.
  const isDesktop = useMediaQuery(DESKTOP_QUERY);
  const readScrollTop = useCallback(
    () => (isDesktop ? scrollRef.current?.scrollTop ?? 0 : window.scrollY),
    [isDesktop]
  );

  const navigationType = useNavigationType();
  const shouldRestoreRef = useRef(navigationType === "POP");
  const savedScrollRef = useRef<SavedScroll | null>(
    shouldRestoreRef.current ? readSavedScroll() : null
  );
  const [visibleCount, setVisibleCount] = useState(
    () => savedScrollRef.current?.visibleCount ?? PAGE_SIZE
  );
  const [restored, setRestored] = useState(() => !savedScrollRef.current);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const didRestoreScrollRef = useRef(false);
  const latestScrollTopRef = useRef(savedScrollRef.current?.scrollTop ?? 0);
  const visibleCountRef = useRef(visibleCount);
  visibleCountRef.current = visibleCount;

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [sortBy]);

  // Restore scroll position once content is rendered (after loading finishes).
  useLayoutEffect(() => {
    if (didRestoreScrollRef.current) return;
    if (loading) return;
    const saved = savedScrollRef.current;
    if (saved) {
      if (isDesktop) {
        if (scrollRef.current) scrollRef.current.scrollTop = saved.scrollTop;
      } else {
        window.scrollTo(0, saved.scrollTop);
      }
      latestScrollTopRef.current = saved.scrollTop;
    }
    didRestoreScrollRef.current = true;
    setRestored(true);
  }, [loading, isDesktop]);

  // Track latest scroll position via scroll event (refs survive unmount).
  useEffect(() => {
    const target: HTMLElement | Window | null = isDesktop ? scrollRef.current : window;
    if (!target) return;
    const onScroll = () => {
      latestScrollTopRef.current = readScrollTop();
    };
    target.addEventListener("scroll", onScroll, { passive: true });
    return () => target.removeEventListener("scroll", onScroll);
  }, [loading, isDesktop, readScrollTop]);

  // Persist on unmount and on pagehide using refs (DOM may be detached at cleanup).
  useEffect(() => {
    const save = () => {
      const state: SavedScroll = {
        scrollTop: latestScrollTopRef.current,
        visibleCount: visibleCountRef.current,
      };
      try {
        sessionStorage.setItem(SCROLL_STATE_KEY, JSON.stringify(state));
      } catch {
        // ignore quota errors
      }
    };
    window.addEventListener("pagehide", save);
    return () => {
      window.removeEventListener("pagehide", save);
      save();
    };
  }, []);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || visibleCount >= sorted.length) return;
    // A null root means the viewport, which is the scroller on mobile.
    const root = isDesktop ? scrollRef.current : null;
    if (isDesktop && !root) return;
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setVisibleCount((c) => Math.min(c + PAGE_SIZE, sorted.length));
        }
      },
      { root, rootMargin: "400px" }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [visibleCount, sorted.length, isDesktop]);

  const visible = sorted.slice(0, visibleCount);
  const favoriteSet = useMemo(() => new Set(favoriteArtists), [favoriteArtists]);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center text-text-muted text-sm">
        Loading artists...
      </div>
    );
  }

  const viewProps = {
    artists: visible,
    scrapedSlugs,
    imageUrls,
    trackCounts,
    favoriteSet,
  };

  return (
    <div
      ref={scrollRef}
      className="flex-1 md:overflow-y-auto"
      style={{ visibility: restored ? "visible" : "hidden" }}
    >
      {/* Toolbar */}
      <div className="sticky top-14 md:top-0 z-10 bg-surface border-b border-border px-4 md:px-5 py-2.5 flex items-center gap-6">
        <button
          onClick={toggleSort}
          className={`flex items-center gap-1.5 text-xs transition-colors ${
            sortBy === "favorites" ? "" : "text-text-muted hover:text-text-secondary"
          }`}
        >
          <ArrowUpDown size={14} />
          <span>{sortBy === "name" ? "A–Z" : "Favorites"}</span>
        </button>

        <ViewToggle viewMode={viewMode} onToggle={toggleView} />

        <span className="text-text-muted text-xs ml-auto shrink-0">
          {sorted.length} artists
        </span>
      </div>

      {sorted.length === 0 ? (
        <div className="text-center text-text-muted text-sm py-16">
          No artists found
        </div>
      ) : viewMode === "grid" ? (
        <ArtistGridView {...viewProps} />
      ) : (
        <ArtistListView {...viewProps} />
      )}

      {visibleCount < sorted.length && (
        <div ref={sentinelRef} className="h-8" aria-hidden />
      )}
    </div>
  );
}
