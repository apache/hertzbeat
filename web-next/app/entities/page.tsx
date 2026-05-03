'use client';

import React, { useCallback, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { ClientWorkbench } from '@/components/workbench/client-workbench';
import { EntityListSurface } from '../../components/pages/entity-list-surface';
import { useI18n } from '@/components/providers/i18n-provider';
import { apiMessageGet } from '@/lib/api-client';
import { loadEntityList } from '@/lib/entity-manage/controller';
import { entityEnvironmentLabel, entityStatusLabel, entityTypeLabel } from '@/lib/entity-manage/display-mapping';
import { formatTime } from '@/lib/format';
import { queryStateFromParams, type EntityQueryState } from '@/lib/entity-manage/query-state';
import { buildEntityTableRows } from '@/lib/entity-manage/view-model';

export default function EntitiesPage() {
  const { t } = useI18n();
  const searchParams = useSearchParams();
  const [draft, setDraft] = useState<EntityQueryState>(() => queryStateFromParams(searchParams));
  const [query, setQuery] = useState<EntityQueryState>(() => queryStateFromParams(searchParams));

  const load = useCallback(async () => {
    const list = await loadEntityList(apiMessageGet, query);
    return { list };
  }, [query]);

  const applyQuery = () => setQuery({ ...draft });
  const resetQuery = () => {
    const empty = { search: '', type: '', status: '' };
    setDraft(empty);
    setQuery(empty);
  };

  return (
    <ClientWorkbench load={load} loadingCopy={t('entities.list.loading')}>
      {data => {
        const rows = buildEntityTableRows(
          data.list.content,
          t,
          value => entityTypeLabel(value, t),
          value => entityEnvironmentLabel(value, t),
          value => entityStatusLabel(value, t),
          formatTime
        );
        const total = data.list.totalElements || rows.length;
        const pageIndex = data.list.pageIndex || 0;
        const pageSize = data.list.pageSize || Math.max(rows.length, 1);
        const rangeFrom = total > 0 ? pageIndex * pageSize + 1 : 0;
        const rangeTo = total > 0 ? Math.min(pageIndex * pageSize + rows.length, total) : 0;
        const abnormalCount = rows.filter(row => row.status !== 'healthy' && row.status !== '健康').length;
        const alertingCount = rows.filter(row => Number(row.activeAlertCount) > 0).length;
        const linkedCount = rows.filter(row => Number(row.relationCount) > 0).length;

        return (
          <EntityListSurface
            t={t}
            rows={rows}
            draft={draft}
            total={total}
            rangeFrom={rangeFrom}
            rangeTo={rangeTo}
            abnormalCount={abnormalCount}
            alertingCount={alertingCount}
            linkedCount={linkedCount}
            onDraftChange={patch => setDraft(prev => ({ ...prev, ...patch }))}
            onSearch={applyQuery}
            onRefresh={applyQuery}
            onReset={resetQuery}
          />
        );
      }}
    </ClientWorkbench>
  );
}
