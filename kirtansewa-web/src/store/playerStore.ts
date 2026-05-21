import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Track } from '../types';

export type RepeatMode = 'none' | 'one' | 'all';

interface PlayerState {
  queue: Track[];
  currentIndex: number;
  isPlaying: boolean;
  isShuffle: boolean;
  repeatMode: RepeatMode;
  volume: number;
  seek: number;
  seekSeconds: number;
  duration: number;
  isMuted: boolean;
  isQueueSheetOpen: boolean;
  isBuffering: boolean;
}

interface PlayerActions {
  addToQueue: (tracks: Track[]) => void;
  clearQueue: () => void;
  replaceQueue: (tracks: Track[]) => void;
  trimQueueToCurrent: () => void;
  removeFromQueue: (index: number) => void;
  playTrack: (index: number) => void;
  togglePlay: () => void;
  next: () => void;
  prev: () => void;
  seekTo: (ratio: number) => void;
  skip: (seconds: number) => void;
  setVolume: (vol: number) => void;
  toggleMute: () => void;
  toggleShuffle: () => void;
  cycleRepeat: () => void;
  reorderQueue: (from: number, to: number) => void;
  toggleQueueSheet: () => void;
  initFromPersistedState: () => void;
  _tick: () => void;
}

type PlayerStore = PlayerState & PlayerActions;

let _audio: HTMLAudioElement | null = null;
let _rafId: number | null = null;

function cancelRaf() {
  if (_rafId !== null) {
    cancelAnimationFrame(_rafId);
    _rafId = null;
  }
}

function startRaf(tick: () => void) {
  cancelRaf();
  const loop = () => {
    tick();
    _rafId = requestAnimationFrame(loop);
  };
  _rafId = requestAnimationFrame(loop);
}

function teardownAudio() {
  cancelRaf();
  if (_audio) {
    _audio.pause();
    _audio.removeAttribute('src');
    _audio.load();
    _audio = null;
  }
}

