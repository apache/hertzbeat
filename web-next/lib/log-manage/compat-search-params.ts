import type { SearchParamReader } from './query-state';

export type SearchParamsRecord = Record<string, string | string[] | undefined>;

export function createLogCompatSearchParamReader(searchParams?: SearchParamsRecord, fallbackSearch?: string): SearchParamReader {
  const params = new URLSearchParams();

  Object.entries(searchParams || {}).forEach(([key, value]) => {
    if (Array.isArray(value)) {
      if (value[0]) {
        params.set(key, value[0]);
      }
      return;
    }
    if (value) {
      params.set(key, value);
    }
  });

  if (fallbackSearch && !params.get('search')?.trim() && !params.get('content')?.trim()) {
    params.set('search', fallbackSearch);
  }

  return {
    get(name: string) {
      return params.get(name);
    }
  };
}
