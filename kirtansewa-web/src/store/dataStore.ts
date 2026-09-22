import { create } from 'zustand';
import type { Artist, ArtistDetail } from '../types';

interface ManifestEntry {
  slug: string;
  image_url: string | null;
  track_count: number;
}

interface DataStore {
  artists: Artist[];
  scrapedSlugs: Set<string>;
  imageUrls: Map<string, string | null>;
  trackCounts: Map<string, number>;
  loading: boolean;
  fetchAll: () => Promise<void>;
  /**
   * Fetch one artist's detail JSON, de-duplicated and memoised for the session.
   * `fileHint` skips the artists.json position lookup when the caller already
   * knows the filename (the search index carries it).
   */
  loadArtistDetail: (slug: string, fileHint?: string) => Promise<ArtistDetail>;
}

/**
 * Detail files are named "{1-based position in artists.json}-{slug}.json".
 * Kept out of the store so in-flight promises survive store updates.
 */
const detailCache = new Map<string, Promise<ArtistDetail>>();

export function artistDetailFilename(artists: Artist[], slug: string): string | null {
  const index = artists.findIndex((a) => a.slug === slug);
  if (index === -1) return null;
  return `${String(index + 1).padStart(2, '0')}-${slug}.json`;
}

const ARTISTS_KEY = 'ks:v1:artists';
const MANIFEST_KEY = 'ks:v1:manifest';

function readCache<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function writeCache(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // quota or disabled storage — ignore
  }
}

function deriveFromManifest(manifest: ManifestEntry[]) {
  return {
    scrapedSlugs: new Set(manifest.map((e) => e.slug)),
    imageUrls: new Map(manifest.map((e) => [e.slug, e.image_url])),
    trackCounts: new Map(manifest.map((e) => [e.slug, e.track_count])),
  };
}

export const useDataStore = create<DataStore>((set, get) => ({
  artists: [],
  scrapedSlugs: new Set(),
  imageUrls: new Map(),
  trackCounts: new Map(),
  loading: false,

  fetchAll: async () => {
    const cachedArtists = readCache<Artist[]>(ARTISTS_KEY);
    const cachedManifest = readCache<ManifestEntry[]>(MANIFEST_KEY);
    const hasCache = cachedArtists && cachedManifest;

    if (hasCache) {
      set({ artists: cachedArtists, ...deriveFromManifest(cachedManifest), loading: false });
    } else {
      set({ loading: true });
    }

    try {
      const [artistsRes, manifestRes] = await Promise.all([
        fetch('/artists.json'),
        fetch('/artists/manifest.json'),
      ]);
      const artists: Artist[] = await artistsRes.json();
      const manifest: ManifestEntry[] = await manifestRes.json();
      set({ artists, ...deriveFromManifest(manifest), loading: false });
      writeCache(ARTISTS_KEY, artists);
      writeCache(MANIFEST_KEY, manifest);
    } catch (err) {
      console.error('Failed to load data:', err);
      if (!hasCache) set({ loading: false });
    }
  },

  loadArtistDetail: (slug, fileHint) => {
    const cached = detailCache.get(slug);
    if (cached) return cached;

    const file = fileHint ?? artistDetailFilename(get().artists, slug);
    if (!file) return Promise.reject(new Error(`Unknown artist: ${slug}`));

    const promise = fetch(`/artists/${file}`)
      .then((res) => {
        if (!res.ok) throw new Error(`Artist detail HTTP ${res.status}`);
        return res.json() as Promise<ArtistDetail>;
      })
      .catch((err) => {
        detailCache.delete(slug);
        throw err;
      });

    detailCache.set(slug, promise);
    return promise;
  },
}));
