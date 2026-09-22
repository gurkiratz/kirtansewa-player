import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Loader2, Play } from 'lucide-react';
import { MIN_QUERY_LENGTH, normalize, type ArtistTrackGroup } from '../lib/search';
import { useSearch } from '../hooks/useSearch';
import { useSearchTab } from '../hooks/useSearchTab';
import { useDataStore } from '../store/dataStore';
import { useLibraryStore } from '../store/libraryStore';
import { usePlayerStore } from '../store/playerStore';
import { toTrack, type Artist, type Track } from '../types';
import { SegmentedTabs } from '../components/ui/SegmentedTabs';
import { ViewToggle } from '../components/ui/ViewToggle';
import { useViewMode } from '../hooks/useViewMode';
import { ArtistGridView, ArtistListView } from '../components/artists/ArtistViews';
import { ArtistCard } from '../components/ArtistCard';
import { TrackItem } from '../components/TrackItem';
import type { SearchTab } from '../components/search/suggestionRows';

/** Artist groups rendered before the "load more" sentinel kicks in. */
const GROUP_PAGE = 8;
/** Matched tracks shown per artist before "show all". */
const COLLAPSED_TRACKS = 6;

export function SearchResults({ query }: { query: string }) {
  const [, setSearchParams] = useSearchParams();
  const [tab, setTab] = useSearchTab();
  const { viewMode, toggleView } = useViewMode('search-view');
  const { status, result } = useSearch(query, { debounceMs: 0 });

  const artists = useDataStore((s) => s.artists);
  const scrapedSlugs = useDataStore((s) => s.scrapedSlugs);
  const imageUrls = useDataStore((s) => s.imageUrls);
  const trackCounts = useDataStore((s) => s.trackCounts);
  const favoriteArtists = useLibraryStore((s) => s.favoriteArtists);
  const favoriteSet = useMemo(() => new Set(favoriteArtists), [favoriteArtists]);

  const tokens = useMemo(() => {
    const n = normalize(result.query);
    return n ? n.split(' ') : [];
  }, [result.query]);

  const [visibleGroups, setVisibleGroups] = useState(GROUP_PAGE);
  const scrollRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);

  // Reset paging during render when the query or tab changes — an effect would
  // render one frame of the old list first.
  const resetKey = `${result.query}\u0000${tab}`;
  const [lastResetKey, setLastResetKey] = useState(resetKey);
  if (lastResetKey !== resetKey) {
    setLastResetKey(resetKey);
    setVisibleGroups(GROUP_PAGE);
  }

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0 });
  }, [resetKey]);

  useEffect(() => {
    const el = sentinelRef.current;
    const root = scrollRef.current;
    if (!el || !root || visibleGroups >= result.groups.length) return;
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setVisibleGroups((n) => Math.min(n + GROUP_PAGE, result.groups.length));
        }
      },
      { root, rootMargin: '400px' }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [visibleGroups, result.groups.length]);

  // The artists tab renders the same cards/rows as the home grid, so map the
  // index hits back onto the catalog's Artist records.
  const artistBySlug = useMemo(() => new Map(artists.map((a) => [a.slug, a])), [artists]);
  const artistResults: Artist[] = useMemo(
    () =>
      result.artists.map(
        (hit) =>
          artistBySlug.get(hit.slug) ?? { name: hit.name, slug: hit.slug, url: '' }
      ),
    [result.artists, artistBySlug]
  );

  const tooShort = normalize(query).length < MIN_QUERY_LENGTH;

  return (
    <div ref={scrollRef} className="flex-1 overflow-y-auto">
      <div className="sticky top-0 z-20 bg-surface border-b border-border px-4 md:px-5 py-2.5 flex items-center gap-3 md:gap-6">
        <SegmentedTabs
          ariaLabel="Search result type"
          items={[
            { value: 'tracks', label: 'Tracks', count: result.trackCount },
            { value: 'artists', label: 'Artists', count: result.artists.length },
          ]}
          value={tab}
          onChange={(v) => setTab(v as SearchTab)}
        />
        <ViewToggle viewMode={viewMode} onToggle={toggleView} className="ml-auto shrink-0" />
      </div>

      <div className="px-4 md:px-5 pt-4 pb-1">
        <p className="text-xs text-text-secondary">
          Results for <span className="text-text-primary">“{query}”</span>
          <button
            onClick={() => setSearchParams({})}
            className="ml-3 text-text-muted hover:text-text-primary transition-colors"
          >
            Clear
          </button>
        </p>
      </div>

      {tooShort && (
        <EmptyState>Type at least {MIN_QUERY_LENGTH} characters to search.</EmptyState>
      )}
      {!tooShort && status === 'loading' && <EmptyState>Searching…</EmptyState>}
      {!tooShort && status === 'error' && (
        <EmptyState>Search is unavailable right now. Please try again.</EmptyState>
      )}

      {!tooShort && status === 'ready' && tab === 'tracks' && (
        <>
          {result.groups.length === 0 ? (
            <EmptyState>No tracks match “{query}”.</EmptyState>
          ) : (
            <div className="pb-6">
              {result.groups.slice(0, visibleGroups).map((group) => (
                <TrackGroup
                  key={group.artist.slug}
                  group={group}
                  viewMode={viewMode}
                  tokens={tokens}
                  imageUrl={imageUrls.get(group.artist.slug) ?? group.artist.imageUrl}
                  artist={artistBySlug.get(group.artist.slug)}
                  enabled={scrapedSlugs.has(group.artist.slug)}
                  isFavorite={favoriteSet.has(group.artist.slug)}
                  totalTracks={trackCounts.get(group.artist.slug)}
                />
              ))}
              {visibleGroups < result.groups.length && (
                <div ref={sentinelRef} className="h-8" aria-hidden />
              )}
            </div>
          )}
        </>
      )}

      {!tooShort && status === 'ready' && tab === 'artists' && (
        <>
          {artistResults.length === 0 ? (
            <EmptyState>No artists match “{query}”.</EmptyState>
          ) : viewMode === 'grid' ? (
            <ArtistGridView
              artists={artistResults}
              scrapedSlugs={scrapedSlugs}
              imageUrls={imageUrls}
              trackCounts={trackCounts}
              favoriteSet={favoriteSet}
            />
          ) : (
            <ArtistListView
              artists={artistResults}
              scrapedSlugs={scrapedSlugs}
              imageUrls={imageUrls}
              trackCounts={trackCounts}
              favoriteSet={favoriteSet}
            />
          )}
        </>
      )}
    </div>
  );
}

