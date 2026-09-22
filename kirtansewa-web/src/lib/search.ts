/**
 * Client-side search over every artist and track in the catalog (~23k tracks).
 *
 * The whole thing is driven by `public/search-index.json`, which is built at
 * build time by `scripts/build-search-index.mjs`. It is fetched once, lazily —
 * on the first focus/keystroke in the search bar rather than at app start — and
 * then kept in module memory for the rest of the session. Reloads hit the
 * browser HTTP cache, so the payload is paid for at most once per deploy.
 *
 * On top of the raw names we build an inverted index (token -> track ids) with
 * a sorted token list, so a prefix lookup is a binary search + range scan
 * rather than a scan of all 23k names. Query results are memoised in a small
 * LRU so re-typing, backspacing, or switching tabs is free.
 */

export const MIN_QUERY_LENGTH = 3;

const INDEX_URL = '/search-index.json';

interface RawIndex {
  v: number;
  a: { s: string; n: string; f: string; i: string | null }[];
  t: string[][];
}

export interface IndexedArtist {
  slug: string;
  name: string;
  /** Filename inside /artists/ holding this artist's full detail JSON. */
  file: string;
  imageUrl: string | null;
  trackCount: number;
}

export interface TrackHit {
  /** Display name (artist prefix already stripped). */
  name: string;
  /** Index into the artist's own `tracks` array — maps back to a playable URL. */
  localIndex: number;
  score: number;
}

export interface ArtistTrackGroup {
  artist: IndexedArtist;
  tracks: TrackHit[];
  score: number;
}

export interface SearchResult {
  query: string;
  /** Track hits grouped by artist, best artist first. */
  groups: ArtistTrackGroup[];
  trackCount: number;
  artists: IndexedArtist[];
}

export const EMPTY_RESULT: SearchResult = {
  query: '',
  groups: [],
  trackCount: 0,
  artists: [],
};

/* ------------------------------------------------------------------ */
/* Text normalisation                                                  */
/* ------------------------------------------------------------------ */

