import { create } from 'zustand';
import type { Track } from '../types';
import { downloadTrack, downloadTracksAsZip } from '../lib/download';

export type SingleStatus = 'downloading' | 'done' | 'error';
export type BatchStatus = 'downloading' | 'zipping' | 'done' | 'error' | 'cancelled';

interface SingleJob {
  name: string;
  status: SingleStatus;
}

interface BatchJob {
  label: string;
  total: number;
  done: number;
  currentName: string;
  status: BatchStatus;
  failedCount: number;
}

interface DownloadState {
  single: SingleJob | null;
  batch: BatchJob | null;
}

interface DownloadActions {
  downloadSingle: (track: Track) => Promise<void>;
  downloadZip: (tracks: Track[], label: string, zipFilename: string) => Promise<void>;
  cancelBatch: () => void;
  dismissBatch: () => void;
  dismissSingle: () => void;
}

let _batchAbort: AbortController | null = null;
let _singleTimer: ReturnType<typeof setTimeout> | null = null;

export const useDownloadStore = create<DownloadState & DownloadActions>()((set, get) => ({
  single: null,
  batch: null,

  downloadSingle: async (track) => {
    if (_singleTimer) {
      clearTimeout(_singleTimer);
      _singleTimer = null;
    }
    const name = track.displayName || track.name;
    set({ single: { name, status: 'downloading' } });
    try {
      await downloadTrack(track);
      set({ single: { name, status: 'done' } });
    } catch {
      set({ single: { name, status: 'error' } });
    } finally {
      _singleTimer = setTimeout(() => set({ single: null }), 3500);
    }
  },

  downloadZip: async (tracks, label, zipFilename) => {
    if (tracks.length === 0 || get().batch) return;
    _batchAbort = new AbortController();
    set({
      batch: { label, total: tracks.length, done: 0, currentName: '', status: 'downloading', failedCount: 0 },
    });
    try {
      const result = await downloadTracksAsZip(tracks, zipFilename, {
        signal: _batchAbort.signal,
        concurrency: 3,
        onProgress: ({ done, total, currentName }) => {
          const b = get().batch;
          if (!b) return;
          set({
            batch: {
              ...b,
              done,
              total,
              currentName,
              status: done >= total ? 'zipping' : 'downloading',
            },
          });
        },
      });
      const b = get().batch;
      if (!b) return;
      set({
        batch: {
          ...b,
          status: result.succeeded === 0 ? 'error' : 'done',
          done: b.total,
          failedCount: result.failed.length,
        },
      });
    } catch (e) {
      const b = get().batch;
      if (!b) return;
      set({ batch: { ...b, status: (e as Error)?.name === 'AbortError' ? 'cancelled' : 'error' } });
    } finally {
      _batchAbort = null;
    }
  },

  cancelBatch: () => {
    _batchAbort?.abort();
  },

  dismissBatch: () => {
    _batchAbort?.abort();
    _batchAbort = null;
    set({ batch: null });
  },

  dismissSingle: () => {
    if (_singleTimer) {
      clearTimeout(_singleTimer);
      _singleTimer = null;
    }
    set({ single: null });
  },
}));
