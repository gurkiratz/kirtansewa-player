import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Play,
  Shuffle,
  Heart,
  MoreHorizontal,
  MoreVertical,
  ListPlus,
  Search,
  X,
  Download,
  Check,
} from "lucide-react";
import type { ArtistDetail as ArtistDetailType, Track } from "../types";
import { toTrack, type TrackMeta } from "../types";
import { ArtistImage } from "../components/ArtistImage";
import { usePlayerStore } from "../store/playerStore";
import { useDataStore } from "../store/dataStore";
import { useLibraryStore } from "../store/libraryStore";
import { useDownloadStore } from "../store/downloadStore";

const MAX_SELECT = 50;

export function ArtistDetail() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const artists = useDataStore((s) => s.artists);
  const addToQueue = usePlayerStore((s) => s.addToQueue);
  const clearQueue = usePlayerStore((s) => s.clearQueue);
  const replaceQueue = usePlayerStore((s) => s.replaceQueue);
  const shuffleAndPlay = usePlayerStore((s) => s.shuffleAndPlay);
  const playTrack = usePlayerStore((s) => s.playTrack);
  const isShuffle = usePlayerStore((s) => s.isShuffle);
  const toggleShuffle = usePlayerStore((s) => s.toggleShuffle);
  const favoriteArtists = useLibraryStore((s) => s.favoriteArtists);
  const toggleFavoriteArtist = useLibraryStore((s) => s.toggleFavoriteArtist);
  const openPlaylistModal = useLibraryStore((s) => s.openPlaylistModal);
  const downloadZip = useDownloadStore((s) => s.downloadZip);

  const [detail, setDetail] = useState<ArtistDetailType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [bioExpanded, setBioExpanded] = useState(false);
  const [isShuffled, setIsShuffled] = useState(false);
  const [selectMode, setSelectMode] = useState(false);
  const [selectedUrls, setSelectedUrls] = useState<Set<string>>(new Set());
  const [glowVisible, setGlowVisible] = useState(false);
  const glowTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    if (detail?.image_url) {
      const img = new Image();
      img.src = detail.image_url;
      img.onload = () => {
        glowTimerRef.current = setTimeout(() => setGlowVisible(true), 50);
      };
    } else {
      setGlowVisible(false);
    }
    return () => clearTimeout(glowTimerRef.current);
  }, [detail?.image_url]);

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    setError(false);
    setBioExpanded(false);
    setIsShuffled(false);
    setSelectMode(false);
    setSelectedUrls(new Set());

    const artistIndex = artists.findIndex((a) => a.slug === slug);
    if (artistIndex === -1) {
      setError(true);
      setLoading(false);
      return;
    }

    const filename = `${String(artistIndex + 1).padStart(2, "0")}-${slug}.json`;
    fetch(`/artists/${filename}`)
      .then((r) => {
        if (!r.ok) throw new Error("Not found");
        return r.json();
      })
      .then((data: ArtistDetailType) => {
        setDetail(data);
        setLoading(false);
      })
      .catch(() => {
        setError(true);
        setLoading(false);
      });
  }, [slug, artists]);

  const meta: TrackMeta | undefined = detail
    ? { artistLabel: detail.name, coverUrl: detail.image_url, artistSlug: slug }
    : undefined;

  const handleAddAll = () => {
    if (!detail) return;
    addToQueue(detail.tracks.map((r) => toTrack(r, meta)));
  };

  const handleAddAllToPlaylist = () => {
    if (!detail) return;
    openPlaylistModal(detail.tracks.map((r) => toTrack(r, meta)));
  };

  const isFavorite = slug ? favoriteArtists.includes(slug) : false;

  const handlePlayAll = () => {
    if (!detail) return;
    clearQueue();
    addToQueue(detail.tracks.map((r) => toTrack(r, meta)));
    playTrack(0);
  };

  const handleShuffleAll = () => {
    if (!detail) return;
    const tracks = detail.tracks.map((r) => toTrack(r, meta));
    if (!isShuffled) {
      shuffleAndPlay(tracks);
      setIsShuffled(true);
    } else {
      replaceQueue(tracks);
      if (isShuffle) toggleShuffle();
      playTrack(0);
      setIsShuffled(false);
    }
  };

  const allTracks: Track[] = detail
    ? detail.tracks.map((r) => toTrack(r, meta))
    : [];

  const enterSelectMode = () => {
    setSelectMode(true);
    setSelectedUrls(new Set());
  };

  const exitSelectMode = () => {
    setSelectMode(false);
    setSelectedUrls(new Set());
  };

  const toggleSelect = (url: string) => {
    setSelectedUrls((prev) => {
      const next = new Set(prev);
      if (next.has(url)) next.delete(url);
      else if (next.size < MAX_SELECT) next.add(url);
      return next;
    });
  };

  const selectFirst50 = () => {
    setSelectedUrls(new Set(allTracks.slice(0, MAX_SELECT).map((t) => t.url)));
  };

  const clearSelect = () => setSelectedUrls(new Set());

  const downloadSelected = () => {
    if (!detail) return;
    const chosen = allTracks.filter((t) => selectedUrls.has(t.url));
    if (chosen.length === 0) return;
    downloadZip(chosen, detail.name, `${slug ?? "kirtan"}-${chosen.length}-tracks.zip`);
    exitSelectMode();
  };

  const selectProps = {
    selectMode,
    selectedUrls,
    onToggleSelect: toggleSelect,
    onSelectAll: selectFirst50,
    onClearSelect: clearSelect,
    onExitSelectMode: exitSelectMode,
    onDownloadSelected: downloadSelected,
    selectableCount: Math.min(MAX_SELECT, allTracks.length),
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center text-text-muted text-sm">
        Loading...
      </div>
    );
  }

  if (error || !detail) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-4">
        <p className="text-text-muted">Artist not found or not yet scraped.</p>
        <button
          onClick={() => navigate("/")}
          className="text-gold text-sm hover:underline"
        >
          ← Back to artists
        </button>
      </div>
    );
  }

  const hasBio = detail.body.length > 0;

  return (
    // Mobile: vertical scroll. Desktop: horizontal flex with independent panel scrolls.
    <div className="relative flex-1 flex flex-col md:flex-row overflow-y-auto md:overflow-hidden">
      {/* Blurred album art background glow — spans entire page */}
      {detail.image_url && (
        <div
          className={`absolute inset-x-0 top-0 h-[40%] overflow-hidden pointer-events-none z-0 transition-opacity duration-1000 ease-out ${
            glowVisible ? "opacity-100" : "opacity-0"
          }`}
          aria-hidden="true"
        >
          <div
            className="absolute -inset-1/2 w-[200%] h-[200%] opacity-35 blur-[120px] saturate-150 scale-125"
            style={{
              backgroundImage: `url(${detail.image_url})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-surface/50 to-surface" />
        </div>
      )}

      {/* ── LEFT / INFO PANEL ── */}
      <div className="relative z-10 w-full md:w-96 md:shrink-0 md:border-r border-border md:overflow-y-auto">
        <div className="p-5 md:p-6">
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-2 text-text-primary/70 hover:text-text-primary text-sm transition-colors mb-5 p-1.5"
          >
            <ArrowLeft size={14} />
            All artists
          </button>

          {/* Thumbnail on mobile, full-width square on desktop */}
          <div className="flex items-start gap-4 mb-4 md:block">
            <div className="w-24 h-24 md:w-full md:h-auto md:aspect-square shrink-0 rounded-sm overflow-hidden">
              <ArtistImage
                src={detail.image_url}
                name={detail.name}
                className="w-full h-full text-xl md:text-5xl font-bold"
              />
            </div>
            {/* Name + track count beside thumbnail on mobile */}
            <div className="md:hidden">
              <h1 className="text-text-primary text-lg font-bold leading-snug">
                {detail.name}
              </h1>
              <p className="text-text-primary/80 text-xs mt-0.5">
                {detail.tracks.length} tracks
              </p>
            </div>
          </div>

          {/* Name + track count below image on desktop */}
          <h1 className="hidden md:block text-text-primary text-xl font-semibold mb-1">
            {detail.name}
          </h1>
          <p className="hidden md:block text-text-primary/80 text-xs mb-4">
            {detail.tracks.length} tracks
          </p>

          <div className="flex items-center gap-3 mb-5 mt-4 md:mt-0">
            <button
              onClick={handlePlayAll}
              className="w-10 h-10 rounded-full bg-gold flex items-center justify-center text-surface hover:bg-gold/85 transition-colors"
              title="Play all"
            >
              <Play size={18} className="mx-0.5" />
            </button>

            <button
              onClick={handleShuffleAll}
              className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
                isShuffled
                  ? "bg-gold text-surface hover:bg-gold/85"
                  : "border border-border text-text-secondary hover:text-text-primary hover:border-text-secondary"
              }`}
              title={isShuffled ? "Unshuffle" : "Shuffle all"}
            >
              <Shuffle size={17} />
            </button>
            <button
              onClick={handleAddAllToPlaylist}
              className="w-9 h-9 rounded-full border border-border flex items-center justify-center text-text-secondary hover:text-text-primary hover:border-text-secondary transition-colors"
              title="Add all to playlist"
            >
              <ListPlus size={18} />
            </button>
            <button
              onClick={() => slug && toggleFavoriteArtist(slug)}
              className={`w-9 h-9 rounded-full border flex items-center justify-center transition-colors ${
                isFavorite
                  ? "border-gold bg-gold/15 text-gold"
                  : "border-border text-text-secondary hover:text-text-primary hover:border-text-secondary"
              }`}
              aria-label={
                isFavorite ? "Remove from favorites" : "Add to favorites"
              }
              title={isFavorite ? "Remove from favorites" : "Add to favorites"}
            >
              <Heart size={16} className={isFavorite ? "fill-current" : ""} />
            </button>
            <button
              onClick={() => (selectMode ? exitSelectMode() : enterSelectMode())}
              className={`w-9 h-9 rounded-full border flex items-center justify-center transition-colors ${
                selectMode
                  ? "border-gold bg-gold/15 text-gold"
                  : "border-border text-text-secondary hover:text-text-primary hover:border-text-secondary"
              }`}
              aria-label="Select tracks to download"
              title="Download tracks"
            >
              <Download size={16} />
            </button>
            <button
              onClick={handleAddAll}
              className="w-9 h-9 rounded-full border border-border flex items-center justify-center text-text-secondary hover:text-text-primary hover:border-text-secondary transition-colors hidden"
              title="Add all to queue"
            >
              <MoreHorizontal size={16} />
            </button>
          </div>

          {/* Bio: clamped on mobile, full on desktop */}
          {hasBio && (
            <div>
              {/* Mobile: 3-line clamp + toggle */}
              <div className="md:hidden">
                <div
                  className={`text-text-secondary text-[13px] leading-relaxed space-y-2 ${
                    bioExpanded ? "" : "line-clamp-3"
                  }`}
                >
                  {detail.body.map((para, i) => (
                    <p key={i}>{para}</p>
                  ))}
                </div>
                <button
                  onClick={() => setBioExpanded((v) => !v)}
                  className="text-gold text-xs mt-2 hover:underline"
                >
                  {bioExpanded ? "Read less" : "Read more"}
                </button>
              </div>

              {/* Desktop: full text */}
              <div className="hidden md:block text-text-secondary text-[13px] leading-relaxed space-y-2">
                {detail.body.map((para, i) => (
                  <p key={i}>{para}</p>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* On mobile, render tracks inline below the info */}
        <div className="md:hidden border-t border-border">
          <TrackSection detail={detail} meta={meta} {...selectProps} />
        </div>
      </div>

      {/* ── MIDDLE: TRACKS (desktop only) ── */}
      <div className="relative z-10 hidden md:flex flex-1 flex-col overflow-hidden">
        <TrackSection detail={detail} meta={meta} {...selectProps} />
      </div>
    </div>
  );
}

interface SelectProps {
  selectMode: boolean;
  selectedUrls: Set<string>;
  selectableCount: number;
  onToggleSelect: (url: string) => void;
  onSelectAll: () => void;
  onClearSelect: () => void;
  onExitSelectMode: () => void;
  onDownloadSelected: () => void;
}

function TrackSection({
  detail,
  meta,
  selectMode,
  selectedUrls,
  selectableCount,
  onToggleSelect,
  onSelectAll,
  onClearSelect,
  onExitSelectMode,
  onDownloadSelected,
}: {
  detail: ArtistDetailType;
  meta?: TrackMeta;
} & SelectProps) {
  const clearQueue = usePlayerStore((s) => s.clearQueue);
  const addToQueue = usePlayerStore((s) => s.addToQueue);
  const playTrack = usePlayerStore((s) => s.playTrack);
  const queue = usePlayerStore((s) => s.queue);
  const currentIndex = usePlayerStore((s) => s.currentIndex);
  const downloadSingle = useDownloadStore((s) => s.downloadSingle);

  const [query, setQuery] = useState("");

  const allTracks = detail.tracks.map((r) => toTrack(r, meta));

  const artistTrackUrls = new Set(allTracks.map((t) => t.url));
  const isThisArtistQueue =
    queue.length === allTracks.length &&
    queue.every((t) => artistTrackUrls.has(t.url));

  const currentTrackUrl = currentIndex >= 0 ? queue[currentIndex]?.url : null;
  const activeIndex = isThisArtistQueue && currentTrackUrl
    ? allTracks.findIndex((t) => t.url === currentTrackUrl)
    : -1;

  const handleTrackClick = (index: number) => {
    if (isThisArtistQueue) {
      const clickedUrl = allTracks[index].url;
      const queueIndex = queue.findIndex((t) => t.url === clickedUrl);
      playTrack(queueIndex >= 0 ? queueIndex : index);
    } else {
      clearQueue();
      addToQueue(allTracks);
      playTrack(index);
    }
  };

  const selectedCount = selectedUrls.size;
  const allSelected = selectedCount > 0 && selectedCount >= selectableCount;
  const atMax = selectedCount >= MAX_SELECT;

  const q = query.trim().toLowerCase();
  const visibleTracks = q
    ? allTracks
        .map((track, i) => ({ track, i }))
        .filter(({ track }) => track.displayName.toLowerCase().includes(q))
    : allTracks.map((track, i) => ({ track, i }));

  return (
    <>
      {/* Selection toolbar (download mode) */}
      {selectMode && (
        <div className="flex items-center gap-2 px-5 py-2.5 border-b border-border bg-gold/5">
          <span className="text-[13px] text-text-primary font-medium tabular-nums">
            {selectedCount} selected
          </span>
          <span className="text-[11px] text-text-muted">max {MAX_SELECT}</span>
          <div className="flex-1" />
          <button
            onClick={allSelected ? onClearSelect : onSelectAll}
            className="text-xs text-text-secondary hover:text-text-primary transition-colors px-2 py-1.5"
          >
            {allSelected ? "Clear" : "Select all"}
          </button>
          <button
            onClick={onDownloadSelected}
            disabled={selectedCount === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gold text-surface text-xs font-medium hover:bg-gold/85 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <Download size={13} />
            Download
          </button>
          <button
            onClick={onExitSelectMode}
            className="text-text-muted hover:text-text-primary transition-colors p-1"
            aria-label="Exit selection"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Search */}
      <div className="px-5 pt-3 pb-2 border-b border-border/50">
        <div className="relative">
          <Search
            size={13}
            className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-primary/40 pointer-events-none"
          />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search tracks..."
            className="w-full bg-white/5 border border-border rounded-sm pl-8 pr-8 py-1.5 text-[13px] text-text-primary placeholder:text-text-primary/40 focus:outline-none focus:border-text-secondary transition-colors"
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-text-primary/40 hover:text-text-primary"
              aria-label="Clear search"
            >
              <X size={13} />
            </button>
          )}
        </div>
      </div>

      {/* Column header */}
      <div className="flex items-center gap-3 px-5 py-2.5 border-b border-border text-[11px] text-text-primary uppercase tracking-wider">
        <span className="w-8 text-center shrink-0">#</span>
        <span className="flex-1">Title</span>
      </div>

      <div className="md:flex-1 md:overflow-y-auto">
        {visibleTracks.length === 0 && (
          <div className="text-center text-text-muted text-sm py-10">
            No tracks match "{query}"
          </div>
        )}
        {visibleTracks.map(({ track, i }) => {
          const isActive = i === activeIndex;
          const isSelected = selectedUrls.has(track.url);
          const selectDisabled = selectMode && !isSelected && atMax;
          return (
            <div
              key={i}
              className={`
                w-full flex items-center gap-3 px-5 h-14 transition-colors group
                ${
                  selectMode && isSelected
                    ? "bg-gold/10 border-b border-border/50"
                    : isActive && !selectMode
                      ? "bg-gold/15 border-l-4 border-l-gold"
                      : "border-b border-border/50 hover:bg-white/5"
                }
              `}
            >
              <button
                onClick={() =>
                  selectMode ? onToggleSelect(track.url) : handleTrackClick(i)
                }
                disabled={selectDisabled}
                className={`flex-1 min-w-0 flex items-center gap-3 h-full text-left ${
                  selectDisabled ? "cursor-not-allowed opacity-40" : "cursor-pointer"
                }`}
              >
                {selectMode ? (
                  <span className="w-8 flex items-center justify-center shrink-0">
                    <span
                      className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${
                        isSelected
                          ? "bg-gold border-gold text-surface"
                          : "border-text-muted"
                      }`}
                    >
                      {isSelected && <Check size={13} strokeWidth={3} />}
                    </span>
                  </span>
                ) : (
                  <span
                    className={`text-sm w-8 text-center shrink-0 ${
                      isActive ? "text-gold" : "text-text-primary/50"
                    }`}
                  >
                    {i + 1}
                  </span>
                )}
                <div className="flex-1 min-w-0">
                  <p
                    className={`text-[13px] font-medium truncate leading-tight ${
                      isActive && !selectMode ? "text-gold" : "text-text-primary"
                    }`}
                  >
                    {track.displayName}
                  </p>
                  {track.artistLabel && (
                    <p className="text-[11px] text-text-secondary truncate leading-tight mt-0.5">
                      {track.artistLabel}
                    </p>
                  )}
                </div>
              </button>
              {!selectMode && (
                <RowMenu onDownload={() => downloadSingle(track)} />
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}

function RowMenu({ onDownload }: { onDownload: () => void }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);

  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    // Close on any scroll so the fixed popover never detaches from its button.
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
    };
  }, [open, close]);

  const toggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (open) {
      setOpen(false);
      return;
    }
    const r = btnRef.current?.getBoundingClientRect();
    if (!r) return;
    const MENU_W = 176;
    const MENU_H = 48;
    const placeAbove = window.innerHeight - r.bottom < MENU_H + 12;
    setPos({
      top: placeAbove ? r.top - MENU_H - 4 : r.bottom + 4,
      left: Math.max(8, r.right - MENU_W),
    });
    setOpen(true);
  };

  return (
    <>
      <button
        ref={btnRef}
        onClick={toggle}
        className={`shrink-0 p-1.5 -mr-1.5 rounded-full transition-colors opacity-100 md:opacity-0 md:group-hover:opacity-100 focus:opacity-100 ${
          open
            ? "text-text-primary bg-white/10 md:opacity-100"
            : "text-text-muted hover:text-text-primary hover:bg-white/10"
        }`}
        aria-label="Track options"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <MoreVertical size={16} />
      </button>
      {open &&
        pos &&
        createPortal(
          <>
            <div className="fixed inset-0 z-60" onClick={() => setOpen(false)} />
            <div
              role="menu"
              style={{ top: pos.top, left: pos.left }}
              className="fixed z-61 w-44 bg-card border border-border rounded-lg shadow-2xl py-1 animate-in"
            >
              <button
                role="menuitem"
                onClick={() => {
                  setOpen(false);
                  onDownload();
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-left text-[13px] text-text-primary hover:bg-white/5 transition-colors"
              >
                <Download size={15} className="text-text-secondary" />
                Download
              </button>
            </div>
          </>,
          document.body,
        )}
    </>
  );
}
