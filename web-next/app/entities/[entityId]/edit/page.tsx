'use client';

import React from 'react';
import { useCallback } from 'react';
import { ClientWorkbench } from '@/components/workbench/client-workbench';
import { useI18n } from '@/components/providers/i18n-provider';
import { EntityEditorSurface } from '@/components/pages/entity-editor-surface';
import { apiMessageGet } from '@/lib/api-client';
import type { EntityCatalogSuggestions, EntityDto } from '@/lib/types';
import { loadEntityEditorCatalogSuggestions, loadEntityEditorEntity } from '../../../../lib/entity-editor/controller';

export default function EntityEditPage({ params }: { params: Promise<{ entityId: string }> }) {
  const { t } = useI18n();
  const load = useCallback(async (): Promise<{ entityId: string; dto: EntityDto; catalogSuggestions: EntityCatalogSuggestions }> => {
    const resolved = await params;
    const [dto, catalogSuggestions] = await Promise.all([
      loadEntityEditorEntity(apiMessageGet, resolved.entityId),
      loadEntityEditorCatalogSuggestions(apiMessageGet)
    ]);
    return { entityId: resolved.entityId, dto, catalogSuggestions };
  }, [params]);

  return (
    <ClientWorkbench load={load} loadingCopy={t('entities.edit.loading')}>
      {data => <EntityEditorSurface initial={data.dto} mode="edit" entityId={data.entityId} catalogSuggestions={data.catalogSuggestions} />}
    </ClientWorkbench>
  );
}
