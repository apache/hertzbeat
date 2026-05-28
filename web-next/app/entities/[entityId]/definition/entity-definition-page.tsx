'use client';

import React, { useCallback } from 'react';
import { ClientWorkbench } from '@/components/workbench/client-workbench';
import { useI18n } from '@/components/providers/i18n-provider';
import { EntityDefinitionWorkspaceSurface } from '@/components/pages/entity-definition-workspace-surface';
import { api } from '@/lib/api-facade';
import {
  buildEntityDefinitionActivitiesUrl,
  buildEntityDefinitionTemplatesUrl,
  buildEntityDefinitionUrl,
  loadEntityDefinitionPageDataFromFacade
} from '@/lib/entity-definition/controller';

type DefinitionPageData = Awaited<ReturnType<typeof loadEntityDefinitionPageDataFromFacade>>;

const ENTITY_DEFINITION_SETTLED_CACHE_TTL_MS = 10_000;

export default function EntityDefinitionPage({ entityId }: { entityId: string }) {
  const { t } = useI18n();
  const entityDefinitionUrl = React.useMemo(() => buildEntityDefinitionUrl(entityId, 'yaml'), [entityId]);
  const entityDefinitionActivitiesUrl = React.useMemo(() => buildEntityDefinitionActivitiesUrl(entityId), [entityId]);
  const entityDefinitionTemplatesUrl = React.useMemo(() => buildEntityDefinitionTemplatesUrl(), []);
  const entityDefinitionCacheKey = React.useMemo(
    () => ['entity-definition', entityDefinitionUrl, entityDefinitionActivitiesUrl, entityDefinitionTemplatesUrl].join(':'),
    [entityDefinitionActivitiesUrl, entityDefinitionTemplatesUrl, entityDefinitionUrl]
  );
  const load = useCallback(async (): Promise<DefinitionPageData> => {
    return loadEntityDefinitionPageDataFromFacade(
      {
        definition: api.entities.definition,
        activities: api.entities.definitionActivities,
        templates: api.entities.definitionTemplates
      },
      entityId,
      'yaml'
    );
  }, [entityId]);

  return (
    <ClientWorkbench
      load={load}
      loadingCopy={t('entities.definition.loading')}
      cacheKey={entityDefinitionCacheKey}
      cacheSettledTtlMs={ENTITY_DEFINITION_SETTLED_CACHE_TTL_MS}
    >
      {data => (
        <EntityDefinitionWorkspaceSurface
          mode="definition"
          entityId={data.entityId}
          initialContent={data.definition}
          initialFormat="yaml"
          initialMessage={data.loadMessage}
          templates={data.templates}
          activities={data.activities}
        />
      )}
    </ClientWorkbench>
  );
}
