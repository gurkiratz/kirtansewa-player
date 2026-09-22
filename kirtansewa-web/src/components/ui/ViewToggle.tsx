import { LayoutGrid, List } from 'lucide-react';
import type { ViewMode } from '../../hooks/useViewMode';

interface Props {
  viewMode: ViewMode;
  onToggle: () => void;
  className?: string;
}

export function ViewToggle({ viewMode, onToggle, className = '' }: Props) {
  return (
    <button
      onClick={onToggle}
      className={`flex items-center gap-1.5 text-xs text-text-secondary hover:text-text-primary transition-colors ${className}`}
      title={viewMode === 'grid' ? 'Switch to list view' : 'Switch to grid view'}
    >
      {viewMode === 'grid' ? <LayoutGrid size={14} /> : <List size={14} />}
      <span>{viewMode === 'grid' ? 'Grid' : 'List'}</span>
    </button>
  );
}
