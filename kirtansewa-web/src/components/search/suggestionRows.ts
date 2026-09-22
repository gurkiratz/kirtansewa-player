import type { SearchResult } from '../../lib/search';

export type SearchTab = 'tracks' | 'artists';

export type SuggestionRow =
  /** Artist heading above a group of track hits — not selectable. */
  | { kind: 'group'; slug: string; artistName: string }
  | { kind: 'track'; slug: string; artistName: string; name: string; localIndex: number }
  | { kind: 'more'; slug: string; artistName: string; remaining: number }
  | { kind: 'artist'; slug: string; artistName: string; trackCount: number }
  | { kind: 'all'; query: string };

/** Artists shown in the dropdown before "see all results". */
const MAX_GROUPS = 6;
const MAX_ARTISTS = 10;
/** Tracks shown per artist, and how many each "load more" adds. */
export const TRACKS_PER_GROUP = 3;
export const LOAD_MORE_STEP = 6;

export function isSelectable(row: SuggestionRow): boolean {
  return row.kind !== 'group';
}

/**
 * Flattens a SearchResult into the exact row sequence the dropdown renders.
 * Keyboard navigation and rendering both read this one list, so the highlighted
 * row can never drift from what is on screen.
 */
export function buildSuggestionRows(
  result: SearchResult,
  tab: SearchTab,
  /** slug -> how many tracks that group currently shows. */
  expanded: Record<string, number>
): SuggestionRow[] {
  const rows: SuggestionRow[] = [];

  if (tab === 'artists') {
    for (const artist of result.artists.slice(0, MAX_ARTISTS)) {
      rows.push({
        kind: 'artist',
        slug: artist.slug,
        artistName: artist.name,
        trackCount: artist.trackCount,
      });
    }
  } else {
    for (const group of result.groups.slice(0, MAX_GROUPS)) {
      const slug = group.artist.slug;
      const limit = expanded[slug] ?? TRACKS_PER_GROUP;
      rows.push({ kind: 'group', slug, artistName: group.artist.name });
      for (const track of group.tracks.slice(0, limit)) {
        rows.push({
          kind: 'track',
          slug,
          artistName: group.artist.name,
          name: track.name,
          localIndex: track.localIndex,
        });
      }
      const remaining = group.tracks.length - limit;
      if (remaining > 0) {
        rows.push({ kind: 'more', slug, artistName: group.artist.name, remaining });
      }
    }
  }

  if (rows.length > 0) rows.push({ kind: 'all', query: result.query });
  return rows;
}
