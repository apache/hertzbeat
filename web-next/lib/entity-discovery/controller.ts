import type { EntityCatalogSuggestions, EntityDiscoveryGovernanceActivity, EntityDiscoveryGovernancePreset, Monitor, PageResult } from '@/lib/types';
import { resolveDiscoverySearchSubmission } from './search-state';

type ApiGetter = <T>(url: string) => Promise<T>;

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
    apiGet<EntityDiscoveryGovernancePreset[]>('/entities/discovery/governance-presets?limit=8').catch(error => {
      if (isNotFoundError(error)) {
        return [];
      }
      throw error;
    }),
    apiGet<EntityDiscoveryGovernanceActivity[]>('/entities/discovery/governance-activities?limit=8').catch(error => {
      if (isNotFoundError(error)) {
        return [];
      }
      throw error;
    }),
    apiGet<EntityCatalogSuggestions>('/entities/catalog-suggestions?limit=120').catch(error => {
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
