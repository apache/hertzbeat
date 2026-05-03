'use client';

import React from 'react';
import { useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { ClientWorkbench } from '@/components/workbench/client-workbench';
import { useI18n } from '@/components/providers/i18n-provider';
import { EntityEditorSurface } from '@/components/pages/entity-editor-surface';
import { apiMessageGet } from '@/lib/api-client';
import { buildEntityEditorNewDraft, loadEntityEditorCatalogSuggestions } from '@/lib/entity-editor/controller';
import type { EntityCatalogSuggestions } from '@/lib/types';

export default function EntityNewPage() {
  const { t } = useI18n();
  const searchParams = useSearchParams();
  const source = searchParams.get('source');
  const monitorId = searchParams.get('monitorId');

  const load = useCallback(async () => {
    const [initial, catalogSuggestions] = await Promise.all([
      buildEntityEditorNewDraft(apiMessageGet, { source, monitorId }),
      loadEntityEditorCatalogSuggestions(apiMessageGet)
    ]);
    return { initial, catalogSuggestions };
  }, [monitorId, source]);

  return (
    <ClientWorkbench load={load} loadingCopy={t('entities.new.loading')}>
      {data => <EntityEditorSurface initial={data.initial} mode="new" catalogSuggestions={data.catalogSuggestions} />}
    </ClientWorkbench>
  );
}
