'use client';

import React, { useCallback } from 'react';
import { ClientWorkbench } from '@/components/workbench/client-workbench';
import { useI18n } from '@/components/providers/i18n-provider';
import { EntityImportSurface } from '@/components/pages/entity-import-surface';
import { api } from '@/lib/api-facade';
import { buildImportActivitiesUrl, buildImportTemplatesUrl, loadImportDataFromFacade } from '@/lib/entity-import/controller';
import type { SignalRouteContext } from '@/lib/signal-route-context';

const ENTITY_IMPORT_SETTLED_CACHE_TTL_MS = 10_000;

type ImportData = Awaited<ReturnType<typeof loadImportDataFromFacade>>;

export default function EntityImportPage({
  deletedEntity,
  deleteResult,
  routeContext
}: {
  deletedEntity?: string | null;
  deleteResult?: 'success' | null;
  routeContext?: SignalRouteContext;
}) {
  const { t } = useI18n();
  const entityImportTemplatesUrl = React.useMemo(() => buildImportTemplatesUrl(), []);
  const entityImportActivitiesUrl = React.useMemo(() => buildImportActivitiesUrl(), []);
  const entityImportCacheKey = React.useMemo(
    () => ['entity-import', entityImportTemplatesUrl, entityImportActivitiesUrl].join(':'),
    [entityImportActivitiesUrl, entityImportTemplatesUrl]
  );
  const load = useCallback(
    async (): Promise<ImportData> =>
      loadImportDataFromFacade({
        templates: api.entities.importTemplates,
        activities: api.entities.importActivities
      }),
    []
  );

  return (
    <ClientWorkbench
      load={load}
      loadingCopy={t('entities.import.loading')}
      cacheKey={entityImportCacheKey}
      cacheSettledTtlMs={ENTITY_IMPORT_SETTLED_CACHE_TTL_MS}
    >
      {data => (
        <EntityImportSurface
          templates={data.templates}
          activities={data.activities}
          initialMessage={
            deleteResult === 'success' && deletedEntity
              ? t('entities.import.delete-success', { id: deletedEntity })
              : null
          }
          initialMessageTone={deleteResult === 'success' && deletedEntity ? 'success' : 'error'}
          routeContext={routeContext}
        />
      )}
    </ClientWorkbench>
  );
}
