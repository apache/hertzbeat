'use client';

import React, { useCallback } from 'react';
import { ClientWorkbench } from '@/components/workbench/client-workbench';
import { useI18n } from '@/components/providers/i18n-provider';
import { EntityEditorSurface } from '@/components/pages/entity-editor-surface';
import { api } from '@/lib/api-facade';
import {
  buildEntityEditorCatalogSuggestionsUrl,
  buildEntityEditorNewDraftFromFacade,
  buildEntityEditorSeedMonitorUrl,
  loadEntityEditorCatalogSuggestionsFromFacade,
  type EntityEditorNewDraftSeed
} from '@/lib/entity-editor/controller';

const ENTITY_NEW_SETTLED_CACHE_TTL_MS = 10_000;
const EMPTY_ENTITY_NEW_SEED: EntityEditorNewDraftSeed = { source: null, monitorId: null };

export default function EntityNewPage({ initialSeed }: { initialSeed?: EntityEditorNewDraftSeed } = {}) {
  const { t } = useI18n();
  const entityNewSeed = initialSeed ?? EMPTY_ENTITY_NEW_SEED;
  const { source, monitorId, identityKey, identityValue, serviceName, serviceNamespace, environment } = entityNewSeed;
  const entityNewCatalogUrl = React.useMemo(() => buildEntityEditorCatalogSuggestionsUrl(), []);
  const entityNewSeedUrl = React.useMemo(() => {
    if (source === 'telemetry' && monitorId) {
      return buildEntityEditorSeedMonitorUrl(monitorId);
    }
    if (source === 'otlp-candidate' && identityKey && identityValue) {
      return [
        'otlp-candidate',
        identityKey,
        identityValue,
        serviceName ?? 'none',
        serviceNamespace ?? 'none',
        environment ?? 'none'
      ].join(':');
    }
    return ['manual', source ?? 'none', monitorId ?? 'none'].join(':');
  }, [environment, identityKey, identityValue, monitorId, serviceName, serviceNamespace, source]);
  const entityNewCacheKey = React.useMemo(
    () => ['entity-new', entityNewSeedUrl, entityNewCatalogUrl].join(':'),
    [entityNewCatalogUrl, entityNewSeedUrl]
  );

  const load = useCallback(async () => {
    const [initial, catalogSuggestions] = await Promise.all([
      buildEntityEditorNewDraftFromFacade(api.monitors.detail, entityNewSeed),
      loadEntityEditorCatalogSuggestionsFromFacade(api.entities.catalogSuggestions)
    ]);
    return { initial, catalogSuggestions };
  }, [entityNewSeed]);

  return (
    <ClientWorkbench
      load={load}
      loadingCopy={t('entities.new.loading')}
      cacheKey={entityNewCacheKey}
      cacheSettledTtlMs={ENTITY_NEW_SETTLED_CACHE_TTL_MS}
    >
      {data => <EntityEditorSurface initial={data.initial} mode="new" catalogSuggestions={data.catalogSuggestions} />}
    </ClientWorkbench>
  );
}
