import { useState } from "react";
import { Heart, ListMusic, Play, Trash2, Music2, Plus } from "lucide-react";
import { useLibraryStore, type Playlist } from "../store/libraryStore";
import { useDataStore } from "../store/dataStore";
import { usePlayerStore } from "../store/playerStore";
import { ArtistCard } from "../components/ArtistCard";
import { ConfirmModal } from "../components/ConfirmModal";
import type { Track } from "../types";

type FavTab = "artists" | "liked";

export function LibraryPage() {
  const [favTab, setFavTab] = useState<FavTab>("artists");
  const playlists = useLibraryStore((s) => s.playlists);
  const createPlaylist = useLibraryStore((s) => s.createPlaylist);
  const deletePlaylist = useLibraryStore((s) => s.deletePlaylist);
  const favoriteArtists = useLibraryStore((s) => s.favoriteArtists);
  const likedTracks = useLibraryStore((s) => s.likedTracks);

  const [showNewPlaylist, setShowNewPlaylist] = useState(false);
  const [newName, setNewName] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<Playlist | null>(null);

  const handleCreatePlaylist = () => {
    const trimmed = newName.trim();
    if (!trimmed) return;
    createPlaylist(trimmed);
    setNewName("");
    setShowNewPlaylist(false);
  };

  return (
    <div className="flex-1 flex flex-col md:overflow-y-auto">
      <div className="px-5 pt-5 pb-0">
        <h1 className="text-text-primary text-xl font-semibold mb-5">
          Your Library
        </h1>
      </div>

      {/* ── PLAYLISTS SECTION ── */}
      <section className="px-5 mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-text-primary text-sm font-semibold uppercase tracking-wider">
            My Playlists
          </h2>
          <button
            onClick={() => setShowNewPlaylist(true)}
            className="text-text-muted hover:text-gold transition-colors"
            title="New playlist"
          >
            <Plus size={16} />
          </button>
        </div>

        {showNewPlaylist && (
          <div className="flex items-center gap-2 mb-3">
            <input
              autoFocus
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleCreatePlaylist();
                if (e.key === "Escape") {
                  setShowNewPlaylist(false);
                  setNewName("");
                }
              }}
              placeholder="Playlist name"
              className="flex-1 bg-surface border border-border rounded-lg px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-gold/60 transition-colors"
            />
            <button
              onClick={handleCreatePlaylist}
              disabled={!newName.trim()}
              className="px-3 py-2 rounded-lg bg-gold text-surface text-sm font-medium hover:bg-gold/85 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Create
            </button>
          </div>
        )}

        {playlists.length === 0 && !showNewPlaylist ? (
          <div className="flex flex-col items-center gap-2 py-8">
            <ListMusic size={28} className="text-text-muted" />
            <p className="text-text-muted text-sm text-center">
              No playlists yet
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-1">
            {playlists.map((pl) => (
              <PlaylistRow
                key={pl.id}
                playlist={pl}
                onDelete={() => setDeleteTarget(pl)}
              />
            ))}
          </div>
        )}
      </section>

      {/* Divider */}
      <div className="border-t border-border mx-5" />

      {/* ── FAVORITES SECTION ── */}
      <section className="px-5 mt-5 flex-1 flex flex-col min-h-0">
        <h2 className="text-text-primary text-sm font-semibold uppercase tracking-wider mb-3">
          Favorites
        </h2>

        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setFavTab("artists")}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
              favTab === "artists"
                ? "bg-gold text-surface"
                : "bg-white/8 text-text-secondary hover:bg-white/12"
            }`}
          >
            Artists
            {favoriteArtists.length > 0 ? ` (${favoriteArtists.length})` : ""}
          </button>
          <button
            onClick={() => setFavTab("liked")}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
              favTab === "liked"
                ? "bg-gold text-surface"
                : "bg-white/8 text-text-secondary hover:bg-white/12"
            }`}
          >
            Liked Tracks
            {likedTracks.length > 0 ? ` (${likedTracks.length})` : ""}
          </button>
        </div>

        <div className="flex-1 pb-5">
          {favTab === "artists" && <FavoriteArtists />}
          {favTab === "liked" && <LikedTracks />}
        </div>
      </section>

      <ConfirmModal
        open={!!deleteTarget}
        title="Delete Playlist"
        message={`Are you sure you want to delete "${
          deleteTarget?.name ?? ""
        }"? This cannot be undone.`}
        confirmLabel="Delete"
        onConfirm={() => {
          if (deleteTarget) deletePlaylist(deleteTarget.id);
          setDeleteTarget(null);
        }}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}

function FavoriteArtists() {
  const favoriteArtists = useLibraryStore((s) => s.favoriteArtists);
  const artists = useDataStore((s) => s.artists);
  const scrapedSlugs = useDataStore((s) => s.scrapedSlugs);
  const imageUrls = useDataStore((s) => s.imageUrls);
  const trackCounts = useDataStore((s) => s.trackCounts);

  const favorited = artists.filter((a) => favoriteArtists.includes(a.slug));

  if (favorited.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-12">
        <Heart size={28} className="text-text-muted" />
        <p className="text-text-muted text-sm text-center max-w-xs">
          No favorite artists yet. Visit an artist page and tap the heart to add
          them here.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
      {favorited.map((artist) => (
        <ArtistCard
          key={artist.slug}
          artist={artist}
          enabled={scrapedSlugs.has(artist.slug)}
          imageUrl={imageUrls.get(artist.slug)}
          trackCount={trackCounts.get(artist.slug)}
        />
      ))}
    </div>
  );
}

