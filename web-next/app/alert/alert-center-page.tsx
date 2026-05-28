'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertCenterSurface, type AlertEntityResponseResult } from '../../components/pages/alert-center-surface';
import { useI18n } from '../../components/providers/i18n-provider';
import { ClientWorkbench } from '../../components/workbench/client-workbench';
import { api } from '../../lib/alert-api-facade';
import { createAlertInhibitFromFacade, type AlertInhibitFormDraft } from '../../lib/alert-inhibit/controller';
import {
  applyAlertClosureOperationFromFacade,
  buildAlertQueryAfterClosureOperation,
  clampAlertCenterPageIndexAfterDelete,
  loadAlertCenterDataFromFacade,
  type AlertClosureOperationAction,
  type AlertPageData
} from '../../lib/alert-manage/controller';
import {
  ALERT_CENTER_PAGE_SIZE_OPTIONS,
  buildAlertListUrl,
  hasAlertEntityContext,
  type AlertCenterRouteState,
  type AlertQueryState
} from '../../lib/alert-manage/query-state';
import {
  buildAlertClosureOperationFailureFeedback,
  buildAlertClosureOperationFeedback,
  type AlertRuleDialogMode
} from '../../lib/alert-manage/view-model';
import { createAlertSilenceFromFacade, type AlertSilenceFormDraft } from '../../lib/alert-silence/controller';
import { HEADER_ALERT_EVENT_TYPE, HEADER_ALERT_SSE_URL, parseHeaderSseJson } from '../../lib/shell/header-realtime';
import type { GroupAlert } from '../../lib/types';

const EMPTY_ALERT_QUERY: AlertQueryState = {
  search: '',
  status: '',
  severity: '',
  pageIndex: 0,
  pageSize: ALERT_CENTER_PAGE_SIZE_OPTIONS[0],
  entityId: '',
  entityName: '',
  returnTo: ''
};
const EMPTY_ALERT_CENTER_ROUTE_STATE: AlertCenterRouteState = {
  initialQuery: EMPTY_ALERT_QUERY,
  cleanUrl: '/alert',
  shouldCleanUrl: false
};
const ALERT_CENTER_SETTLED_CACHE_TTL_MS = 10_000;

function normalizeEntityResponseAction(action: AlertClosureOperationAction): NonNullable<AlertEntityResponseResult>['action'] {
  return action === 'recover' ? 'resolve' : action;
}

export function resolveRealtimeGroupId(alert: Pick<GroupAlert, 'id' | 'groupKey'> | null | undefined): number | null {
  if (!alert) {
    return null;
  }
  const numericId = Number(alert.id);
  if (Number.isFinite(numericId) && numericId > 0) {
    return numericId;
  }
  const numericGroupKey = Number(alert.groupKey);
  return Number.isFinite(numericGroupKey) && numericGroupKey > 0 ? numericGroupKey : null;
}

