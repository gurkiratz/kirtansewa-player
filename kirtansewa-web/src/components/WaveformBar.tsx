import { useRef, useState, useEffect, useCallback, useMemo } from 'react'
import { usePlayerStore } from '../store/playerStore'

const BAR_COUNT = 120
const MAX_BAR_HEIGHT = 32
const MIN_BAR_HEIGHT = 3

function formatTime(seconds: number): string {
  if (!isFinite(seconds) || seconds < 0) return '0:00'
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

function seededHeights(seed: string, count: number): number[] {
  let h = 0
  for (let i = 0; i < seed.length; i++) {
    h = (Math.imul(31, h) + seed.charCodeAt(i)) | 0
  }
  const rand = () => {
    h = (Math.imul(1664525, h) + 1013904223) | 0
    return (h >>> 0) / 0xffffffff
  }
  const raw = Array.from({ length: count }, () => rand())
  // Smooth over 5-sample window so adjacent bars don't jump wildly
  const smoothed = raw.map((_, i) => {
    const w = [
      raw[Math.max(0, i - 2)],
      raw[Math.max(0, i - 1)],
      raw[i],
      raw[Math.min(count - 1, i + 1)],
      raw[Math.min(count - 1, i + 2)],
    ]
    return w.reduce((a, b) => a + b, 0) / w.length
  })
  const min = Math.min(...smoothed)
  const max = Math.max(...smoothed)
  return smoothed.map(
    (v) =>
      MIN_BAR_HEIGHT +
      ((v - min) / (max - min)) * (MAX_BAR_HEIGHT - MIN_BAR_HEIGHT),
  )
}

interface WaveformBarProps {
  variant?: 'inline' | 'stacked'
}

export function WaveformBar({ variant = 'inline' }: WaveformBarProps) {
  const seek = usePlayerStore((s) => s.seek)
  const buffered = usePlayerStore((s) => s.buffered)
  const duration = usePlayerStore((s) => s.duration)
  const seekTo = usePlayerStore((s) => s.seekTo)
  const currentIndex = usePlayerStore((s) => s.currentIndex)
  const queue = usePlayerStore((s) => s.queue)

  const currentTrack = currentIndex >= 0 ? queue[currentIndex] : null
  const seed = currentTrack?.url ?? 'default'

  const containerRef = useRef<HTMLDivElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [hoverRatio, setHoverRatio] = useState<number | null>(null)

  const heights = useMemo(() => seededHeights(seed, BAR_COUNT), [seed])

  const getRatio = useCallback((clientX: number) => {
    if (!containerRef.current) return null
    const rect = containerRef.current.getBoundingClientRect()
    return Math.max(0, Math.min(1, (clientX - rect.left) / rect.width))
  }, [])

  // Mouse drag via document-level listeners
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault()
      const r = getRatio(e.clientX)
      if (r !== null) {
        seekTo(r)
        setHoverRatio(r)
      }
      setIsDragging(true)
    },
    [getRatio, seekTo],
  )

  useEffect(() => {
    if (!isDragging) return
    const onMove = (e: MouseEvent) => {
      const r = getRatio(e.clientX)
      if (r !== null) {
        seekTo(r)
        setHoverRatio(r)
      }
    }
    const onUp = () => setIsDragging(false)
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
    return () => {
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
    }
  }, [isDragging, getRatio, seekTo])

  // Touch support (touch-action:none on container prevents scroll conflict)
  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      const r = getRatio(e.touches[0].clientX)
      if (r !== null) {
        seekTo(r)
        setHoverRatio(r)
      }
      setIsDragging(true)
    },
    [getRatio, seekTo],
  )

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      const r = getRatio(e.touches[0].clientX)
      if (r !== null) {
        seekTo(r)
        setHoverRatio(r)
      }
    },
    [getRatio, seekTo],
  )

  const handleTouchEnd = useCallback(() => {
    setIsDragging(false)
    setHoverRatio(null)
  }, [])

  const elapsed = seek * duration

  const waveform = (
    <div
      ref={containerRef}
      className="relative flex-1 flex items-center cursor-pointer select-none gap-[1px]"
      style={{ height: `${MAX_BAR_HEIGHT}px`, touchAction: 'none' }}
      onMouseDown={handleMouseDown}
      onMouseMove={(e) => {
        if (!isDragging) setHoverRatio(getRatio(e.clientX))
      }}
      onMouseLeave={() => {
        if (!isDragging) setHoverRatio(null)
      }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {heights.map((h, i) => {
        const ratio = i / BAR_COUNT
        const color =
          ratio < seek
            ? 'bg-gold'
            : ratio < buffered
              ? 'bg-gold/20'
              : 'bg-border'
        return (
          <div
            key={i}
            className={`flex-1 rounded-[1px] ${color}`}
            style={{ height: `${h}px` }}
          />
        )
      })}
      {hoverRatio !== null && (
        <div
          className="absolute top-0 bottom-0 w-px bg-gold/50 pointer-events-none"
          style={{ left: `${hoverRatio * 100}%` }}
        />
      )}
    </div>
  )

  if (variant === 'stacked') {
    return (
      <div className="w-full flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <span className="text-text-muted text-[11px] tabular-nums shrink-0">
            {formatTime(elapsed)}
          </span>
          {waveform}
          <span className="text-text-muted text-[11px] tabular-nums shrink-0">
            {formatTime(duration)}
          </span>
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-3 w-full">
      <span className="text-text-muted text-[11px] tabular-nums w-8 text-right shrink-0">
        {formatTime(elapsed)}
      </span>
      {waveform}
      <span className="text-text-muted text-[11px] tabular-nums w-8 shrink-0">
        {formatTime(duration)}
      </span>
    </div>
  )
}
