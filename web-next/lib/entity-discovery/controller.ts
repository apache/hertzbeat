import type { EntityCatalogSuggestions, EntityDiscoveryGovernanceActivity, EntityDiscoveryGovernancePreset, Monitor, PageResult } from '@/lib/types';
import { resolveDiscoverySearchSubmission } from './search-state';

type ApiGetter = <T>(url: string) => Promise<T>;
type DiscoveryReaders = {
  presets: (limit?: number) => Promise<EntityDiscoveryGovernancePreset[]>;
  activities: (limit?: number) => Promise<EntityDiscoveryGovernanceActivity[]>;
  catalogSuggestions: (limit?: number) => Promise<EntityCatalogSuggestions>;
};

export function buildDiscoveryGovernancePresetsUrl(limit = 8) {
  const params = new URLSearchParams({ limit: String(limit) });
  return `/entities/discovery/governance-presets?${params.toString()}`;
}

export function buildDiscoveryGovernanceActivitiesUrl(limit = 8) {
  const params = new URLSearchParams({ limit: String(limit) });
  return `/entities/discovery/governance-activities?${params.toString()}`;
}

export function buildDiscoveryCatalogSuggestionsUrl(limit = 120) {
  const params = new URLSearchParams({ limit: String(limit) });
  return `/entities/catalog-suggestions?${params.toString()}`;
}

function isNotFoundError(error: unknown) {
  return error instanceof Error && error.message.includes('404');
}

function buildEmptyEntityCatalogSuggestions(): EntityCatalogSuggestions {
  return {
    owners: [],
    namespaces: [],
    environments: [],
    systems: [],
    lifecycles: [],
    tiers: [],
    inheritFromRefs: [],
    entityRefs: [],
    languages: [],
    linkProviders: []
  };
}

export async function loadDiscoveryData(apiGet: ApiGetter) {
  const [presets, activities, catalog] = await Promise.all([
    apiGet<EntityDiscoveryGovernancePreset[]>(buildDiscoveryGovernancePresetsUrl()).catch(error => {
      if (isNotFoundError(error)) {
        return [];
      }
      throw error;
    }),
    apiGet<EntityDiscoveryGovernanceActivity[]>(buildDiscoveryGovernanceActivitiesUrl()).catch(error => {
      if (isNotFoundError(error)) {
        return [];
      }
      throw error;
    }),
    apiGet<EntityCatalogSuggestions>(buildDiscoveryCatalogSuggestionsUrl()).catch(error => {
      if (isNotFoundError(error)) {
        return buildEmptyEntityCatalogSuggestions();
      }
      throw error;
    })
  ]);

  return { presets, activities, catalog };
}

export async function loadDiscoveryDataFromFacade(readers: DiscoveryReaders) {
  const [presets, activities, catalog] = await Promise.all([
    readers.presets(8).catch(error => {
      if (isNotFoundError(error)) {
        return [];
      }
      throw error;
    }),
    readers.activities(8).catch(error => {
      if (isNotFoundError(error)) {
        return [];
      }
      throw error;
    }),
    readers.catalogSuggestions(120).catch(error => {
      if (isNotFoundError(error)) {
        return buildEmptyEntityCatalogSuggestions();
      }
      throw error;
    })
  ]);

  return { presets, activities, catalog };
}

export async function searchDiscoveryMonitors(apiGet: ApiGetter, search: string) {
  const submission = resolveDiscoverySearchSubmission(search);

  if (submission.mode === 'idle' || submission.normalizedSearch == null) {
    return [];
  }

  const params = new URLSearchParams({
    pageIndex: '0',
    pageSize: '8'
  });
  params.set('search', submission.normalizedSearch);

  const result = await apiGet<PageResult<Monitor>>(`/monitors?${params.toString()}`);
  return result.content;
}
