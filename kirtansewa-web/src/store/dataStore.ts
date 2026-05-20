import { create } from 'zustand';
import type { Artist } from '../types';

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

export const useDataStore = create<DataStore>((set) => ({
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
}));
