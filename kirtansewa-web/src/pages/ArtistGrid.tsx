import { useState, useMemo, useEffect, useRef, useLayoutEffect } from "react";
import { useNavigate, useNavigationType, useSearchParams } from "react-router-dom";
import { ArrowUpDown, Bookmark, LayoutGrid, List } from "lucide-react";
import { useDataStore } from "../store/dataStore";
import { useLibraryStore } from "../store/libraryStore";
import { ArtistCard } from "../components/ArtistCard";
import type { Artist } from "../types";

type SortKey = "name" | "favorites";
type ViewMode = "grid" | "list";

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

  const [searchParams] = useSearchParams();
  const query = searchParams.get("q") ?? "";
  const [sortBy, setSortBy] = useState<SortKey>(
    () => (localStorage.getItem("artist-sort") as SortKey) || "name"
  );
  const [viewMode, setViewMode] = useState<ViewMode>(
    () => (localStorage.getItem("artist-view") as ViewMode) || "grid"
  );

  const toggleSort = () =>
    setSortBy((prev) => {
      const next = prev === "name" ? "favorites" : "name";
      localStorage.setItem("artist-sort", next);
      return next;
    });

  const toggleView = () =>
    setViewMode((prev) => {
      const next = prev === "grid" ? "list" : "grid";
      localStorage.setItem("artist-view", next);
      return next;
    });

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    const favSet = new Set(favoriteArtists);
    return artists
      .filter((a) => a.name.toLowerCase().includes(q))
      .sort((a, b) => {
        if (sortBy === "favorites") {
          const aFav = favSet.has(a.slug) ? 1 : 0;
          const bFav = favSet.has(b.slug) ? 1 : 0;
          if (aFav !== bFav) return bFav - aFav;
        }
        return a.name.localeCompare(b.name);
      });
  }, [artists, favoriteArtists, query, sortBy]);

  const navigationType = useNavigationType();
  const shouldRestoreRef = useRef(navigationType === "POP");
  const savedScrollRef = useRef<SavedScroll | null>(
    shouldRestoreRef.current ? readSavedScroll() : null
  );
  const [visibleCount, setVisibleCount] = useState(
    () => savedScrollRef.current?.visibleCount ?? PAGE_SIZE
  );
  const scrollRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const didRestoreScrollRef = useRef(false);
  const latestScrollTopRef = useRef(savedScrollRef.current?.scrollTop ?? 0);
  const visibleCountRef = useRef(visibleCount);
  visibleCountRef.current = visibleCount;

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [query, sortBy]);

  // Restore scroll position once content is rendered (after loading finishes).
  useLayoutEffect(() => {
    if (didRestoreScrollRef.current) return;
    if (loading) return;
    const saved = savedScrollRef.current;
    const root = scrollRef.current;
    if (!saved || !root) {
      didRestoreScrollRef.current = true;
      return;
    }
    root.scrollTop = saved.scrollTop;
    latestScrollTopRef.current = saved.scrollTop;
    didRestoreScrollRef.current = true;
  }, [loading]);

  // Track latest scroll position via scroll event (refs survive unmount).
  useEffect(() => {
    const root = scrollRef.current;
    if (!root) return;
    const onScroll = () => {
      latestScrollTopRef.current = root.scrollTop;
    };
    root.addEventListener("scroll", onScroll, { passive: true });
    return () => root.removeEventListener("scroll", onScroll);
  }, [loading]);

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
    const root = scrollRef.current;
    if (!el || !root || visibleCount >= filtered.length) return;
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setVisibleCount((c) => Math.min(c + PAGE_SIZE, filtered.length));
        }
      },
      { root, rootMargin: "400px" }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [visibleCount, filtered.length]);

  const visible = filtered.slice(0, visibleCount);
  const favoriteSet = useMemo(
    () => new Set(favoriteArtists),
    [favoriteArtists]
  );

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center text-text-muted text-sm">
        Loading artists...
      </div>
    );
  }

  return (
    <div ref={scrollRef} className="flex-1 overflow-y-auto">
      {/* Toolbar */}
      <div className="sticky top-0 z-10 bg-surface border-b border-border px-4 md:px-5 py-2.5 flex items-center gap-6">
        <button
          onClick={toggleSort}
          className={`flex items-center gap-1.5 text-xs transition-colors ${
            sortBy === "favorites"
              ? ""
              : "text-text-muted hover:text-text-secondary"
          }`}
        >
          <ArrowUpDown size={14} />
          <span>{sortBy === "name" ? "A\u2013Z" : "Favorites"}</span>
        </button>

        <button
          onClick={toggleView}
          className={`flex items-center gap-1.5 text-xs transition-colors ${
            viewMode === "grid"
              ? ""
              : "text-text-muted hover:text-text-secondary"
          }`}
          title={
            viewMode === "grid" ? "Switch to list view" : "Switch to grid view"
          }
        >
          {viewMode === "grid" ? <LayoutGrid size={14} /> : <List size={14} />}
          <span>{viewMode === "grid" ? "Grid" : "List"}</span>
        </button>

        <span className="text-text-muted text-xs ml-auto shrink-0">
          {filtered.length} artists
        </span>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center text-text-muted text-sm py-16">
          No artists found
        </div>
      ) : viewMode === "grid" ? (
        <>
          {/* Mobile: 2-col card grid */}
          <div className="md:hidden grid grid-cols-2 gap-3 p-3">
            {visible.map((artist) => (
              <ArtistCard
                key={artist.slug}
                artist={artist}
                enabled={scrapedSlugs.has(artist.slug)}
                imageUrl={imageUrls.get(artist.slug)}
                trackCount={trackCounts.get(artist.slug)}
                isFavorite={favoriteSet.has(artist.slug)}
              />
            ))}
          </div>

          {/* Desktop: card grid */}
          <div
            className="hidden md:grid p-5 gap-4"
            style={{
              gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
            }}
          >
            {visible.map((artist) => (
              <ArtistCard
                key={artist.slug}
                artist={artist}
                enabled={scrapedSlugs.has(artist.slug)}
                imageUrl={imageUrls.get(artist.slug)}
                trackCount={trackCounts.get(artist.slug)}
                isFavorite={favoriteSet.has(artist.slug)}
              />
            ))}
          </div>
        </>
      ) : (
        <>
          {/* Mobile: flat name list */}
          <div className="md:hidden">
            <MobileArtistList
              artists={visible}
              scrapedSlugs={scrapedSlugs}
              favoriteSet={favoriteSet}
            />
          </div>

          {/* Desktop: multi-column list */}
          <div className="hidden md:block p-5">
            <DesktopArtistList
              artists={visible}
              scrapedSlugs={scrapedSlugs}
              favoriteSet={favoriteSet}
            />
          </div>
        </>
      )}

      {visibleCount < filtered.length && (
        <div ref={sentinelRef} className="h-8" aria-hidden />
      )}
    </div>
  );
}

