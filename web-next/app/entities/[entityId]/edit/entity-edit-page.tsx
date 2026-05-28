'use client';

import React from 'react';
import { useCallback } from 'react';
import { ClientWorkbench } from '@/components/workbench/client-workbench';
import { useI18n } from '@/components/providers/i18n-provider';
import { EntityEditorSurface } from '@/components/pages/entity-editor-surface';
import { api } from '@/lib/api-facade';
import type { EntityCatalogSuggestions, EntityDto } from '@/lib/types';
import {
  buildEntityEditorCatalogSuggestionsUrl,
  buildEntityEditorEntityUrl,
  loadEntityEditorCatalogSuggestionsFromFacade,
  loadEntityEditorEntityFromFacade
} from '../../../../lib/entity-editor/controller';

const ENTITY_EDIT_SETTLED_CACHE_TTL_MS = 10_000;

export default function EntityEditPage({ entityId }: { entityId: string }) {
  const { t } = useI18n();
  const entityEditorEntityUrl = React.useMemo(() => buildEntityEditorEntityUrl(entityId), [entityId]);
  const entityEditorCatalogUrl = React.useMemo(() => buildEntityEditorCatalogSuggestionsUrl(), []);
  const entityEditCacheKey = React.useMemo(
    () => ['entity-edit', entityEditorEntityUrl, entityEditorCatalogUrl].join(':'),
    [entityEditorEntityUrl, entityEditorCatalogUrl]
  );
  const load = useCallback(async (): Promise<{ entityId: string; dto: EntityDto; catalogSuggestions: EntityCatalogSuggestions }> => {
    const [dto, catalogSuggestions] = await Promise.all([
      loadEntityEditorEntityFromFacade(api.entities.editorEntity, entityId),
      loadEntityEditorCatalogSuggestionsFromFacade(api.entities.catalogSuggestions)
    ]);
    return { entityId, dto, catalogSuggestions };
  }, [entityId]);

  return (
    <ClientWorkbench
      load={load}
      loadingCopy={t('entities.edit.loading')}
      cacheKey={entityEditCacheKey}
      cacheSettledTtlMs={ENTITY_EDIT_SETTLED_CACHE_TTL_MS}
    >
      {data => <EntityEditorSurface initial={data.dto} mode="edit" entityId={data.entityId} catalogSuggestions={data.catalogSuggestions} />}
    </ClientWorkbench>
  );
}
