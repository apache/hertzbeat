'use client';

import { useRouter } from 'next/navigation';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ClientWorkbench } from '@/components/workbench/client-workbench';
import { EntityListSurface } from '../../components/pages/entity-list-surface';
import { useI18n } from '@/components/providers/i18n-provider';
import { api } from '@/lib/api-facade';
import { loadEntityListFromFacade, type EntityListPageTrim } from '@/lib/entity-manage/controller';
import { entityEnvironmentLabel, entityStatusLabel, entityTypeLabel } from '@/lib/entity-manage/display-mapping';
import { formatTime } from '@/lib/format';
import {
  buildEntityListRouteUrl,
  buildEntityUrl,
  isSupportedEntityListPageSize,
  normalizeEntityListPageIndex,
  normalizeEntityListPageSize,
  type EntityQueryState
} from '@/lib/entity-manage/query-state';
import { buildEntityTableRows, isEntityAbnormalStatus, isEntityPendingEvidenceStatus } from '@/lib/entity-manage/view-model';
import type { EntitySummaryInfo, PageResult } from '@/lib/types';

const ENTITY_LIST_SETTLED_CACHE_TTL_MS = 10_000;
const EMPTY_ENTITY_QUERY: EntityQueryState = {
  search: '',
  type: '',
  status: '',
  pageIndex: '',
  source: '',
  returnTo: '',
  pageSize: '',
  timeRange: '',
  start: '',
  end: '',
  refresh: '',
  live: '',
  tz: '',
  probe: '',
  monitorId: '',
  monitorName: '',
  monitorApp: '',
  monitorInstance: '',
  deleteResult: '',
  deletedEntity: ''
};

type EntityListPageOutOfRange = {
  requestedPage: number;
  displayedPage: number;
  totalPages: number;
};

type EntityListLoadResult = {
  list: PageResult<EntitySummaryInfo>;
  pageOutOfRange?: EntityListPageOutOfRange;
};

type EntityListPageSizeAdjustment = {
  requested: string;
  applied: string;
};

function clearEntityListTransientFeedback(query: EntityQueryState): EntityQueryState {
  return { ...query, deleteResult: '', deletedEntity: '' };
}

function normalizeEntityListQueryForRuntime(query: EntityQueryState): EntityQueryState {
  return {
    ...query,
    pageIndex: query.pageIndex?.trim() ? normalizeEntityListPageIndex(query.pageIndex) : '',
    pageSize: query.pageSize?.trim() ? normalizeEntityListPageSize(query.pageSize) : ''
  };
}

function detectEntityListPageSizeAdjustment(query: EntityQueryState): EntityListPageSizeAdjustment | undefined {
  const requested = query.pageSize?.trim();
  if (!requested || isSupportedEntityListPageSize(requested)) return undefined;
  return {
    requested,
    applied: normalizeEntityListPageSize(requested)
  };
}

function resolveEntityListPageOutOfRange(query: EntityQueryState, list: PageResult<EntitySummaryInfo>): EntityListPageOutOfRange | null {
  const total = list.totalElements || 0;
  if (total <= 0 || (list.content?.length || 0) > 0) return null;

  const requestedPageIndex = Number.parseInt(normalizeEntityListPageIndex(query.pageIndex), 10);
  const pageSize = list.pageSize || Number.parseInt(normalizeEntityListPageSize(query.pageSize), 10);
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const lastPageIndex = totalPages - 1;
  if (!Number.isFinite(requestedPageIndex) || requestedPageIndex <= lastPageIndex) return null;

  return {
    requestedPage: requestedPageIndex + 1,
    displayedPage: totalPages,
    totalPages
  };
}