function LikedTracks() {
  const likedTracks = useLibraryStore((s) => s.likedTracks);
  const toggleLikedTrack = useLibraryStore((s) => s.toggleLikedTrack);
  const clearQueue = usePlayerStore((s) => s.clearQueue);
  const addToQueue = usePlayerStore((s) => s.addToQueue);
  const playTrack = usePlayerStore((s) => s.playTrack);
  const queue = usePlayerStore((s) => s.queue);
  const currentIndex = usePlayerStore((s) => s.currentIndex);

  if (likedTracks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-12">
        <Heart size={28} className="text-text-muted" />
        <p className="text-text-muted text-sm text-center max-w-xs">
          No liked tracks yet. Use the heart button on tracks in the player or
          queue to like them.
        </p>
      </div>
    );
  }

  const isLikedQueue =
    queue.length === likedTracks.length &&
    likedTracks.every((t, i) => queue[i]?.url === t.url);

  const handlePlayAll = () => {
    clearQueue();
    addToQueue(likedTracks);
    playTrack(0);
  };

  const handleTrackClick = (index: number) => {
    if (isLikedQueue) {
      playTrack(index);
    } else {
      clearQueue();
      addToQueue(likedTracks);
      playTrack(index);
    }
  };

  const activeIndex = isLikedQueue ? currentIndex : -1;

  return (
    <div>
      <button
        onClick={handlePlayAll}
        className="flex items-center gap-2 mb-3 px-4 py-2 rounded-full bg-gold text-surface text-sm font-medium hover:bg-gold/85 transition-colors"
      >
        <Play size={14} className="ml-0.5" />
        Play All
      </button>

      <div className="flex flex-col">
        {likedTracks.map((track, i) => {
          const isActive = i === activeIndex;
          return (
            <LikedTrackRow
              key={track.url}
              track={track}
              index={i}
              isActive={isActive}
              onClick={() => handleTrackClick(i)}
              onUnlike={() => toggleLikedTrack(track)}
            />
          );
        })}
      </div>
    </div>
  );
}

function LikedTrackRow({
  track,
  index,
  isActive,
  onClick,
  onUnlike,
}: {
  track: Track;
  index: number;
  isActive: boolean;
  onClick: () => void;
  onUnlike: () => void;
}) {
  return (
    <div
      className={`flex items-center gap-3 px-3 h-14 transition-colors group cursor-pointer ${
        isActive
          ? "bg-gold/15 border-l-4 border-l-gold"
          : "border-b border-border/50 hover:bg-white/5"
      }`}
    >
      <span
        className={`text-sm w-7 text-center shrink-0 ${
          isActive ? "text-gold" : "text-text-muted"
        }`}
      >
        {index + 1}
      </span>

      <button
        onClick={onClick}
        className="w-9 h-9 shrink-0 rounded-sm overflow-hidden"
      >
        {track.coverUrl ? (
          <img
            src={track.coverUrl}
            alt=""
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-card flex items-center justify-center text-text-muted">
            <Music2 size={14} />
          </div>
        )}
      </button>

      <button onClick={onClick} className="flex-1 min-w-0 text-left">
        <p
          className={`text-[13px] font-medium truncate leading-tight ${
            isActive ? "text-gold" : "text-text-primary"
          }`}
        >
          {track.displayName}
        </p>
        {track.artistLabel && (
          <p className="text-[11px] text-text-secondary truncate leading-tight mt-0.5">
            {track.artistLabel}
          </p>
        )}
      </button>

      <button
        onClick={onUnlike}
        className="text-gold transition-colors shrink-0 opacity-0 group-hover:opacity-100"
        title="Unlike"
      >
        <Heart size={14} className="fill-current" />
      </button>
    </div>
  );
}

function PlaylistRow({
  playlist,
  onDelete,
}: {
  playlist: Playlist;
  onDelete: () => void;
}) {
  const clearQueue = usePlayerStore((s) => s.clearQueue);
  const addToQueue = usePlayerStore((s) => s.addToQueue);
  const playTrack = usePlayerStore((s) => s.playTrack);

  const handlePlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (playlist.tracks.length === 0) return;
    clearQueue();
    addToQueue(playlist.tracks);
    playTrack(0);
  };

  const coverUrl = playlist.tracks[0]?.coverUrl;

  return (
    <div className="flex items-center gap-3 p-3 rounded-lg hover:bg-white/5 transition-colors group">
      <div className="w-12 h-12 rounded-sm bg-card border border-border shrink-0 overflow-hidden flex items-center justify-center">
        {coverUrl ? (
          <img src={coverUrl} alt="" className="w-full h-full object-cover" />
        ) : (
          <ListMusic size={18} className="text-text-muted" />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-text-primary text-sm font-medium truncate">
          {playlist.name}
        </p>
        <p className="text-text-muted text-xs mt-0.5">
          {playlist.tracks.length} tracks
        </p>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={handlePlay}
          disabled={playlist.tracks.length === 0}
          className="w-8 h-8 rounded-full bg-gold/80 flex items-center justify-center text-surface hover:bg-gold disabled:opacity-30 disabled:cursor-not-allowed transition-colors "
          title="Play playlist"
        >
          <Play size={14} className="ml-0.5" />
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="text-text-muted hover:text-red-400 transition-colors p-1.5 "
          title="Delete playlist"
        >
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );
}
