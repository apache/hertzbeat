'use client';

import React, { useCallback, useMemo, useState } from 'react';
import { ClientWorkbench } from '@/components/workbench/client-workbench';
import { EntityListSurface } from '../../components/pages/entity-list-surface';
import { useI18n } from '@/components/providers/i18n-provider';
import { api } from '@/lib/api-facade';
import { loadEntityListFromFacade } from '@/lib/entity-manage/controller';
import { entityEnvironmentLabel, entityStatusLabel, entityTypeLabel } from '@/lib/entity-manage/display-mapping';
import { formatTime } from '@/lib/format';
import { buildEntityUrl, type EntityQueryState } from '@/lib/entity-manage/query-state';
import { buildEntityTableRows, isEntityHealthyStatus } from '@/lib/entity-manage/view-model';

const ENTITY_LIST_SETTLED_CACHE_TTL_MS = 10_000;
const EMPTY_ENTITY_QUERY: EntityQueryState = { search: '', type: '', status: '' };

export default function EntityListPage({ initialQuery }: { initialQuery?: EntityQueryState } = {}) {
  const { t } = useI18n();
  const initialEntityQuery = initialQuery ?? EMPTY_ENTITY_QUERY;
  const [draft, setDraft] = useState<EntityQueryState>(() => ({ ...initialEntityQuery }));
  const [query, setQuery] = useState<EntityQueryState>(() => ({ ...initialEntityQuery }));
  const [refreshNonce, setRefreshNonce] = useState(0);
  const entityListUrl = useMemo(() => buildEntityUrl(query), [query]);
  const entityListCacheKey = useMemo(
    () => ['entity-list', entityListUrl, refreshNonce].join(':'),
    [entityListUrl, refreshNonce]
  );

  const load = useCallback(async () => {
    const list = await loadEntityListFromFacade(api.entities.list, query);
    return { list };
  }, [query]);

  const applyQuery = () => setQuery({ ...draft });
  const refreshQuery = () => {
    setQuery({ ...draft });
    setRefreshNonce(current => current + 1);
  };
  const resetQuery = () => {
    const empty = { ...EMPTY_ENTITY_QUERY };
    setDraft(empty);
    setQuery(empty);
  };

  return (
    <ClientWorkbench
      load={load}
      loadingCopy={t('entities.list.loading')}
      cacheKey={entityListCacheKey}
      cacheSettledTtlMs={ENTITY_LIST_SETTLED_CACHE_TTL_MS}
    >
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
        const abnormalCount = data.list.content.filter(item => !isEntityHealthyStatus(item.entity?.status)).length;
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
            onRefresh={refreshQuery}
            onReset={resetQuery}
          />
        );
      }}
    </ClientWorkbench>
  );
}
