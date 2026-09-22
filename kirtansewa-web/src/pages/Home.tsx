import { useSearchParams } from 'react-router-dom';
import { ArtistGrid } from './ArtistGrid';
import { SearchResults } from './SearchResults';

/**
 * "/" is the artist catalog; "/?q=…" is the full search results page. Keeping
 * them on one route means the search bar only ever has to push a query string.
 */
export function Home() {
  const [params] = useSearchParams();
  const query = params.get('q')?.trim() ?? '';
  return query ? <SearchResults query={query} /> : <ArtistGrid />;
}