function MobileArtistList({
  artists,
  scrapedSlugs,
  favoriteSet,
}: {
  artists: Artist[];
  scrapedSlugs: Set<string>;
  favoriteSet: Set<string>;
}) {
  const navigate = useNavigate();

  return (
    <ul>
      {artists.map((artist) => {
        const enabled = scrapedSlugs.has(artist.slug);
        const isFavorite = favoriteSet.has(artist.slug);
        return (
          <li key={artist.slug}>
            <button
              onClick={() => enabled && navigate(`/artist/${artist.slug}`)}
              disabled={!enabled}
              className={`w-full flex items-center gap-2 text-left px-4 py-3.5 border-b border-border/60 text-sm transition-colors
                ${
                  enabled
                    ? "text-text-primary active:bg-white/5"
                    : "text-text-muted cursor-not-allowed"
                }
              `}
            >
              <span className="flex-1 truncate">{artist.name}</span>
              {isFavorite && (
                <Bookmark
                  size={11}
                  className="text-text-muted fill-current shrink-0"
                  aria-label="Favorite"
                />
              )}
            </button>
          </li>
        );
      })}
    </ul>
  );
}

function DesktopArtistList({
  artists,
  scrapedSlugs,
  favoriteSet,
}: {
  artists: Artist[];
  scrapedSlugs: Set<string>;
  favoriteSet: Set<string>;
}) {
  const navigate = useNavigate();

  return (
    <ul
      style={{
        columnWidth: "260px",
        columnGap: "2.5rem",
        columnRule: "1px solid rgba(255, 255, 255, 0.06)",
      }}
    >
      {artists.map((artist) => {
        const enabled = scrapedSlugs.has(artist.slug);
        const isFavorite = favoriteSet.has(artist.slug);
        return (
          <li key={artist.slug} style={{ breakInside: "avoid" }}>
            <button
              onClick={() => enabled && navigate(`/artist/${artist.slug}`)}
              disabled={!enabled}
              className={`w-full flex items-center gap-3 text-left px-2 py-2.5 border-b border-border/60 text-sm rounded-sm transition-colors
                ${
                  enabled
                    ? "text-text-primary hover:bg-white/5"
                    : "text-text-muted cursor-not-allowed opacity-60"
                }
              `}
            >
              <span className="flex-1 truncate">{artist.name}</span>
              {isFavorite && (
                <Bookmark
                  size={11}
                  className="text-text-muted fill-current shrink-0"
                  aria-label="Favorite"
                />
              )}
            </button>
          </li>
        );
      })}
    </ul>
  );
}
