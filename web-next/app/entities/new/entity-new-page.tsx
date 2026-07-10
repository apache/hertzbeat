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
import type { SignalRouteContext } from '@/lib/signal-route-context';

const ENTITY_NEW_SETTLED_CACHE_TTL_MS = 10_000;
const EMPTY_ENTITY_NEW_SEED: EntityEditorNewDraftSeed = { source: null, monitorId: null };

function trimmedEntityNewContextValue(value: string | null | undefined) {
  const trimmed = value?.trim();
  return trimmed || undefined;
}

export default function EntityNewPage({ initialSeed }: { initialSeed?: EntityEditorNewDraftSeed } = {}) {
  const { t } = useI18n();
  const entityNewSeed = initialSeed ?? EMPTY_ENTITY_NEW_SEED;
  const {
    source,
    monitorId,
    monitorName,
    monitorApp,
    monitorInstance,
    returnTo,
    identityKey,
    identityValue,
    serviceName,
    serviceNamespace,
    environment
  } = entityNewSeed;
  const entityNewRouteContext = React.useMemo<SignalRouteContext | undefined>(() => {
    const nextContext: SignalRouteContext = {
      source: trimmedEntityNewContextValue(source),
      monitorId: trimmedEntityNewContextValue(monitorId),
      monitorName: trimmedEntityNewContextValue(monitorName),
      monitorApp: trimmedEntityNewContextValue(monitorApp),
      monitorInstance: trimmedEntityNewContextValue(monitorInstance),
      returnTo: trimmedEntityNewContextValue(returnTo),
      serviceName: trimmedEntityNewContextValue(serviceName),
      serviceNamespace: trimmedEntityNewContextValue(serviceNamespace),
      environment: trimmedEntityNewContextValue(environment)
    };
    if (!Object.values(nextContext).some(Boolean)) {
      return undefined;
    }
    return nextContext;
  }, [environment, monitorApp, monitorId, monitorInstance, monitorName, returnTo, serviceName, serviceNamespace, source]);
  const entityNewCatalogUrl = React.useMemo(() => buildEntityEditorCatalogSuggestionsUrl(), []);
  const entityNewSeedUrl = React.useMemo(() => {
    if ((source === 'telemetry' || source === 'discovery-candidate') && monitorId) {
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
      {data => (
        <EntityEditorSurface
          initial={data.initial}
          mode="new"
          catalogSuggestions={data.catalogSuggestions}
          routeContext={entityNewRouteContext}
        />
      )}
    </ClientWorkbench>
  );
}