/** Lowercase, strip accents, and reduce anything non-alphanumeric to a space. */
export function normalize(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/* ------------------------------------------------------------------ */
/* Engine                                                              */
/* ------------------------------------------------------------------ */

interface Postings {
  /** Unique tokens, sorted — enables binary search for a prefix range. */
  tokens: string[];
  /** Ids matching `tokens[i]`, ascending. */
  ids: Int32Array[];
}

interface Engine {
  artists: IndexedArtist[];
  /** Flat, parallel arrays over every track in the catalog. */
  trackName: string[];
  trackNorm: string[];
  trackArtist: Int32Array;
  trackLocal: Int32Array;
  /** Flat track ids belonging to artist i are [artistStart[i], artistStart[i + 1]). */
  artistStart: Int32Array;
  artistNorm: string[];
  trackPostings: Postings;
  artistPostings: Postings;
}

function buildPostings(docs: string[]): Postings {
  const map = new Map<string, number[]>();
  for (let id = 0; id < docs.length; id++) {
    const norm = docs[id];
    if (!norm) continue;
    let seen: Set<string> | null = null;
    for (const token of norm.split(' ')) {
      if (!token) continue;
      // Guard against repeated words in one title inflating the postings list.
      if (seen === null) seen = new Set();
      else if (seen.has(token)) continue;
      seen.add(token);
      const bucket = map.get(token);
      if (bucket) bucket.push(id);
      else map.set(token, [id]);
    }
  }
  const tokens = [...map.keys()].sort();
  const ids = tokens.map((t) => Int32Array.from(map.get(t)!));
  return { tokens, ids };
}

function buildEngine(raw: RawIndex): Engine {
  const artists: IndexedArtist[] = raw.a.map((a, i) => ({
    slug: a.s,
    name: a.n,
    file: a.f,
    imageUrl: a.i,
    trackCount: raw.t[i]?.length ?? 0,
  }));

  const total = raw.t.reduce((n, list) => n + list.length, 0);
  const trackName: string[] = new Array(total);
  const trackNorm: string[] = new Array(total);
  const trackArtist = new Int32Array(total);
  const trackLocal = new Int32Array(total);
  const artistStart = new Int32Array(artists.length + 1);

  let id = 0;
  for (let a = 0; a < raw.t.length; a++) {
    artistStart[a] = id;
    const list = raw.t[a];
    for (let local = 0; local < list.length; local++) {
      trackName[id] = list[local];
      trackNorm[id] = normalize(list[local]);
      trackArtist[id] = a;
      trackLocal[id] = local;
      id++;
    }
  }
  artistStart[artists.length] = id;

  const artistNorm = artists.map((a) => normalize(a.name));

  return {
    artists,
    trackName,
    trackNorm,
    trackArtist,
    trackLocal,
    artistStart,
    artistNorm,
    trackPostings: buildPostings(trackNorm),
    artistPostings: buildPostings(artistNorm),
  };
}

let enginePromise: Promise<Engine> | null = null;
let loadedEngine: Engine | null = null;

/** The engine if it is already in memory — lets a repeat search skip a tick. */
export function getLoadedEngine(): Engine | null {
  return loadedEngine;
}

export function loadSearchEngine(): Promise<Engine> {
  if (!enginePromise) {
    enginePromise = fetch(INDEX_URL)
      .then((res) => {
        if (!res.ok) throw new Error(`search index HTTP ${res.status}`);
        return res.json() as Promise<RawIndex>;
      })
      .then(buildEngine)
      .then((engine) => {
        loadedEngine = engine;
        return engine;
      })
      .catch((err) => {
        // Let a later attempt retry instead of caching the failure forever.
        enginePromise = null;
        throw err;
      });
  }
  return enginePromise;
}

/** Warm the index (and the derived postings) before the user finishes typing. */
export function prefetchSearchIndex(): void {
  if (enginePromise) return;
  const start = () => void loadSearchEngine().catch(() => {});
  if (typeof requestIdleCallback === 'function') requestIdleCallback(start, { timeout: 1500 });
  else setTimeout(start, 0);
}

export function isSearchIndexReady(): boolean {
  return loadedEngine !== null;
}

/* ------------------------------------------------------------------ */
/* Lookup                                                              */
/* ------------------------------------------------------------------ */

/** First index in `tokens` whose value is >= `target`. */
function lowerBound(tokens: string[], target: string): number {
  let lo = 0;
  let hi = tokens.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (tokens[mid] < target) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

/** Ids of every doc holding a token that starts with `prefix`. */
function idsWithPrefix(postings: Postings, prefix: string, into: Set<number>): void {
  const { tokens, ids } = postings;
  const start = lowerBound(tokens, prefix);
  // Tokens are [a-z0-9] only, so ￿ is a safe exclusive upper bound.
  const end = lowerBound(tokens, prefix + '￿');
  for (let i = start; i < end; i++) {
    const bucket = ids[i];
    for (let k = 0; k < bucket.length; k++) into.add(bucket[k]);
  }
}

/**
 * Candidate track ids for one query token: tracks whose title matches it, plus
 * every track of an artist whose name matches it — so "bhai ajit aisey" finds
 * a track titled "Aisey…" by Bhai Ajit even though the title alone lacks "bhai".
 */
function candidatesForToken(engine: Engine, token: string): Set<number> {
  const out = new Set<number>();
  idsWithPrefix(engine.trackPostings, token, out);

  const artistIds = new Set<number>();
  idsWithPrefix(engine.artistPostings, token, artistIds);
  for (const a of artistIds) {
    const from = engine.artistStart[a];
    const to = engine.artistStart[a + 1];
    for (let id = from; id < to; id++) out.add(id);
  }
  return out;
}

function scoreTokens(haystack: string, tokens: string[], weights: { exact: number; prefix: number }): number {
  let score = 0;
  const words = haystack.split(' ');
  for (const token of tokens) {
    let best = 0;
    for (let w = 0; w < words.length; w++) {
      const word = words[w];
      if (word === token) best = Math.max(best, weights.exact + (w === 0 ? 4 : 0));
      else if (word.startsWith(token)) best = Math.max(best, weights.prefix + (w === 0 ? 4 : 0));
    }
    score += best;
  }
  return score;
}

function scoreTrack(engine: Engine, id: number, qNorm: string, tokens: string[]): number {
  const name = engine.trackNorm[id];
  const artistName = engine.artistNorm[engine.trackArtist[id]];
  let score = 0;
  if (name === qNorm) score += 300;
  else if (name.startsWith(qNorm)) score += 160;
  else if (name.includes(qNorm)) score += 70;

  // Searching an artist's name should surface that artist's catalog ahead of a
  // stray title that happens to mention them ("bhai ajit" -> Bhai Ajit Singh,
  // not "Tabla Solo (by Bhai Ajit Singh Mutlashi)" filed under someone else).
  if (artistName.startsWith(qNorm)) score += 150;
  else if (artistName.includes(qNorm)) score += 95;

  score += scoreTokens(name, tokens, { exact: 26, prefix: 18 });
  score += scoreTokens(artistName, tokens, { exact: 12, prefix: 8 });

  // Nudge shorter titles ahead when scores otherwise tie.
  return score - Math.min(name.length, 120) / 200;
}

function scoreArtist(engine: Engine, a: number, qNorm: string, tokens: string[]): number {
  const name = engine.artistNorm[a];
  let score = 0;
  if (name === qNorm) score += 300;
  else if (name.startsWith(qNorm)) score += 160;
  else if (name.includes(qNorm)) score += 70;
  score += scoreTokens(name, tokens, { exact: 26, prefix: 18 });
  return score - Math.min(name.length, 120) / 200;
}

/** Hard ceiling so a one-letter-ish query can't build a giant render tree. */
const MAX_TRACK_HITS = 600;

function runSearch(engine: Engine, query: string): SearchResult {
  const qNorm = normalize(query);
  const tokens = qNorm ? qNorm.split(' ') : [];
  if (tokens.length === 0) return { ...EMPTY_RESULT, query };

  // Intersect per-token candidates, smallest set first.
  const sets = tokens.map((t) => candidatesForToken(engine, t));
  sets.sort((a, b) => a.size - b.size);
  let matched = sets[0];
  for (let i = 1; i < sets.length && matched.size > 0; i++) {
    const other = sets[i];
    const next = new Set<number>();
    for (const id of matched) if (other.has(id)) next.add(id);
    matched = next;
  }

  const scored: { id: number; score: number }[] = [];
  for (const id of matched) {
    scored.push({ id, score: scoreTrack(engine, id, qNorm, tokens) });
  }
  scored.sort((x, y) => y.score - x.score || x.id - y.id);

  const trackCount = scored.length;
  const top = scored.slice(0, MAX_TRACK_HITS);

  const byArtist = new Map<number, ArtistTrackGroup>();
  for (const { id, score } of top) {
    const a = engine.trackArtist[id];
    let group = byArtist.get(a);
    if (!group) {
      group = { artist: engine.artists[a], tracks: [], score };
      byArtist.set(a, group);
    }
    group.tracks.push({ name: engine.trackName[id], localIndex: engine.trackLocal[id], score });
    if (score > group.score) group.score = score;
  }
  const groups = [...byArtist.values()].sort((x, y) => y.score - x.score);

  // Artists tab: 222 entries, a plain scan is cheaper than touching the index.
  const artistScored: { a: number; score: number }[] = [];
  for (let a = 0; a < engine.artists.length; a++) {
    const score = scoreArtist(engine, a, qNorm, tokens);
    if (score > 0) artistScored.push({ a, score });
  }
  artistScored.sort((x, y) => y.score - x.score || x.a - y.a);

  return {
    query,
    groups,
    trackCount,
    artists: artistScored.map(({ a }) => engine.artists[a]),
  };
}

/* ------------------------------------------------------------------ */
/* Query cache                                                         */
/* ------------------------------------------------------------------ */

const CACHE_LIMIT = 60;
const cache = new Map<string, SearchResult>();

export function search(engine: Engine, query: string): SearchResult {
  const key = normalize(query);
  const hit = cache.get(key);
  if (hit) {
    // Refresh recency (Map preserves insertion order).
    cache.delete(key);
    cache.set(key, hit);
    return hit;
  }
  const result = runSearch(engine, query);
  cache.set(key, result);
  if (cache.size > CACHE_LIMIT) cache.delete(cache.keys().next().value!);
  return result;
}

export type { Engine as SearchEngine };