export default function AlertCenterPage({ initialRouteState }: { initialRouteState?: AlertCenterRouteState } = {}) {
  const { t } = useI18n();
  const router = useRouter();
  const alertCenterRouteState = initialRouteState ?? EMPTY_ALERT_CENTER_ROUTE_STATE;
  const initialQuery = alertCenterRouteState.initialQuery;
  const [draft, setDraft] = useState<AlertQueryState>(initialQuery);
  const [query, setQuery] = useState<AlertQueryState>(initialQuery);
  const [refreshNonce, setRefreshNonce] = useState(0);
  const [operationFeedback, setOperationFeedback] = useState<{ tone: 'success' | 'danger'; copy: string } | null>(null);
  const [selectedGroupIds, setSelectedGroupIds] = useState<number[]>([]);
  const [entityResponseResult, setEntityResponseResult] = useState<AlertEntityResponseResult>(null);
  const [realtimeEventCount, setRealtimeEventCount] = useState(0);
  const [realtimeGroupIds, setRealtimeGroupIds] = useState<number[]>([]);
  const realtimeHighlightTimers = useRef<number[]>([]);
  const alertListUrl = useMemo(() => buildAlertListUrl(query), [query]);
  const alertCenterCacheKey = useMemo(
    () => ['alert-center', alertListUrl, refreshNonce].join('|'),
    [alertListUrl, refreshNonce]
  );

  useEffect(() => {
    setDraft(initialQuery);
    setQuery(initialQuery);
    setSelectedGroupIds([]);
    setEntityResponseResult(null);
  }, [initialQuery]);

  useEffect(() => {
    if (alertCenterRouteState.shouldCleanUrl) {
      router.replace(alertCenterRouteState.cleanUrl);
    }
  }, [alertCenterRouteState.cleanUrl, alertCenterRouteState.shouldCleanUrl, router]);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.EventSource) {
      return undefined;
    }

    const eventSource = new window.EventSource(HEADER_ALERT_SSE_URL);
    const handleAlertEvent = (event: MessageEvent<string>) => {
      const alert = parseHeaderSseJson<GroupAlert>(event.data);
      if (!alert) {
        return;
      }
      const realtimeGroupId = resolveRealtimeGroupId(alert);
      setRealtimeEventCount(current => current + 1);
      if (realtimeGroupId) {
        setRealtimeGroupIds(current => [realtimeGroupId, ...current.filter(groupId => groupId !== realtimeGroupId)].slice(0, 8));
        const timer = window.setTimeout(() => {
          setRealtimeGroupIds(current => current.filter(groupId => groupId !== realtimeGroupId));
        }, 1000);
        realtimeHighlightTimers.current.push(timer);
      }
      setRefreshNonce(current => current + 1);
    };
    eventSource.addEventListener(HEADER_ALERT_EVENT_TYPE, handleAlertEvent);
    eventSource.onerror = () => {
      eventSource.close();
    };

    return () => {
      eventSource.removeEventListener(HEADER_ALERT_EVENT_TYPE, handleAlertEvent);
      eventSource.close();
    };
  }, []);

  useEffect(() => () => {
    realtimeHighlightTimers.current.forEach(timer => window.clearTimeout(timer));
    realtimeHighlightTimers.current = [];
  }, []);

  const load = useCallback(async (): Promise<AlertPageData> => {
    return loadAlertCenterDataFromFacade(api, query);
  }, [query]);

  const refreshQuery = useCallback(() => {
    const nextQuery = { ...draft, pageIndex: 0, pageSize: draft.pageSize ?? query.pageSize ?? ALERT_CENTER_PAGE_SIZE_OPTIONS[0] };
    setDraft(nextQuery);
    setQuery(nextQuery);
    setSelectedGroupIds([]);
    setRefreshNonce(current => current + 1);
  }, [draft, query.pageSize]);

  const handlePageIndexChange = useCallback((nextPageIndex: number) => {
    const normalizedPageIndex = Math.max(0, Math.floor(nextPageIndex));
    setDraft(current => ({ ...current, pageIndex: normalizedPageIndex }));
    setQuery(current => ({ ...current, pageIndex: normalizedPageIndex }));
    setSelectedGroupIds([]);
  }, []);

  const handlePageSizeChange = useCallback((nextPageSize: number) => {
    const normalizedPageSize = ALERT_CENTER_PAGE_SIZE_OPTIONS.includes(nextPageSize as (typeof ALERT_CENTER_PAGE_SIZE_OPTIONS)[number])
      ? nextPageSize
      : ALERT_CENTER_PAGE_SIZE_OPTIONS[0];
    setDraft(current => ({ ...current, pageIndex: 0, pageSize: normalizedPageSize }));
    setQuery(current => ({ ...current, pageIndex: 0, pageSize: normalizedPageSize }));
    setSelectedGroupIds([]);
  }, []);

  const handleClosureAction = useCallback(async (action: AlertClosureOperationAction, groupId: number | number[], totalElements = 0) => {
    setOperationFeedback(null);
    try {
      await applyAlertClosureOperationFromFacade(api.alerts, action, groupId);
      setOperationFeedback({ tone: 'success', copy: buildAlertClosureOperationFeedback(action, t) });
      const affectedCount = Array.isArray(groupId) ? groupId.length : 1;
      if (hasAlertEntityContext(query)) {
        setEntityResponseResult({ action: normalizeEntityResponseAction(action), count: affectedCount });
      }
      const buildPostActionQuery = (current: AlertQueryState) => {
        const nextQuery = buildAlertQueryAfterClosureOperation(current, action);
        return action === 'close' || action === 'delete'
          ? clampAlertCenterPageIndexAfterDelete(nextQuery, totalElements, affectedCount)
          : nextQuery;
      };
      setDraft(current => buildPostActionQuery(current));
      setQuery(current => buildPostActionQuery(current));
      setSelectedGroupIds([]);
      setRefreshNonce(current => current + 1);
    } catch (error) {
      setOperationFeedback({
        tone: 'danger',
        copy: buildAlertClosureOperationFailureFeedback(action, t)
      });
    }
  }, [query, t]);

  const handleRuleQuickCreate = useCallback(async (
    mode: AlertRuleDialogMode,
    ruleDraft: AlertSilenceFormDraft | AlertInhibitFormDraft,
    count: number
  ) => {
    setOperationFeedback(null);
    try {
      if (mode === 'silence') {
        await createAlertSilenceFromFacade(api.alertSilences.create, ruleDraft as AlertSilenceFormDraft);
      } else {
        await createAlertInhibitFromFacade(api.alertInhibits.create, ruleDraft as AlertInhibitFormDraft);
      }
      setOperationFeedback({ tone: 'success', copy: t('common.notify.new-success') });
      if (hasAlertEntityContext(query) && count > 0) {
        setEntityResponseResult({ action: mode, count });
      }
      setSelectedGroupIds([]);
      setRefreshNonce(current => current + 1);
    } catch (error) {
      setOperationFeedback({
        tone: 'danger',
        copy: t('common.notify.new-fail')
      });
      throw error;
    }
  }, [query, t]);

  return (
    <ClientWorkbench
      load={load}
      loadingCopy={t('alert.center.loading')}
      cacheKey={alertCenterCacheKey}
      cacheSettledTtlMs={ALERT_CENTER_SETTLED_CACHE_TTL_MS}
    >
      {data => (
        <AlertCenterSurface
          t={t}
          data={data}
          draft={draft}
          onDraftChange={setDraft}
          onRefresh={refreshQuery}
          onClearFilters={() => {
            const cleared = {
              ...draft,
              search: '',
              severity: '',
              status: hasAlertEntityContext(draft) ? 'firing' : '',
              pageIndex: 0,
              pageSize: draft.pageSize ?? query.pageSize ?? ALERT_CENTER_PAGE_SIZE_OPTIONS[0]
            };
            setDraft(cleared);
            setQuery(cleared);
            setSelectedGroupIds([]);
            setEntityResponseResult(null);
          }}
          operationFeedback={operationFeedback}
          entityResponseResult={entityResponseResult}
          realtimeEventCount={realtimeEventCount}
          realtimeGroupIds={realtimeGroupIds}
          pageSizeOptions={[...ALERT_CENTER_PAGE_SIZE_OPTIONS]}
          onPageIndexChange={handlePageIndexChange}
          onPageSizeChange={handlePageSizeChange}
          selectedGroupIds={selectedGroupIds}
          onSelectedGroupIdsChange={setSelectedGroupIds}
          onClosureAction={(action, groupId) => void handleClosureAction(action, groupId, data.groupAlerts.totalElements)}
          onRuleQuickCreate={handleRuleQuickCreate}
        />
      )}
    </ClientWorkbench>
  );
}
