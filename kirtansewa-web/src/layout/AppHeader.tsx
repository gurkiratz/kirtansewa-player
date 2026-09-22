import { Menu, User } from "lucide-react";
import { SearchBar } from "../components/search/SearchBar";

interface Props {
  onMenuOpen: () => void;
}

/**
 * One header for every breakpoint. Mobile and desktop used to render separate
 * headers, which meant two mounted SearchBars holding two independent copies of
 * the query — resizing the window swapped you onto the stale one.
 */
export function AppHeader({ onMenuOpen }: Props) {
  return (
    <header className="h-14 shrink-0 border-b border-border bg-surface flex items-center gap-2 md:gap-4 px-2 md:px-5 z-30">
      <button
        onClick={onMenuOpen}
        className="md:hidden text-text-secondary hover:text-text-primary transition-colors shrink-0"
        aria-label="Open menu"
      >
        <Menu size={22} />
      </button>

      <SearchBar className="flex-1 min-w-0 md:max-w-2xl" />

      <button
        className="hidden text-text-secondary hover:text-text-primary transition-colors shrink-0"
        aria-label="Account"
      >
        <User size={22} />
      </button>
    </header>
  );
}