export default function EntityListPage({ initialQuery }: { initialQuery?: EntityQueryState } = {}) {
  const { t } = useI18n();
  const router = useRouter();
  const initialEntityQuery = initialQuery ?? EMPTY_ENTITY_QUERY;
  const [draft, setDraft] = useState<EntityQueryState>(() => normalizeEntityListQueryForRuntime(initialEntityQuery));
  const [query, setQuery] = useState<EntityQueryState>(() => normalizeEntityListQueryForRuntime(initialEntityQuery));
  const [pageSizeAdjustment, setPageSizeAdjustment] = useState<EntityListPageSizeAdjustment | undefined>(() =>
    detectEntityListPageSizeAdjustment(initialEntityQuery)
  );
  const [refreshNonce, setRefreshNonce] = useState(0);
  const entityListUrl = useMemo(() => buildEntityUrl(query), [query]);
  const entityListCacheKey = useMemo(
    () => ['entity-list', entityListUrl, refreshNonce].join(':'),
    [entityListUrl, refreshNonce]
  );

  const load = useCallback(async (): Promise<EntityListLoadResult> => {
    const list = await loadEntityListFromFacade(api.entities.list, query);
    const pageOutOfRange = resolveEntityListPageOutOfRange(query, list);
    if (!pageOutOfRange) {
      return { list };
    }

    const clampedQuery = { ...query, pageIndex: String(pageOutOfRange.totalPages - 1) };
    const clampedList = await loadEntityListFromFacade(api.entities.list, clampedQuery);
    return { list: clampedList, pageOutOfRange };
  }, [query]);

  useEffect(() => {
    if (pageSizeAdjustment) {
      router.replace(buildEntityListRouteUrl(query), { scroll: false });
    }
  }, [pageSizeAdjustment, query, router]);

  const applyRouteQuery = useCallback((nextQuery: EntityQueryState) => {
    const normalizedQuery = normalizeEntityListQueryForRuntime(nextQuery);
    setPageSizeAdjustment(detectEntityListPageSizeAdjustment(nextQuery));
    setDraft(normalizedQuery);
    setQuery(normalizedQuery);
    router.replace(buildEntityListRouteUrl(normalizedQuery), { scroll: false });
  }, [router]);

  const applyQuery = (submittedSearch?: string) => {
    const nextQuery = clearEntityListTransientFeedback({ ...draft, search: submittedSearch ?? draft.search, pageIndex: '0' });
    applyRouteQuery(nextQuery);
  };
  const refreshQuery = () => {
    const nextQuery = normalizeEntityListQueryForRuntime(clearEntityListTransientFeedback({ ...draft }));
    setPageSizeAdjustment(undefined);
    setDraft(nextQuery);
    setQuery(nextQuery);
    setRefreshNonce(current => current + 1);
  };
  const resetQuery = () => {
    const empty = { ...EMPTY_ENTITY_QUERY };
    applyRouteQuery(empty);
  };
  const changePageIndex = (pageIndex: number) => {
    const nextQuery = clearEntityListTransientFeedback({ ...draft, pageIndex: normalizeEntityListPageIndex(pageIndex) });
    applyRouteQuery(nextQuery);
  };
  const changePageSize = (pageSize: number) => {
    const nextQuery = clearEntityListTransientFeedback({ ...draft, pageIndex: '0', pageSize: normalizeEntityListPageSize(pageSize) });
    applyRouteQuery(nextQuery);
  };

  return (
    <ClientWorkbench
      key={entityListCacheKey}
      load={load}
      loadingTitle={t('entities.list.loading.title')}
      loadingCopy={t('entities.list.loading.copy')}
      loadingDelayMs={150}
      cacheKey={entityListCacheKey}
      cacheSettledTtlMs={ENTITY_LIST_SETTLED_CACHE_TTL_MS}
    >
      {data => {
        const effectiveQuery = data.pageOutOfRange
          ? { ...query, pageIndex: String(data.pageOutOfRange.displayedPage - 1) }
          : query;
        const effectiveEntityListRouteUrl = buildEntityListRouteUrl(effectiveQuery);
        const pageIndex = data.pageOutOfRange
          ? data.pageOutOfRange.displayedPage - 1
          : data.list.pageIndex ?? Number.parseInt(normalizeEntityListPageIndex(query.pageIndex), 10);
        const pageSize = data.list.pageSize || Number.parseInt(normalizeEntityListPageSize(query.pageSize), 10);
        const rawContent = Array.isArray(data.list.content) ? data.list.content : [];
        const visibleContent = rawContent.slice(0, pageSize);
        const controllerPayloadTrim = (data.list as PageResult<EntitySummaryInfo> & { contentTrim?: EntityListPageTrim }).contentTrim;
        const payloadTrim = controllerPayloadTrim ?? (rawContent.length > pageSize
          ? { received: rawContent.length, rendered: visibleContent.length }
          : undefined);
        const rows = buildEntityTableRows(
          visibleContent,
          t,
          value => entityTypeLabel(value, t),
          value => entityEnvironmentLabel(value, t),
          value => entityStatusLabel(value, t),
          formatTime,
          {
            returnTo: effectiveEntityListRouteUrl,
            source: effectiveQuery.source,
            timeRange: effectiveQuery.timeRange,
            start: effectiveQuery.start,
            end: effectiveQuery.end,
            refresh: effectiveQuery.refresh,
            live: effectiveQuery.live,
            tz: effectiveQuery.tz,
            probe: effectiveQuery.probe,
            monitorId: effectiveQuery.monitorId,
            monitorName: effectiveQuery.monitorName,
            monitorApp: effectiveQuery.monitorApp,
            monitorInstance: effectiveQuery.monitorInstance
          }
        );
        const total = data.list.totalElements || rows.length;
        const rangeFrom = total > 0 ? pageIndex * pageSize + 1 : 0;
        const rangeTo = total > 0 ? Math.min(pageIndex * pageSize + rows.length, total) : 0;
        const abnormalCount = visibleContent.filter(item => isEntityAbnormalStatus(item.entity?.status)).length;
        const healthPendingCount = visibleContent.filter(item => isEntityPendingEvidenceStatus(item.entity?.status)).length;
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
            pageIndex={pageIndex}
            pageSize={pageSize}
            abnormalCount={abnormalCount}
            healthPendingCount={healthPendingCount}
            alertingCount={alertingCount}
            linkedCount={linkedCount}
            pageOutOfRange={data.pageOutOfRange}
            pageSizeAdjustment={pageSizeAdjustment}
            payloadTrim={payloadTrim}
            deleteSuccess={query.deleteResult === 'success'}
            deletedEntity={query.deletedEntity}
            onDraftChange={patch => setDraft(prev => ({ ...prev, ...patch }))}
            onSearch={applyQuery}
            onRefresh={refreshQuery}
            onReset={resetQuery}
            onPageIndexChange={changePageIndex}
            onPageSizeChange={changePageSize}
          />
        );
      }}
    </ClientWorkbench>
  );
}
