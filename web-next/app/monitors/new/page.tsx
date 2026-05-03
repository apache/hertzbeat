'use client';

import React from 'react';
import { useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { ClientWorkbench } from '@/components/workbench/client-workbench';
import { MonitorEditorSurface } from '../../../components/pages/monitor-editor-surface';
import { useI18n } from '@/components/providers/i18n-provider';
import { apiMessageGet } from '@/lib/api-client';
import { loadMonitorEditorDraft } from '@/lib/monitor-editor/controller';

export default function MonitorNewPage() {
  const { t } = useI18n();
  const searchParams = useSearchParams();
  const app = searchParams.get('app') || 'website';
  const returnTo = searchParams.get('returnTo');

  const load = useCallback(async () => loadMonitorEditorDraft(apiMessageGet, 'new', { app }), [app]);

  return (
    <ClientWorkbench load={load} loadingCopy={t('monitor.editor.loading.new')}>
      {data => (
        <MonitorEditorSurface
          initial={data}
          mode="new"
          returnContext={{
            labels: searchParams.get('labels'),
            pageIndex: searchParams.get('pageIndex'),
            pageSize: searchParams.get('pageSize'),
            entityId: searchParams.get('entityId'),
            entityName: searchParams.get('entityName'),
            returnTo
          }}
        />
      )}
    </ClientWorkbench>
  );
}