function EmptyState({ children }: { children: React.ReactNode }) {
  return <div className="text-center text-text-muted text-sm py-16 px-4">{children}</div>;
}

/* ------------------------------------------------------------------ */
/* One artist's matching tracks                                        */
/* ------------------------------------------------------------------ */

interface GroupProps {
  group: ArtistTrackGroup;
  viewMode: 'grid' | 'list';
  tokens: string[];
  imageUrl: string | null | undefined;
  artist: Artist | undefined;
  enabled: boolean;
  isFavorite: boolean;
  totalTracks: number | undefined;
}

function TrackGroup({
  group,
  viewMode,
  tokens,
  imageUrl,
  artist,
  enabled,
  isFavorite,
  totalTracks,
}: GroupProps) {
  const [expanded, setExpanded] = useState(false);
  const [pending, setPending] = useState<number | null>(null);
  const loadArtistDetail = useDataStore((s) => s.loadArtistDetail);
  const clearQueue = usePlayerStore((s) => s.clearQueue);
  const addToQueue = usePlayerStore((s) => s.addToQueue);
  const playTrack = usePlayerStore((s) => s.playTrack);
  const queue = usePlayerStore((s) => s.queue);
  const currentIndex = usePlayerStore((s) => s.currentIndex);
  const isPlaying = usePlayerStore((s) => s.isPlaying);

  const current = currentIndex >= 0 ? queue[currentIndex] : null;
  const slug = group.artist.slug;

  const shown = expanded ? group.tracks : group.tracks.slice(0, COLLAPSED_TRACKS);
  const hidden = group.tracks.length - shown.length;

  /**
   * Playing a search hit queues only this artist's matching tracks, so the
   * results behave like a playlist scoped to the search — not the artist's
   * whole catalog.
   */
  const play = useCallback(
    async (position: number) => {
      setPending(position);
      try {
        const detail = await loadArtistDetail(slug, group.artist.file);
        const meta = {
          artistLabel: detail.name,
          coverUrl: detail.image_url,
          artistSlug: slug,
        };
        const tracks: Track[] = [];
        let startAt = 0;
        group.tracks.forEach((hit, i) => {
          const raw = detail.tracks[hit.localIndex];
          if (!raw) return;
          if (i === position) startAt = tracks.length;
          tracks.push(toTrack(raw, meta));
        });
        if (tracks.length === 0) return;
        clearQueue();
        addToQueue(tracks);
        playTrack(startAt);
      } catch (err) {
        console.error('Could not start search playback:', err);
      } finally {
        setPending(null);
      }
    },
    [addToQueue, clearQueue, group.artist.file, group.tracks, loadArtistDetail, playTrack, slug]
  );

  const isActive = (index: number) =>
    current?.artistSlug === slug && current?.displayName === group.tracks[index].name;

  const header = (
    <div className="flex items-center gap-3 min-w-0">
      <Link
        to={`/artist/${slug}`}
        className="text-[13px] font-medium text-text-primary hover:text-gold transition-colors truncate"
      >
        {group.artist.name}
      </Link>
      <span className="text-[11px] text-text-muted shrink-0 tabular-nums">
        {group.tracks.length} of {totalTracks ?? group.artist.trackCount}
      </span>
      <button
        onClick={() => play(0)}
        className="shrink-0 w-7 h-7 rounded-full bg-gold/15 text-gold flex items-center justify-center hover:bg-gold/25 transition-colors"
        title="Play these matches"
      >
        {pending === 0 ? (
          <Loader2 size={13} className="animate-spin" />
        ) : (
          <Play size={12} className="fill-current ml-0.5" />
        )}
      </button>
    </div>
  );

  const showMore = hidden > 0 && (
    <button
      onClick={() => setExpanded(true)}
      className="mt-2 text-xs text-text-secondary hover:text-gold transition-colors"
    >
      Show {hidden} more from this artist
    </button>
  );

  if (viewMode === 'list') {
    return (
      <section className="border-b border-border/60">
        <div className="px-4 md:px-5 py-3 bg-panel/40">{header}</div>
        {shown.map((hit, i) => (
          <TrackItem
            key={`${hit.localIndex}-${i}`}
            variant="row"
            number={i + 1}
            title={hit.name}
            highlight={tokens}
            isActive={isActive(i)}
            isPlaying={isPlaying}
            onClick={() => play(i)}
            trailing={
              pending === i ? (
                <Loader2 size={14} className="animate-spin text-text-muted mr-2" />
              ) : undefined
            }
          />
        ))}
        {hidden > 0 && <div className="px-4 md:px-5 pb-3">{showMore}</div>}
      </section>
    );
  }

  return (
    <section className="border-b border-border/60 px-4 md:px-5 py-4">
      {/* Mobile: artist header above a 2-up card grid. */}
      <div className="md:hidden">
        {header}
        <div className="grid grid-cols-2 gap-2 mt-3">
          {shown.map((hit, i) => (
            <TrackItem
              key={`${hit.localIndex}-${i}`}
              variant="card"
              title={hit.name}
              highlight={tokens}
              isActive={isActive(i)}
              isPlaying={isPlaying}
              onClick={() => play(i)}
            />
          ))}
        </div>
        {showMore}
      </div>

      {/* Desktop: artist card on the left, matching tracks filling the row. */}
      <div className="hidden md:flex gap-5">
        <div className="w-44 shrink-0">
          <ArtistCard
            artist={artist ?? { name: group.artist.name, slug, url: '' }}
            enabled={enabled}
            imageUrl={imageUrl}
            trackCount={totalTracks ?? group.artist.trackCount}
            isFavorite={isFavorite}
          />
        </div>
        <div className="flex-1 min-w-0">
          {header}
          <div
            className="grid gap-2 mt-3"
            style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))' }}
          >
            {shown.map((hit, i) => (
              <TrackItem
                key={`${hit.localIndex}-${i}`}
                variant="card"
                title={hit.name}
                highlight={tokens}
                isActive={isActive(i)}
                isPlaying={isPlaying}
                onClick={() => play(i)}
              />
            ))}
          </div>
          {showMore}
        </div>
      </div>
    </section>
  );
}
