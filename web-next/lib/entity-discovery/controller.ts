import type {
  EntityCatalogSuggestions,
  EntityDiscoveryGovernanceActivity,
  EntityDiscoveryGovernancePreset,
  EntityMonitorBindingCandidate,
  Monitor,
  PageResult
} from '@/lib/types';
import { resolveDiscoverySearchSubmission } from './search-state';

type ApiGetter = <T>(url: string) => Promise<T>;
const DISCOVERY_MONITOR_SEARCH_PAGE_SIZE = 50;

export type DiscoveryMonitorSearchResult = {
  monitors: Monitor[];
  totalElements: number;
  pageSize: number;
  pageIndex: number;
};

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

export function buildDiscoveryMonitorCandidatesUrl(monitors: Monitor[]) {
  const params = new URLSearchParams();
  monitors.forEach(monitor => {
    if (monitor.id != null) {
      params.append('ids', String(monitor.id));
    }
  });
  return `/entities/monitor/candidates?${params.toString()}`;
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

function normalizeDiscoveryPageIndex(pageIndex: number | null | undefined) {
  if (!Number.isFinite(pageIndex)) return 0;
  return Math.max(0, Math.floor(Number(pageIndex)));
}

export async function searchDiscoveryMonitors(apiGet: ApiGetter, search: string, pageIndex = 0) {
  const submission = resolveDiscoverySearchSubmission(search);
  const normalizedPageIndex = normalizeDiscoveryPageIndex(pageIndex);

  if (submission.mode === 'idle' || submission.normalizedSearch == null) {
    return {
      monitors: [],
      totalElements: 0,
      pageSize: DISCOVERY_MONITOR_SEARCH_PAGE_SIZE,
      pageIndex: normalizedPageIndex
    } satisfies DiscoveryMonitorSearchResult;
  }

  const params = new URLSearchParams({
    pageIndex: String(normalizedPageIndex),
    pageSize: String(DISCOVERY_MONITOR_SEARCH_PAGE_SIZE)
  });
  params.set('search', submission.normalizedSearch);

  const result = await apiGet<PageResult<Monitor>>(`/monitors?${params.toString()}`);
  const monitors = (result.content || []).slice(0, DISCOVERY_MONITOR_SEARCH_PAGE_SIZE);
  const monitorsWithCandidates = await attachMonitorBindingCandidates(apiGet, monitors);

  return {
    monitors: monitorsWithCandidates,
    totalElements: typeof result.totalElements === 'number' ? result.totalElements : monitors.length,
    pageSize: DISCOVERY_MONITOR_SEARCH_PAGE_SIZE,
    pageIndex: typeof result.pageIndex === 'number' ? result.pageIndex : normalizedPageIndex
  } satisfies DiscoveryMonitorSearchResult;
}

async function attachMonitorBindingCandidates(apiGet: ApiGetter, monitors: Monitor[]) {
  if (monitors.length === 0) {
    return monitors;
  }

  try {
    const candidatesByMonitor = await apiGet<Record<string, EntityMonitorBindingCandidate[]>>(
      buildDiscoveryMonitorCandidatesUrl(monitors)
    );
    return monitors.map(monitor => ({
      ...monitor,
      entityBindingCandidates: Array.isArray(candidatesByMonitor?.[String(monitor.id)])
        ? candidatesByMonitor[String(monitor.id)]
        : []
    }));
  } catch {
    return Promise.all(
      monitors.map(async monitor => {
        try {
          const candidates = await apiGet<EntityMonitorBindingCandidate[]>(
            `/entities/monitor/${encodeURIComponent(String(monitor.id))}/candidates`
          );
          return { ...monitor, entityBindingCandidates: candidates };
        } catch {
          return monitor;
        }
      })
    );
  }
}
