export interface DiscoverySearchSubmission {
  mode: 'idle' | 'search';
  normalizedSearch: string | null;
}

export function resolveDiscoverySearchSubmission(search: string): DiscoverySearchSubmission {
  const normalizedSearch = search.trim();

  if (normalizedSearch === '') {
    return {
      mode: 'idle',
      normalizedSearch: null
    };
  }

  return {
    mode: 'search',
    normalizedSearch
  };
}
