interface Props {
  /** Bars freeze when paused. */
  animate?: boolean;
  className?: string;
}

/** Three-bar equalizer that marks the row/card currently loaded in the player. */
export function PlayingIndicator({ animate = true, className = '' }: Props) {
  return (
    <span
      className={`inline-flex items-end gap-[2px] h-3 w-3 ${className}`}
      aria-label="Now playing"
      role="img"
    >
      {[0, 0.3, 0.15].map((delay, i) => (
        <span
          key={i}
          className={`w-[2px] h-full rounded-[1px] bg-current ${animate ? 'eq-bar' : ''}`}
          style={animate ? { animationDelay: `${delay}s` } : { transform: 'scaleY(0.5)' }}
        />
      ))}
    </span>
  );
}
