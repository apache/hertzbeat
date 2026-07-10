'use client';

import React, { useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { ClientWorkbench } from '@/components/workbench/client-workbench';
import { useI18n } from '@/components/providers/i18n-provider';
import { EntityDiscoverySurface } from '@/components/pages/entity-discovery-surface';
import { api } from '@/lib/api-facade';
import {
  buildDiscoveryCatalogSuggestionsUrl,
  buildDiscoveryGovernanceActivitiesUrl,
  buildDiscoveryGovernancePresetsUrl,
  loadDiscoveryDataFromFacade
} from '@/lib/entity-discovery/controller';
import { resolveDiscoveryCandidateContext } from '@/lib/entity-discovery/search-state';

const ENTITY_DISCOVERY_SETTLED_CACHE_TTL_MS = 10_000;

type DiscoveryData = Awaited<ReturnType<typeof loadDiscoveryDataFromFacade>>;

export default function EntityDiscoveryPage() {
  const { t } = useI18n();
  const searchParams = useSearchParams();
  const entityDiscoveryPresetsUrl = React.useMemo(() => buildDiscoveryGovernancePresetsUrl(), []);
  const entityDiscoveryActivitiesUrl = React.useMemo(() => buildDiscoveryGovernanceActivitiesUrl(), []);
  const entityDiscoveryCatalogUrl = React.useMemo(() => buildDiscoveryCatalogSuggestionsUrl(), []);
  const candidateContext = React.useMemo(() => resolveDiscoveryCandidateContext(searchParams), [searchParams]);
  const initialSearch = React.useMemo(() => searchParams.get('search')?.trim() || null, [searchParams]);
  const initialSource = React.useMemo(() => searchParams.get('source')?.trim() || null, [searchParams]);
  const deleteSuccess = React.useMemo(() => searchParams.get('deleteResult')?.trim() === 'success', [searchParams]);
  const deletedEntity = React.useMemo(() => searchParams.get('deletedEntity')?.trim() || null, [searchParams]);
  const initialPageIndex = React.useMemo(() => {
    const raw = Number(searchParams.get('pageIndex') || 0);
    return Number.isFinite(raw) ? Math.max(0, Math.floor(raw)) : 0;
  }, [searchParams]);
  const entityDiscoveryCacheKey = React.useMemo(
    () => ['entity-discovery', entityDiscoveryPresetsUrl, entityDiscoveryActivitiesUrl, entityDiscoveryCatalogUrl].join(':'),
    [entityDiscoveryActivitiesUrl, entityDiscoveryCatalogUrl, entityDiscoveryPresetsUrl]
  );
  const load = useCallback(
    async (): Promise<DiscoveryData> =>
      loadDiscoveryDataFromFacade({
        presets: api.entities.discoveryGovernancePresets,
        activities: api.entities.discoveryGovernanceActivities,
        catalogSuggestions: api.entities.catalogSuggestions
      }),
    []
  );

  return (
    <ClientWorkbench
      load={load}
      loadingCopy={t('entities.discovery.loading')}
      cacheKey={entityDiscoveryCacheKey}
      cacheSettledTtlMs={ENTITY_DISCOVERY_SETTLED_CACHE_TTL_MS}
    >
      {data => (
        <EntityDiscoverySurface
          presets={data.presets}
          activities={data.activities}
          catalog={data.catalog}
          candidateContext={candidateContext}
          initialSearch={initialSearch}
          initialSource={initialSource}
          initialPageIndex={initialPageIndex}
          deleteSuccess={deleteSuccess}
          deletedEntity={deletedEntity}
        />
      )}
    </ClientWorkbench>
  );
}
