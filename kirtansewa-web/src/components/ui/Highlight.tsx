import { useMemo } from 'react';

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

interface Props {
  text: string;
  /** Normalised query tokens to emphasise. */
  tokens: string[];
  className?: string;
}

/** Renders `text` with every query token emphasised. */
export function Highlight({ text, tokens, className = '' }: Props) {
  const pattern = useMemo(() => {
    const usable = tokens.filter((t) => t.length > 0).map(escapeRegExp);
    return usable.length ? new RegExp(`(${usable.join('|')})`, 'gi') : null;
  }, [tokens]);

  if (!pattern) return <>{text}</>;

  const parts = text.split(pattern);
  return (
    <>
      {parts.map((part, i) =>
        // split() with one capture group puts the matches at odd indices.
        i % 2 === 1 ? (
          <mark key={i} className={`bg-transparent text-gold ${className}`}>
            {part}
          </mark>
        ) : (
          part
        )
      )}
    </>
  );
}
