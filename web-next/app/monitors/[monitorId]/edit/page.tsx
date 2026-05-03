'use client';

import React from 'react';
import { useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { ClientWorkbench } from '@/components/workbench/client-workbench';
import { MonitorEditorSurface } from '../../../../components/pages/monitor-editor-surface';
import { useI18n } from '@/components/providers/i18n-provider';
import { apiMessageGet } from '@/lib/api-client';
import { loadMonitorEditorDraft } from '@/lib/monitor-editor/controller';

export default function MonitorEditPage({ params }: { params: Promise<{ monitorId: string }> }) {
  const { t } = useI18n();
  const searchParams = useSearchParams();
  const returnTo = searchParams.get('returnTo');

  const load = useCallback(async () => {
    const resolved = await params;
    return loadMonitorEditorDraft(apiMessageGet, 'edit', { monitorId: resolved.monitorId });
  }, [params]);

  return (
    <ClientWorkbench load={load} loadingCopy={t('monitor.editor.loading.edit')}>
      {data => (
        <MonitorEditorSurface
          initial={data}
          mode="edit"
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
