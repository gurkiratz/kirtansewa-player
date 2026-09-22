import { useNavigate } from 'react-router-dom';
import { Bookmark } from 'lucide-react';
import { ArtistCard } from '../ArtistCard';
import type { Artist } from '../../types';

export interface ArtistViewProps {
  artists: Artist[];
  scrapedSlugs: Set<string>;
  imageUrls: Map<string, string | null>;
  trackCounts: Map<string, number>;
  favoriteSet: Set<string>;
  className?: string;
}

/** Responsive card grid — 2 columns on mobile, auto-fill on desktop. */
export function ArtistGridView({
  artists,
  scrapedSlugs,
  imageUrls,
  trackCounts,
  favoriteSet,
  className = '',
}: ArtistViewProps) {
  const cards = artists.map((artist) => (
    <ArtistCard
      key={artist.slug}
      artist={artist}
      enabled={scrapedSlugs.has(artist.slug)}
      imageUrl={imageUrls.get(artist.slug)}
      trackCount={trackCounts.get(artist.slug)}
      isFavorite={favoriteSet.has(artist.slug)}
    />
  ));

  return (
    <div className={className}>
      <div className="md:hidden grid grid-cols-2 gap-3 p-3">{cards}</div>
      <div
        className="hidden md:grid p-5 gap-4"
        style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))' }}
      >
        {cards}
      </div>
    </div>
  );
}

function ArtistListRow({
  artist,
  enabled,
  isFavorite,
  dense,
}: {
  artist: Artist;
  enabled: boolean;
  isFavorite: boolean;
  dense?: boolean;
}) {
  const navigate = useNavigate();

  return (
    <button
      onClick={() => enabled && navigate(`/artist/${artist.slug}`)}
      disabled={!enabled}
      className={`w-full flex items-center gap-3 text-left border-b border-border/60 text-sm transition-colors
        ${dense ? 'px-2 py-2.5 rounded-sm' : 'px-4 py-3.5'}
        ${
          enabled
            ? `text-text-primary ${dense ? 'hover:bg-white/5' : 'active:bg-white/5'}`
            : `text-text-muted cursor-not-allowed ${dense ? 'opacity-60' : ''}`
        }
      `}
    >
      <span className="flex-1 truncate">{artist.name}</span>
      {isFavorite && (
        <Bookmark size={11} className="text-text-muted fill-current shrink-0" aria-label="Favorite" />
      )}
    </button>
  );
}

/** Flat name list on mobile, newspaper columns on desktop. */
export function ArtistListView({
  artists,
  scrapedSlugs,
  favoriteSet,
  className = '',
}: ArtistViewProps) {
  const rows = (dense: boolean) =>
    artists.map((artist) => (
      <li key={artist.slug} style={dense ? { breakInside: 'avoid' } : undefined}>
        <ArtistListRow
          artist={artist}
          enabled={scrapedSlugs.has(artist.slug)}
          isFavorite={favoriteSet.has(artist.slug)}
          dense={dense}
        />
      </li>
    ));

  return (
    <div className={className}>
      <ul className="md:hidden">{rows(false)}</ul>
      <ul
        className="hidden md:block p-5"
        style={{
          columnWidth: '260px',
          columnGap: '2.5rem',
          columnRule: '1px solid rgba(255, 255, 255, 0.06)',
        }}
      >
        {rows(true)}
      </ul>
    </div>
  );
}