export const usePlayerStore = create<PlayerStore>()(
  persist(
    (set, get) => {
      function attachListeners(audio: HTMLAudioElement, autoplay: boolean) {
        audio.addEventListener('loadedmetadata', () => {
          set({ duration: audio.duration || 0 });
        });
        audio.addEventListener('durationchange', () => {
          set({ duration: audio.duration || 0 });
        });
        audio.addEventListener('play', () => {
          set({ isPlaying: true });
          startRaf(get()._tick);
        });
        audio.addEventListener('pause', () => {
          cancelRaf();
          set({ isPlaying: false, isBuffering: false });
        });
        audio.addEventListener('ended', () => {
          cancelRaf();
          set({ isPlaying: false, isBuffering: false });
          get().next();
        });
        audio.addEventListener('waiting', () => {
          set({ isBuffering: true });
        });
        audio.addEventListener('stalled', () => {
          set({ isBuffering: true });
        });
        audio.addEventListener('playing', () => {
          set({ isBuffering: false });
        });
        audio.addEventListener('canplay', () => {
          set({ isBuffering: false });
        });
        audio.addEventListener('error', () => {
          console.error('Audio load error:', audio.error);
          set({ isBuffering: false });
        });
        if (autoplay) {
          const playPromise = audio.play();
          if (playPromise && typeof playPromise.catch === 'function') {
            playPromise.catch((err) => console.error('Playback failed:', err));
          }
        }
      }

      return {
        queue: [],
        currentIndex: -1,
        isPlaying: false,
        isShuffle: false,
        repeatMode: 'none',
        volume: 1,
        seek: 0,
        seekSeconds: 0,
        duration: 0,
        isMuted: false,
        isQueueSheetOpen: false,
        isBuffering: false,

        addToQueue: (tracks) => {
          const { queue } = get();
          set({ queue: [...queue, ...tracks] });
        },

        clearQueue: () => {
          teardownAudio();
          set({ queue: [], currentIndex: -1, isPlaying: false, seek: 0, seekSeconds: 0, duration: 0, isBuffering: false });
        },

        replaceQueue: (tracks) => {
          const { queue, currentIndex } = get();
          const currentUrl = currentIndex >= 0 ? queue[currentIndex]?.url : null;
          const newIndex = currentUrl ? tracks.findIndex((t) => t.url === currentUrl) : -1;
          set({ queue: tracks, currentIndex: newIndex });
        },

        trimQueueToCurrent: () => {
          const { queue, currentIndex } = get();
          if (currentIndex < 0 || queue.length === 0) {
            get().clearQueue();
            return;
          }
          set({ queue: [queue[currentIndex]], currentIndex: 0 });
        },

        removeFromQueue: (index) => {
          const { queue, currentIndex } = get();
          if (index < 0 || index >= queue.length) return;

          if (queue.length === 1) {
            get().clearQueue();
            return;
          }

          const next = [...queue];
          next.splice(index, 1);

          if (index === currentIndex) {
            const newIndex = Math.min(index, next.length - 1);
            set({ queue: next, currentIndex: -1 });
            get().playTrack(newIndex);
            return;
          }

          set({
            queue: next,
            currentIndex: index < currentIndex ? currentIndex - 1 : currentIndex,
          });
        },

        playTrack: (index) => {
          const { queue, volume, isMuted } = get();
          if (index < 0 || index >= queue.length) return;

          teardownAudio();

          const track = queue[index];
          const audio = new Audio();
          audio.preload = 'auto';
          audio.volume = isMuted ? 0 : volume;
          audio.src = track.url;
          _audio = audio;

          attachListeners(audio, true);
          set({ currentIndex: index, seek: 0, seekSeconds: 0, duration: 0, isBuffering: true });
        },

        togglePlay: () => {
          const { isPlaying, currentIndex, queue } = get();
          if (!_audio) {
            if (queue.length > 0) get().playTrack(currentIndex >= 0 ? currentIndex : 0);
            return;
          }
          if (isPlaying) {
            _audio.pause();
          } else {
            const p = _audio.play();
            if (p && typeof p.catch === 'function') {
              p.catch((err) => console.error('Playback failed:', err));
            }
          }
        },

        next: () => {
          const { queue, currentIndex, isShuffle, repeatMode } = get();
          if (queue.length === 0) return;

          if (repeatMode === 'one') {
            get().playTrack(currentIndex);
            return;
          }

          let nextIndex: number;
          if (isShuffle) {
            nextIndex = Math.floor(Math.random() * queue.length);
          } else {
            nextIndex = currentIndex + 1;
          }

          if (nextIndex >= queue.length) {
            if (repeatMode === 'all') {
              nextIndex = 0;
            } else {
              cancelRaf();
              set({ isPlaying: false, seek: 0, seekSeconds: 0 });
              return;
            }
          }

          get().playTrack(nextIndex);
        },

        prev: () => {
          const { currentIndex, queue } = get();
          if (queue.length === 0) return;
          const prevIndex = currentIndex <= 0 ? queue.length - 1 : currentIndex - 1;
          get().playTrack(prevIndex);
        },

        seekTo: (ratio) => {
          if (!_audio) return;
          const duration = _audio.duration;
          if (!isFinite(duration) || duration <= 0) return;
          const clamped = Math.max(0, Math.min(1, ratio));
          _audio.currentTime = duration * clamped;
          set({ seek: clamped, seekSeconds: duration * clamped });
        },

        skip: (seconds) => {
          if (!_audio) return;
          const duration = _audio.duration;
          if (!isFinite(duration) || duration <= 0) return;
          const next = Math.max(0, Math.min(_audio.currentTime + seconds, duration));
          _audio.currentTime = next;
        },

        setVolume: (vol) => {
          const clamped = Math.max(0, Math.min(1, vol));
          if (_audio) _audio.volume = clamped;
          set({ volume: clamped, isMuted: false });
        },

        toggleMute: () => {
          const { isMuted, volume } = get();
          if (_audio) _audio.volume = isMuted ? volume : 0;
          set({ isMuted: !isMuted });
        },

        toggleShuffle: () => {
          set((s) => ({ isShuffle: !s.isShuffle }));
        },

        cycleRepeat: () => {
          const order: RepeatMode[] = ['none', 'all', 'one'];
          const { repeatMode } = get();
          const next = order[(order.indexOf(repeatMode) + 1) % order.length];
          set({ repeatMode: next });
        },

        toggleQueueSheet: () => {
          set((s) => ({ isQueueSheetOpen: !s.isQueueSheetOpen }));
        },

        reorderQueue: (from, to) => {
          const { queue, currentIndex } = get();
          const next = [...queue];
          const [moved] = next.splice(from, 1);
          next.splice(to, 0, moved);

          let nextCurrent = currentIndex;
          if (currentIndex === from) {
            nextCurrent = to;
          } else if (from < currentIndex && to >= currentIndex) {
            nextCurrent = currentIndex - 1;
          } else if (from > currentIndex && to <= currentIndex) {
            nextCurrent = currentIndex + 1;
          }

          set({ queue: next, currentIndex: nextCurrent });
        },

        initFromPersistedState: () => {
          const { queue, currentIndex, seekSeconds, volume, isMuted } = get();
          if (currentIndex < 0 || queue.length === 0 || _audio) return;

          const track = queue[currentIndex];
          const audio = new Audio();
          audio.preload = 'auto';
          audio.volume = isMuted ? 0 : volume;
          audio.src = track.url;
          _audio = audio;

          const onMeta = () => {
            const dur = audio.duration || 0;
            if (seekSeconds > 0 && dur > 0) {
              audio.currentTime = Math.min(seekSeconds, dur);
              set({ seek: dur > 0 ? seekSeconds / dur : 0, seekSeconds });
            }
            audio.removeEventListener('loadedmetadata', onMeta);
          };
          audio.addEventListener('loadedmetadata', onMeta);

          attachListeners(audio, false);
          // Do not call .play() — stay paused, just preload
        },

        _tick: () => {
          if (!_audio || _audio.paused) return;
          const currentSecs = _audio.currentTime;
          const duration = _audio.duration;
          if (isFinite(duration) && duration > 0) {
            set({ seek: currentSecs / duration, seekSeconds: currentSecs });
          }
        },
      };
    },
    {
      name: 'kirtansewa-player',
      version: 1,
      migrate: (persistedState) => persistedState,
      partialize: (state) => ({
        queue: state.queue,
        currentIndex: state.currentIndex,
        seekSeconds: state.seekSeconds,
        isShuffle: state.isShuffle,
        repeatMode: state.repeatMode,
        volume: state.volume,
      }),
    }
  )
);
