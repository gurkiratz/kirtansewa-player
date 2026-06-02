import type { Track } from '../types';

/** Strip characters that are illegal in filenames across OSes, collapse whitespace. */
export function sanitizeFilename(name: string): string {
  const cleaned = name
    .replace(/[/\\?%*:|"<>]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  return cleaned || 'track';
}

function ensureMp3(name: string): string {
  return /\.mp3$/i.test(name) ? name : `${name}.mp3`;
}

function trackFilename(track: Track): string {
  return ensureMp3(sanitizeFilename(track.displayName || track.name));
}

/** Trigger a browser "Save as" for an in-memory blob via a transient anchor. */
export function triggerBlobDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Revoke after the download has had a chance to start.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Fetch a single track and save it. Throws on network/HTTP/CORS failure. */
export async function downloadTrack(track: Track, signal?: AbortSignal): Promise<void> {
  const res = await fetch(track.url, { signal });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const blob = await res.blob();
  triggerBlobDownload(blob, trackFilename(track));
}

export interface ZipProgress {
  done: number;
  total: number;
  currentName: string;
}

export interface ZipResult {
  succeeded: number;
  failed: { name: string; error: string }[];
}

/**
 * Fetch many tracks (limited concurrency) and bundle them into a single ZIP.
 * JSZip is dynamically imported so it stays out of the main bundle.
 * MP3s are already compressed, so we STORE rather than DEFLATE (faster, less CPU).
 */
export async function downloadTracksAsZip(
  tracks: Track[],
  zipFilename: string,
  opts: { signal?: AbortSignal; concurrency?: number; onProgress?: (p: ZipProgress) => void } = {},
): Promise<ZipResult> {
  const { signal, concurrency = 3, onProgress } = opts;
  const { default: JSZip } = await import('jszip');
  const zip = new JSZip();

  const failed: { name: string; error: string }[] = [];
  let succeeded = 0;
  let done = 0;

  // Keep filenames unique within the archive (duplicate track titles happen).
  const usedNames = new Set<string>();
  const uniqueName = (base: string): string => {
    let name = base;
    let n = 2;
    while (usedNames.has(name.toLowerCase())) {
      name = `${base.replace(/\.mp3$/i, '')} (${n}).mp3`;
      n++;
    }
    usedNames.add(name.toLowerCase());
    return name;
  };

  let cursor = 0;
  const worker = async (): Promise<void> => {
    while (true) {
      if (signal?.aborted) return;
      const i = cursor++;
      if (i >= tracks.length) return;
      const track = tracks[i];
      const displayName = track.displayName || track.name;
      onProgress?.({ done, total: tracks.length, currentName: displayName });
      try {
        const res = await fetch(track.url, { signal });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const blob = await res.blob();
        zip.file(uniqueName(ensureMp3(sanitizeFilename(displayName))), blob);
        succeeded++;
      } catch (e) {
        if (signal?.aborted) return;
        failed.push({ name: displayName, error: (e as Error)?.message ?? String(e) });
      } finally {
        done++;
        onProgress?.({ done, total: tracks.length, currentName: displayName });
      }
    }
  };

  await Promise.all(
    Array.from({ length: Math.min(concurrency, tracks.length) }, () => worker()),
  );

  if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
  if (succeeded === 0) return { succeeded, failed };

  const content = await zip.generateAsync({
    type: 'blob',
    compression: 'STORE',
    streamFiles: true,
  });
  triggerBlobDownload(content, zipFilename);

  return { succeeded, failed };
}
