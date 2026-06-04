'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BarChart3, Copy as CopyIcon, FileCode2, FileText, GitBranch as GitBranchIcon, MoreHorizontal, Network, PauseCircle, Pencil, PlayCircle, RefreshCw, Trash2 } from 'lucide-react';
import { ClientWorkbench } from '@/components/workbench/client-workbench';
import { useI18n } from '@/components/providers/i18n-provider';
import {
  HzButton,
  HzButtonLink,
  HzBatchToolbar,
  HzCheckbox,
  HzConfirmDialog,
  HzDataCellText,
  HzDataTable,
  HzEmptyState,
  HzExplorerFrame,
  HzExportTypeDialog,
  HzFileInput,
  HzIconButton,
  HzLabelTag,
  HzInlineFeedback,
  HzMonitorFilterBar,
  HzPaginationBar,
  HzStatusBadge,
  HzTableRowActionButton,
  HzTypePickerDialog,
  type HzExportTypeDialogScope,
  type HzDataColumn,
  type HzTemplateCategory
} from '@hertzbeat/ui';
import { getCurrentLocale, type ApiClientError } from '@/lib/api-client';
import { formatTime } from '@/lib/format';
import { buildMonitorEditCacheKey, loadMonitorEditorDraftFromFacade } from '@/lib/monitor-editor/controller';
import {
  importMonitorsFromFacade,
  loadMonitorListFromFacade,
  resolveDownloadFilename
} from '@/lib/monitor-manage/controller';
import { api } from '@/lib/monitor-api-facade';
import { queryKeys } from '@/lib/query-keys';
import {
  buildMonitorAppPickerGroups,
  type MonitorAppHierarchyItem,
  type MonitorAppPickerGroup
} from '@/lib/monitor-manage/app-picker';
import { monitorStatusTone, statusBadgeVariant, statusLabel } from '@/lib/monitor-manage/display-mapping';
import { renderAngularLabelColor } from '@/lib/label-manage/view-model';
import {
  buildMonitorDetailHref,
  buildMonitorEditHref,
  buildMonitorEntityReturnHref,
  buildMonitorNewHref,
  resolveMonitorCheckboxSelection
} from '@/lib/monitor-manage/navigation';
import {
  applyMonitorWorkspaceDefaults,
  buildMonitorRouteUrl,
  buildMonitorUrl,
  hasMonitorEntityContext,
  type MonitorQueryState
} from '@/lib/monitor-manage/query-state';
import {
  buildMonitorWorkbenchNarrative,
  shouldFallbackMonitorEntityWorkbench
} from '@/lib/monitor-manage/view-model';
import { buildCodeNavigationUrl } from '@/lib/code-navigation';
import type { Monitor, PageResult } from '@/lib/types';
import { consumeWorkbenchLoad } from '@/lib/workbench-load-cache';

type MonitorPageData = {
  list: PageResult<Monitor>;
  query: MonitorQueryState;
  entityWorkbenchFallback: boolean;
};

type MonitorActionFeedback = {
  tone: Exclude<HzStatusTone, 'neutral'>;
  title: string;
  description?: string;
};

type MonitorRowResponseConfirm = {
  action: 'enable' | 'pause';
  monitor: Monitor;
};

type MonitorBatchResponseConfirm = {
  action: 'enable' | 'pause';
  ids: number[];
};

type MonitorAppPickerMode = 'new' | 'filter';

const MONITOR_MANAGE_SETTLED_CACHE_TTL_MS = 10_000;
const MONITOR_MANAGE_AUTO_REFRESH_MS = 120_000;
const MONITOR_MANAGE_DISAPPEARED_GRACE_MS = 5_000;
const EMPTY_MONITOR_QUERY: MonitorQueryState = {
  search: '',
  app: '',
  labels: '',
  status: '',
  pageIndex: '',
  pageSize: '',
  entityId: '',
  entityName: '',
  returnTo: ''
};

function buildOptimisticCopyName(sourceName: string | null | undefined, existingNames: Set<string>) {
  const baseName = sourceName?.trim() || 'monitor';
  let candidate = `${baseName}_copy`;
  let index = 2;
  while (existingNames.has(candidate)) {
    candidate = `${baseName}_copy_${index}`;
    index += 1;
  }
  return candidate;
}

function isMonitorUnavailableRefreshError(error: unknown) {
  const apiError = error as ApiClientError | undefined;
  return apiError?.status === 404 || apiError?.code === 3;
}

function appendDefinedMonitorParam(params: URLSearchParams, key: string, value?: string | number | null) {
  if (value == null) {
    return;
  }
  const text = String(value).trim();
  if (text !== '') {
    params.set(key, text);
  }
}

function buildMonitorRowTimeWindow(item: Monitor) {
  const rawEnd = (item.gmtUpdate || item.gmtCreate || null) as number | string | null;
  const parsedEnd =
    typeof rawEnd === 'number'
      ? rawEnd
      : typeof rawEnd === 'string'
        ? Date.parse(rawEnd)
        : Number.NaN;
  const end = Number.isFinite(parsedEnd) ? parsedEnd : null;
  if (!end) {
    return {};
  }
  return {
    start: Math.max(0, end - 15 * 60 * 1000),
    end
  };
}

function buildMonitorRowSignalHref(kind: 'logs' | 'traces', item: Monitor, query: MonitorQueryState) {
  const params = new URLSearchParams();
  const search = item.name || item.instance || query.search || query.entityName;
  const serviceName = query.entityName || item.name || undefined;
  const timeWindow = buildMonitorRowTimeWindow(item);

  appendDefinedMonitorParam(params, 'entityId', query.entityId);
  appendDefinedMonitorParam(params, 'entityName', query.entityName);
  appendDefinedMonitorParam(params, 'serviceName', serviceName);
  appendDefinedMonitorParam(params, 'start', timeWindow.start);
  appendDefinedMonitorParam(params, 'end', timeWindow.end);
  appendDefinedMonitorParam(params, 'search', kind === 'logs' ? search : undefined);
  appendDefinedMonitorParam(params, 'returnTo', buildMonitorRouteUrl(query));

  const queryString = params.toString();
  return `${kind === 'logs' ? '/log/manage' : '/trace/manage'}${queryString ? `?${queryString}` : ''}`;
}

function buildMonitorRowCodeHref(item: Monitor) {
  const annotations = item.annotations || {};
  return buildCodeNavigationUrl({
    repositoryUrl: annotations.codeRepo || annotations.repositoryUrl,
    provider: annotations.codeProvider,
    defaultPath: annotations.codePath,
    searchQuery: annotations.codeSearch || item.name || item.instance,
    label: annotations.codeLabel || item.name || item.instance
  });
}

export default function MonitorsPage({
  initialQuery,
  explicitStatus = ''
}: {
  initialQuery?: MonitorQueryState;
  explicitStatus?: string;
} = {}) {
  const { t } = useI18n();
  const router = useRouter();
  const queryClient = useQueryClient();
  const initialMonitorQuery = initialQuery ?? EMPTY_MONITOR_QUERY;
  const [draft, setDraft] = useState<MonitorQueryState>(() => initialMonitorQuery);
  const [query, setQuery] = useState<MonitorQueryState>(() => initialMonitorQuery);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [checkedIds, setCheckedIds] = useState<number[]>([]);
  const checkedIdsRef = useRef<number[]>([]);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteTargetIds, setDeleteTargetIds] = useState<number[] | null>(null);
  const [rowResponseConfirm, setRowResponseConfirm] = useState<MonitorRowResponseConfirm | null>(null);
  const [batchResponseConfirm, setBatchResponseConfirm] = useState<MonitorBatchResponseConfirm | null>(null);
  const [exportDialogScope, setExportDialogScope] = useState<HzExportTypeDialogScope | null>(null);
  const [appPickerOpen, setAppPickerOpen] = useState(false);
  const [appPickerLoading, setAppPickerLoading] = useState(false);
  const [appPickerGroups, setAppPickerGroups] = useState<MonitorAppPickerGroup[]>([]);
  const [appPickerSearch, setAppPickerSearch] = useState('');
  const [appPickerError, setAppPickerError] = useState<string | null>(null);
  const [appPickerMode, setAppPickerMode] = useState<MonitorAppPickerMode>('new');
  const [reloadKey, setReloadKey] = useState(0);
  const [actionFeedback, setActionFeedback] = useState<MonitorActionFeedback | null>(null);
  const [pendingActionId, setPendingActionId] = useState<string | null>(null);
  const [optimisticCopies, setOptimisticCopies] = useState<Monitor[]>([]);
  const [copyingIds, setCopyingIds] = useState<number[]>([]);
  const [openRowActionMenuId, setOpenRowActionMenuId] = useState<number | null>(null);
  const importInputRef = useRef<HTMLInputElement | null>(null);
  const warmedMonitorEditIdsRef = useRef<Set<number>>(new Set());
  const previousMonitorsRef = useRef<Monitor[]>([]);
  const disappearedMonitorTimersRef = useRef<Map<number, ReturnType<typeof window.setTimeout>>>(new Map());
  const setCheckedIdsImmediate = useCallback((nextOrUpdater: number[] | ((current: number[]) => number[])) => {
    const next = typeof nextOrUpdater === 'function' ? nextOrUpdater(checkedIdsRef.current) : nextOrUpdater;
    checkedIdsRef.current = next;
    setCheckedIds(next);
  }, []);
  const monitorListUrl = useMemo(() => buildMonitorUrl(query), [query]);
  const monitorManageCacheKey = useMemo(
    () => ['monitor-manage', monitorListUrl, explicitStatus || 'implicit-status', reloadKey].join('|'),
    [explicitStatus, monitorListUrl, reloadKey]
  );
  const invalidateMonitorQueries = useCallback(
    () => queryClient.invalidateQueries({ queryKey: queryKeys.monitors.all }),
    [queryClient]
  );
  const refreshMonitorWorkbench = useCallback(() => {
    void invalidateMonitorQueries();
    setReloadKey(prev => prev + 1);
  }, [invalidateMonitorQueries]);
  const readMonitorListWithQuery = useCallback(
    (nextQuery: MonitorQueryState) =>
      queryClient.fetchQuery({
        queryKey: queryKeys.monitors.list({
          ...nextQuery,
          explicitStatus: explicitStatus || 'implicit-status',
          reloadKey
        }),
        queryFn: () => loadMonitorListFromFacade(api.monitors.page, nextQuery),
        staleTime: 5000
      }),
    [explicitStatus, queryClient, reloadKey]
  );

  useEffect(() => {
    setDraft(initialMonitorQuery);
    setQuery(initialMonitorQuery);
  }, [initialMonitorQuery]);

  useEffect(() => {
    setOptimisticCopies([]);
    setCopyingIds([]);
  }, [monitorListUrl]);

  useEffect(() => {
    checkedIdsRef.current = checkedIds;
  }, [checkedIds]);

  useEffect(
    () => () => {
      disappearedMonitorTimersRef.current.forEach(timerId => window.clearTimeout(timerId));
      disappearedMonitorTimersRef.current.clear();
    },
    []
  );

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setCheckedIdsImmediate([]);
      setSelectedId(null);
      refreshMonitorWorkbench();
    }, MONITOR_MANAGE_AUTO_REFRESH_MS);
    return () => window.clearInterval(intervalId);
  }, [refreshMonitorWorkbench, setCheckedIdsImmediate]);

  const clearDisappearedMonitorTimer = useCallback((monitorId: number) => {
    const timerId = disappearedMonitorTimersRef.current.get(monitorId);
    if (!timerId) {
      return;
    }
    window.clearTimeout(timerId);
    disappearedMonitorTimersRef.current.delete(monitorId);
  }, []);

  const isMonitorDisabled = useCallback((monitor: Monitor) => monitor._displayStatus === 'DISAPPEARED', []);

  const reconcileMonitorStates = useCallback(
    (newMonitors: Monitor[]): Monitor[] => {
      if (previousMonitorsRef.current.length === 0) {
        const activeMonitors = newMonitors.map(monitor => ({ ...monitor, _displayStatus: 'ACTIVE' as const }));
        previousMonitorsRef.current = activeMonitors;
        return activeMonitors;
      }

      const newMonitorMap = new Map(newMonitors.map(monitor => [monitor.id, monitor]));
      const previousMonitorMap = new Map(previousMonitorsRef.current.map(monitor => [monitor.id, monitor]));
      const reconciledMonitors: Monitor[] = [];

      newMonitors.forEach(newMonitor => {
        if (previousMonitorMap.has(newMonitor.id)) {
          clearDisappearedMonitorTimer(newMonitor.id);
        }
        reconciledMonitors.push({ ...newMonitor, _displayStatus: 'ACTIVE' as const });
      });

      previousMonitorsRef.current.forEach(previousMonitor => {
        if (newMonitorMap.has(previousMonitor.id)) {
          return;
        }

        if (previousMonitor._displayStatus === 'DISAPPEARED') {
          reconciledMonitors.push(previousMonitor);
          return;
        }

        const disappearedMonitor = {
          ...previousMonitor,
          _displayStatus: 'DISAPPEARED' as const,
          _disappearTime: Date.now()
        };
        const timerId = window.setTimeout(() => {
          previousMonitorsRef.current = previousMonitorsRef.current.filter(monitor => monitor.id !== disappearedMonitor.id);
          disappearedMonitorTimersRef.current.delete(disappearedMonitor.id);
          setCheckedIdsImmediate(current => current.filter(id => id !== disappearedMonitor.id));
          refreshMonitorWorkbench();
        }, MONITOR_MANAGE_DISAPPEARED_GRACE_MS);
        disappearedMonitorTimersRef.current.set(disappearedMonitor.id, timerId);
        reconciledMonitors.push(disappearedMonitor);
      });

      previousMonitorsRef.current = reconciledMonitors;
      return reconciledMonitors;
    },
    [clearDisappearedMonitorTimer, refreshMonitorWorkbench, setCheckedIdsImmediate]
  );

  const load = useCallback(async (): Promise<MonitorPageData> => {
    void reloadKey;
    const list = await readMonitorListWithQuery(query);
    const entityContextActive = hasMonitorEntityContext(query);
    const statusWasImplicit = explicitStatus.trim() === '';

    if (
      shouldFallbackMonitorEntityWorkbench({
        entityContextActive,
        statusWasImplicit,
        status: query.status,
        totalElements: list.totalElements || 0,
        fellBackToAll: false
      })
    ) {
      const fallbackQuery = {
        ...query,
        status: ''
      };
      const fallbackList = await readMonitorListWithQuery(fallbackQuery);
      return {
        list: {
          ...fallbackList,
          content: reconcileMonitorStates(fallbackList.content)
        },
        query: fallbackQuery,
        entityWorkbenchFallback: true
      };
    }

    return {
      list: {
        ...list,
        content: reconcileMonitorStates(list.content)
      },
      query,
      entityWorkbenchFallback: false
    };
  }, [explicitStatus, query, readMonitorListWithQuery, reconcileMonitorStates, reloadKey]);

  return (
    <div
      data-monitor-response-confirm-closable-contract="angular-nz-closable-false"
      data-monitor-response-confirm-ok-contract="angular-nz-ok-danger-primary"
      data-monitor-response-confirm-modal-owner="hertzbeat-ui-confirm-dialog"
      data-monitor-copy-lifecycle-contract="angular-copy-success-refresh-unavailable-refresh"
      data-monitor-copy-lifecycle-owner="route-copy-contract"
      data-monitor-delete-confirm-closable-contract="angular-nz-closable-false"
      data-monitor-delete-confirm-ok-contract="angular-nz-ok-danger-primary"
      data-monitor-delete-confirm-modal-owner="hertzbeat-ui-confirm-dialog"
      data-monitor-export-type-dialog-contract="angular-nz-modal-600-no-footer"
      data-monitor-export-type-dialog-flow="angular-trigger-type-modal-before-download"
      data-monitor-export-type-dialog-owner="hertzbeat-ui-export-type-dialog"
      data-monitor-batch-response-filter-contract="angular-status-filtered-selection"
      data-monitor-batch-response-filter-owner="route-batch-response-contract"
      data-monitor-batch-more-menu-contract="angular-toolbar-ellipsis-menu"
      data-monitor-batch-more-menu-owner="route-batch-toolbar-contract"
    >
      <ClientWorkbench
        load={load}
        loadingCopy={t('monitors.loading')}
        cacheKey={monitorManageCacheKey}
        cacheSettledTtlMs={MONITOR_MANAGE_SETTLED_CACHE_TTL_MS}
      >
        {data => {
        const backendMonitorIds = new Set(data.list.content.map(item => item.id));
        const backendMonitorNames = new Set(data.list.content.map(item => item.name));
        const visibleOptimisticCopies = optimisticCopies.filter(
          item => !backendMonitorIds.has(item.id) && !backendMonitorNames.has(item.name)
        );
        const tableRows = [...visibleOptimisticCopies, ...data.list.content];
        const selected =
          tableRows.find(item => item.id === selectedId && !isMonitorDisabled(item)) ??
          tableRows.find(item => !isMonitorDisabled(item)) ??
          tableRows[0] ??
          null;
        const resolvedPageIndex = Math.max(0, Number.parseInt(data.query.pageIndex || String(data.list.pageIndex ?? 0), 10) || 0);
        const resolvedPageSize = Math.max(1, Number.parseInt(data.query.pageSize || String(data.list.pageSize ?? 8), 10) || 8);
        const displayTotal = (data.list.totalElements || 0) + visibleOptimisticCopies.length;
        const totalPages = Math.max(1, Math.ceil(displayTotal / resolvedPageSize));
        const handlePageJumpChange = (value: string) => {
          const requestedPage = Number.parseInt(value, 10);
          if (!Number.isFinite(requestedPage)) {
            return;
          }
          const nextPageIndex = Math.min(totalPages - 1, Math.max(0, requestedPage - 1));
          navigateWithQuery({
            ...data.query,
            pageIndex: String(nextPageIndex),
            pageSize: String(resolvedPageSize)
          });
        };
        const entityContextActive = hasMonitorEntityContext(query);
        const selectableTableRows = tableRows.filter(item => !isMonitorDisabled(item));
        const downCount = selectableTableRows.filter(item => item.status === 2).length;
        const resetQuery = () => {
          const empty = applyMonitorWorkspaceDefaults({
            search: '',
            app: '',
            labels: '',
            status: '',
            pageIndex: '',
            pageSize: '',
            entityId: query.entityId,
            entityName: query.entityName,
            returnTo: query.returnTo
          });
          setDraft(empty);
          setQuery(empty);
          setCheckedIdsImmediate([]);
          setSelectedId(null);
          router.replace(buildMonitorRouteUrl(empty));
        };

        const applyQuery = () => {
          const nextQuery = {
            ...draft,
            pageIndex: '0',
            pageSize: draft.pageSize || query.pageSize || '8'
          };
          setQuery(nextQuery);
          setCheckedIdsImmediate([]);
          setSelectedId(null);
          router.replace(buildMonitorRouteUrl(nextQuery));
        };

        const navigateWithQuery = (nextQuery: MonitorQueryState) => {
          setDraft(nextQuery);
          setQuery(nextQuery);
          setCheckedIdsImmediate([]);
          setSelectedId(null);
          router.replace(buildMonitorRouteUrl(nextQuery));
        };

        const handleManualRefresh = () => {
          setCheckedIdsImmediate([]);
          setSelectedId(null);
          refreshMonitorWorkbench();
        };

        const clearSearchFilter = () => {
          navigateWithQuery({
            ...draft,
            search: '',
            pageIndex: '0',
            pageSize: draft.pageSize || query.pageSize || '8'
          });
        };

        const clearLabelFilter = () => {
          navigateWithQuery({
            ...draft,
            labels: '',
            pageIndex: '0',
            pageSize: draft.pageSize || query.pageSize || '8'
          });
        };

        const handleTypeFilterChange = (app: string) => {
          navigateWithQuery({
            ...draft,
            app,
            pageIndex: '0',
            pageSize: draft.pageSize || query.pageSize || '8'
          });
        };

        const checkedCount = checkedIds.length;
        const deleteDialogIds = deleteTargetIds ?? checkedIds;
        const deleteDialogCount = deleteDialogIds.length;
        const currentPageIds = selectableTableRows.map(item => item.id);
        const monitorBatchActionProps = (action: string) =>
          ({
            'data-monitor-manage-batch-action-owner': 'hertzbeat-ui-button',
            'data-monitor-manage-batch-action': action
          }) as React.ButtonHTMLAttributes<HTMLButtonElement>;
        const emptyValue = t('common.none');
        const resolveMonitorTypeLabel = (app?: string | null) => {
          const appValue = app?.trim();
          if (!appValue) return emptyValue;
          const appKey = appValue.toLowerCase();
          const translated = t(`monitor.app.${appKey}`);
          return translated === `monitor.app.${appKey}` ? appValue : translated;
        };
        const navigationContext = {
          app: data.query.app || selected?.app || 'website',
          labels: data.query.labels,
          pageIndex: String(resolvedPageIndex),
          pageSize: String(resolvedPageSize),
          entityId: data.query.entityId,
          entityName: data.query.entityName,
          returnTo: buildMonitorRouteUrl(data.query)
        };
        const newMonitorBaseContext = {
          ...navigationContext,
          app: data.query.app || ''
        };
        const appPickerCategories: HzTemplateCategory[] = appPickerGroups.map(group => ({
          id: group.key,
          label: group.label,
          items: group.rows.map(row => ({
            id: row.app,
            label: row.label
          }))
        }));
        const statusFilterOptions = [
          { value: '', label: t('monitors.status.all'), count: displayTotal },
          { value: '1', label: t('monitors.status.up'), count: selectableTableRows.filter(item => item.status === 1).length },
          { value: '2', label: t('monitors.status.down'), count: downCount },
          { value: '0', label: t('monitors.status.paused'), count: selectableTableRows.filter(item => item.status === 0).length }
        ];
        const monitorTypeValues = Array.from(
          new Set(
            [draft.app, data.query.app, ...tableRows.map(item => item.app)]
              .map(app => app?.trim())
              .filter((app): app is string => Boolean(app))
          )
        ).sort((left, right) => resolveMonitorTypeLabel(left).localeCompare(resolveMonitorTypeLabel(right)));
        const monitorTypeFilterOptions = [
          { value: '', label: t('monitors.type.all') },
          ...monitorTypeValues.map(value => ({
            value,
            label: resolveMonitorTypeLabel(value)
          }))
        ];

        const openAppPicker = async (mode: MonitorAppPickerMode) => {
          setAppPickerMode(mode);
          setAppPickerOpen(true);
          setAppPickerError(null);
          if (appPickerGroups.length > 0) return;
          setAppPickerLoading(true);
          try {
            const locale = getCurrentLocale();
            const hierarchy = await api.monitors.appHierarchy<MonitorAppHierarchyItem[]>(locale);
            setAppPickerGroups(buildMonitorAppPickerGroups(hierarchy, t));
          } catch (error) {
            setAppPickerError(error instanceof Error ? error.message : t('common.load-failed'));
          } finally {
            setAppPickerLoading(false);
          }
        };

        const selectNewMonitorApp = (app: string) => {
          setAppPickerOpen(false);
          setAppPickerSearch('');
          if (appPickerMode === 'filter') {
            handleTypeFilterChange(app);
            return;
          }
          router.push(buildMonitorNewHref({ ...newMonitorBaseContext, app }));
        };

        const handleStatusFilterChange = (status: string) => {
          navigateWithQuery({
            ...draft,
            status,
            pageIndex: '0',
            pageSize: draft.pageSize || query.pageSize || '8'
          });
        };

        const downloadExport = async (response: Response, fallbackName: string) => {
          if (!response.ok) {
            throw new Error(t('common.notify.export-fail-status', { status: response.status }));
          }
          const contentType = response.headers.get('Content-Type') || '';
          if (contentType.includes('application/json')) {
            throw new Error(t('common.notify.export-fail'));
          }
          const blob = await response.blob();
          const url = window.URL.createObjectURL(blob);
          const anchor = document.createElement('a');
          anchor.href = url;
          anchor.download = resolveDownloadFilename(response.headers.get('Content-Disposition'), fallbackName);
          anchor.click();
          window.URL.revokeObjectURL(url);
        };

        const uploadImport = async (file: File) => {
          await importMonitorsFromFacade(api.monitors.import, file);
        };

        const warmMonitorEdit = (item: Monitor, href: string) => {
          router.prefetch(href);
          if (warmedMonitorEditIdsRef.current.has(item.id)) {
            return;
          }
          warmedMonitorEditIdsRef.current.add(item.id);
          void consumeWorkbenchLoad(
            buildMonitorEditCacheKey(item.id),
            () =>
              loadMonitorEditorDraftFromFacade(
                {
                  readMonitorDetail: api.monitors.editorDetail,
                  readCollectors: api.monitors.editorCollectors,
                  readParamDefines: api.monitors.editorParamDefines
                },
                'edit',
                { monitorId: String(item.id) }
              ),
            { settledTtlMs: MONITOR_MANAGE_SETTLED_CACHE_TTL_MS }
          ).catch(() => {
            warmedMonitorEditIdsRef.current.delete(item.id);
          });
        };

        const showSelectionWarning = (message: string) => {
          setActionFeedback({ tone: 'warning', title: message });
        };

        const requireSelection = (message: string) => {
          const selectedIds = checkedIdsRef.current;
          if (selectedIds.length > 0) {
            return selectedIds;
          }
          showSelectionWarning(message);
          return null;
        };
        const requireSelectionByStatus = (
          predicate: (monitor: Monitor) => boolean,
          message: string
        ) => {
          const selectedIds = checkedIdsRef.current;
          const selectedMonitorIds = selectedIds.filter(id => {
            const monitor = tableRows.find(item => item.id === id);
            return monitor ? predicate(monitor) : false;
          });
          if (selectedMonitorIds.length > 0) {
            return selectedMonitorIds;
          }
          showSelectionWarning(message);
          return null;
        };

        const runBatchAction = async (
          actionId: string,
          pendingTitle: string,
          task: () => Promise<string>,
          fallbackErrorTitle: string,
          options?: {
            refreshOnUnavailable?: boolean;
          }
        ): Promise<boolean> => {
          setPendingActionId(actionId);
          setActionFeedback({ tone: 'info', title: pendingTitle });
          try {
            const successTitle = await task();
            setActionFeedback({ tone: 'success', title: successTitle });
            return true;
          } catch (error) {
            if (options?.refreshOnUnavailable && isMonitorUnavailableRefreshError(error)) {
              setCheckedIdsImmediate([]);
              setSelectedId(null);
              refreshMonitorWorkbench();
              setActionFeedback({ tone: 'warning', title: t('monitor.item.unavailable.refresh') });
              return false;
            }
            setActionFeedback({
              tone: 'critical',
              title: fallbackErrorTitle,
              description: error instanceof Error ? error.message : undefined
            });
            return false;
          } finally {
            setPendingActionId(current => (current === actionId ? null : current));
          }
        };

        const handleCopyMonitor = async (item: Monitor) => {
          const optimisticId = -Date.now();
          const optimisticName = buildOptimisticCopyName(item.name, new Set([...backendMonitorNames, ...optimisticCopies.map(copy => copy.name)]));
          const optimisticCopy: Monitor = {
            ...item,
            id: optimisticId,
            name: optimisticName,
            gmtCreate: Date.now(),
            gmtUpdate: Date.now()
          };
          setCopyingIds(prev => Array.from(new Set([...prev, item.id])));
          setOptimisticCopies(prev => [optimisticCopy, ...prev]);
          try {
            await api.monitors.copy(item.id);
            setActionFeedback({ tone: 'success', title: t('monitor.copy.success') });
            refreshMonitorWorkbench();
          } catch (error) {
            setOptimisticCopies(prev => prev.filter(copy => copy.id !== optimisticId));
            if (isMonitorUnavailableRefreshError(error)) {
              setCheckedIdsImmediate([]);
              setSelectedId(null);
              refreshMonitorWorkbench();
              setActionFeedback({ tone: 'warning', title: t('monitor.item.unavailable.refresh') });
              return;
            }
            setActionFeedback({ tone: 'critical', title: error instanceof Error ? error.message : t('monitor.copy.failed') });
          } finally {
            setCopyingIds(prev => prev.filter(id => id !== item.id));
          }
        };

        const handleCopyInstance = async (value: string) => {
          const copyValue = value.trim();
          if (!copyValue) {
            return;
          }
          try {
            await navigator.clipboard?.writeText(copyValue);
            setActionFeedback({ tone: 'success', title: t('common.notify.copy-success') });
          } catch (error) {
            setActionFeedback({
              tone: 'critical',
              title: t('common.notify.copy-fail'),
              description: error instanceof Error ? error.message : undefined
            });
          }
        };

        const refreshAfterDelete = (deletedCount: number) => {
          setCheckedIdsImmediate([]);
          setSelectedId(null);
          setDeleteDialogOpen(false);
          setDeleteTargetIds(null);
          const nextTotal = Math.max(0, displayTotal - deletedCount);
          const nextPageIndex = Math.min(resolvedPageIndex, Math.max(0, Math.ceil(nextTotal / resolvedPageSize) - 1));
          if (nextPageIndex !== resolvedPageIndex) {
            const nextQuery = {
              ...data.query,
              pageIndex: String(nextPageIndex),
              pageSize: String(resolvedPageSize)
            };
            setDraft(nextQuery);
            setQuery(nextQuery);
            router.replace(buildMonitorRouteUrl(nextQuery));
          }
          refreshMonitorWorkbench();
        };

        const handleConfirmDelete = async () => {
          const targetIds = deleteTargetIds ?? checkedIdsRef.current;
          if (targetIds.length === 0) {
            showSelectionWarning(t('common.notify.no-select-delete'));
            setDeleteDialogOpen(false);
            setDeleteTargetIds(null);
            return;
          }
          await runBatchAction('delete', t('common.notify.delete-pending'), async () => {
            const grafanaDeleteTask = Promise.allSettled(targetIds.map(id => api.monitors.deleteGrafanaDashboard(id)));
            await api.monitors.delete(targetIds);
            await grafanaDeleteTask;
            refreshAfterDelete(targetIds.length);
            return t('common.delete-success');
          }, t('common.notify.delete-fail'));
          setDeleteDialogOpen(false);
          setDeleteTargetIds(null);
        };

        const openDeleteDialog = (ids: number[] | null) => {
          setDeleteTargetIds(ids);
          setDeleteDialogOpen(true);
        };

        const handleSelectVisible = () => {
          setCheckedIdsImmediate(currentPageIds);
        };

        const handleSelectAllResults = async () => {
          if (displayTotal <= currentPageIds.length) {
            setCheckedIdsImmediate(currentPageIds);
            return;
          }
          setPendingActionId('select-all-results');
          try {
            const selectAllQuery = {
              ...data.query,
              pageIndex: '0',
              pageSize: String(displayTotal)
            };
            const allResults = await readMonitorListWithQuery(selectAllQuery);
            const allIds = Array.from(new Set([...visibleOptimisticCopies.map(item => item.id), ...allResults.content.map(item => item.id)]));
            setCheckedIdsImmediate(allIds);
          } catch (error) {
            setActionFeedback({ tone: 'critical', title: error instanceof Error ? error.message : t('common.load-failed') });
          } finally {
            setPendingActionId(current => (current === 'select-all-results' ? null : current));
          }
        };

        const handleClearSelection = () => {
          setCheckedIdsImmediate([]);
        };

        const handleExportSelected = async (type: 'JSON' | 'EXCEL') => {
          const selectedIds = requireSelection(t('common.notify.no-select-export'));
          if (!selectedIds) {
            return false;
          }
          const actionId = type === 'JSON' ? 'export-json' : 'export-excel';
          return runBatchAction(actionId, t('common.notify.export-pending'), async () => {
            await downloadExport(
              await api.monitors.exportResponse(selectedIds, type),
              type === 'JSON' ? 'monitors.json' : 'monitors.xlsx'
            );
            return t('common.notify.export-success');
          }, t('common.notify.export-fail'));
        };

        const handleExportAll = async (type: 'JSON' | 'EXCEL') => {
          const actionId = type === 'JSON' ? 'export-all-json' : 'export-all-excel';
          return runBatchAction(actionId, t('common.notify.export-pending'), async () => {
            await downloadExport(
              await api.monitors.exportAllResponse(type),
              type === 'JSON' ? 'monitors-all.json' : 'monitors-all.xlsx'
            );
            return t('common.notify.export-success');
          }, t('common.notify.export-fail'));
        };

        const openExportDialog = (scope: HzExportTypeDialogScope) => {
          if (scope === 'selected' && !requireSelection(t('common.notify.no-select-export'))) {
            return;
          }
          setExportDialogScope(scope);
        };

        const handleExportDialogSelect = async (type: 'JSON' | 'EXCEL') => {
          const currentScope = exportDialogScope;
          if (currentScope === 'selected') {
            const success = await handleExportSelected(type);
            if (success) {
              setExportDialogScope(null);
            }
            return;
          }
          if (currentScope === 'all') {
            const success = await handleExportAll(type);
            if (success) {
              setExportDialogScope(null);
            }
          }
        };

        const handleImportClick = () => {
          importInputRef.current?.click();
        };

        const handleImportChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
          const file = event.target.files?.[0];
          event.target.value = '';
          if (!file) return;
          await runBatchAction(
            'import',
            t('common.notify.import-submitted', { taskName: file.name }),
            async () => {
              await uploadImport(file);
              setCheckedIdsImmediate([]);
              setSelectedId(null);
              refreshMonitorWorkbench();
              return t('common.notify.import-success-detail', { taskName: file.name });
            },
            t('common.notify.import-fail-detail', {
              taskName: file.name,
              errMsg: t('common.notify.import-fail')
            })
          );
        };

        const openBatchResponseConfirm = (action: MonitorBatchResponseConfirm['action']) => {
          const selectedIds =
            action === 'enable'
              ? requireSelectionByStatus(monitor => monitor.status === 0, t('common.notify.no-select-enable'))
              : requireSelectionByStatus(monitor => monitor.status !== 0, t('common.notify.no-select-cancel'));
          if (!selectedIds) return;
          setBatchResponseConfirm({ action, ids: selectedIds });
        };

        const handleEnableSelected = async (selectedIds: number[]) =>
          await runBatchAction('enable', t('common.notify.enable-pending'), async () => {
            await api.monitors.enable(selectedIds);
            setCheckedIdsImmediate([]);
            refreshMonitorWorkbench();
            return t('common.notify.enable-success');
          }, t('common.notify.enable-fail'), { refreshOnUnavailable: true });

        const handlePauseSelected = async (selectedIds: number[]) =>
          await runBatchAction('pause', t('common.notify.cancel-pending'), async () => {
            await api.monitors.pause(selectedIds);
            setCheckedIdsImmediate([]);
            refreshMonitorWorkbench();
            return t('common.notify.cancel-success');
          }, t('common.notify.cancel-fail'), { refreshOnUnavailable: true });

        const batchResponseConfirmBusy =
          batchResponseConfirm?.action === 'enable'
            ? pendingActionId === 'enable'
            : batchResponseConfirm?.action === 'pause'
              ? pendingActionId === 'pause'
              : false;
        const handleConfirmBatchResponse = async () => {
          if (!batchResponseConfirm) return;
          const succeeded =
            batchResponseConfirm.action === 'enable'
              ? await handleEnableSelected(batchResponseConfirm.ids)
              : await handlePauseSelected(batchResponseConfirm.ids);
          if (succeeded) {
            setBatchResponseConfirm(null);
          }
        };

        const openRowResponseConfirm = (item: Monitor, action: MonitorRowResponseConfirm['action']) => {
          setRowResponseConfirm({ action, monitor: item });
        };

        const handleEnableRow = async (item: Monitor) =>
          runBatchAction(`row-enable-${item.id}`, t('common.notify.enable-pending'), async () => {
            await api.monitors.enable([item.id]);
            refreshMonitorWorkbench();
            return t('common.notify.enable-success');
          }, t('common.notify.enable-fail'), { refreshOnUnavailable: true });

        const handlePauseRow = async (item: Monitor) =>
          runBatchAction(`row-pause-${item.id}`, t('common.notify.cancel-pending'), async () => {
            await api.monitors.pause([item.id]);
            refreshMonitorWorkbench();
            return t('common.notify.cancel-success');
          }, t('common.notify.cancel-fail'), { refreshOnUnavailable: true });

        const rowResponseConfirmActionId = rowResponseConfirm
          ? `row-${rowResponseConfirm.action === 'enable' ? 'enable' : 'pause'}-${rowResponseConfirm.monitor.id}`
          : null;
        const rowResponseConfirmBusy = rowResponseConfirmActionId ? pendingActionId === rowResponseConfirmActionId : false;
        const handleConfirmRowResponse = async () => {
          if (!rowResponseConfirm) return;
          const succeeded =
            rowResponseConfirm.action === 'enable'
              ? await handleEnableRow(rowResponseConfirm.monitor)
              : await handlePauseRow(rowResponseConfirm.monitor);
          if (succeeded) {
            setRowResponseConfirm(null);
          }
        };

          return (
          <>
            <HzExplorerFrame
              data-monitor-manage-auto-refresh-owner="react-interval"
              data-monitor-manage-auto-refresh-interval-ms={String(MONITOR_MANAGE_AUTO_REFRESH_MS)}
              data-monitor-manage-auto-refresh-tick={String(reloadKey)}
              data-monitor-response-confirm-closable-contract="angular-nz-closable-false"
              data-monitor-response-confirm-ok-contract="angular-nz-ok-danger-primary"
              data-monitor-response-confirm-modal-owner="hertzbeat-ui-confirm-dialog"
              data-monitor-delete-confirm-closable-contract="angular-nz-closable-false"
              data-monitor-delete-confirm-ok-contract="angular-nz-ok-danger-primary"
              data-monitor-delete-confirm-modal-owner="hertzbeat-ui-confirm-dialog"
              data-monitor-export-type-dialog-contract="angular-nz-modal-600-no-footer"
              data-monitor-export-type-dialog-flow="angular-trigger-type-modal-before-download"
              data-monitor-export-type-dialog-owner="hertzbeat-ui-export-type-dialog"
              title={t('monitors.title')}
              description={
                entityContextActive
                  ? buildMonitorWorkbenchNarrative(
                      {
                        entityContextActive,
                        total: displayTotal,
                        downCount,
                        status: data.query.status,
                        fellBackToAll: data.entityWorkbenchFallback
                      },
                      t
                    )
                  : undefined
              }
              mainId="monitor-manage-main"
              mainLabel={t('monitors.title')}
              filterRailLabel={t('monitors.section.list.title')}
              actions={
                <>
                  {entityContextActive ? (
                    <Link href={buildMonitorEntityReturnHref(query)}>
                      <HzButton
                        size="sm"
                        intent="primary"
                        data-monitor-manage-primary-action-owner="hertzbeat-ui-button"
                        data-monitor-manage-primary-action="entity-return"
                      >
                        {query.entityName || t('entity.response.context.return')}
                      </HzButton>
                    </Link>
                  ) : null}
                  {!entityContextActive ? (
                    <>
                      <HzFileInput
                        ref={importInputRef}
                        data-monitor-manage-import-input-owner="hertzbeat-ui-file-input"
                        data-monitors-import-file-input="true"
                        onChange={event => void handleImportChange(event)}
                      />
                      <HzIconButton
                        label={t('common.refresh')}
                        intent="ghost"
                        onClick={handleManualRefresh}
                        data-monitor-manage-manual-refresh-owner="hertzbeat-ui-icon-button"
                        data-monitor-manage-manual-refresh-action="sync"
                        data-monitor-manage-manual-refresh-tick={String(reloadKey)}
                      >
                        <RefreshCw size={13} />
                      </HzIconButton>
                      {data.query.app ? (
                        <Link href={buildMonitorNewHref({ ...newMonitorBaseContext, app: data.query.app })}>
                          <HzButton
                            size="sm"
                            data-monitor-manage-primary-action-owner="hertzbeat-ui-button"
                            data-monitor-manage-primary-action="new-monitor-link"
                          >
                            {t('monitor.new-monitor')}
                          </HzButton>
                        </Link>
                      ) : (
                        <HzButton
                          size="sm"
                          data-monitor-manage-primary-action-owner="hertzbeat-ui-button"
                          data-monitor-manage-primary-action="new-monitor-picker"
                          data-monitors-new-app-picker-trigger="true"
                          onClick={() => void openAppPicker('new')}
                        >
                          {t('monitor.new-monitor')}
                        </HzButton>
                      )}
                    </>
                  ) : null}
                </>
              }
              queryBar={
                <HzMonitorFilterBar
                  data-monitor-manage-filter-owner="hertzbeat-ui-monitor-filter-bar"
                  searchLabel={t('common.search')}
                  searchPlaceholder={t('monitors.search.placeholder')}
                  searchValue={draft.search}
                  onSearchChange={value => setDraft(prev => ({ ...prev, search: value }))}
                  searchClearLabel={t('common.clear')}
                  onSearchClear={clearSearchFilter}
                  searchClearButtonProps={
                    {
                      'data-monitors-filter-clear-action': 'search',
                      'data-monitor-filter-clear-action-owner': 'hertzbeat-ui-icon-button'
                    } as React.ComponentProps<typeof HzMonitorFilterBar>['searchClearButtonProps']
                  }
                  searchInputProps={
                    {
                      'data-monitors-search-input': 'true',
                      'data-monitor-manage-filter-input-owner': 'hertzbeat-ui-input',
                      'data-monitors-filter-enter-submit': 'search',
                      'data-monitor-filter-enter-submit-owner': 'hertzbeat-ui-input'
                    } as React.InputHTMLAttributes<HTMLInputElement>
                  }
                  labelFilterLabel={t('monitor.search.label')}
                  labelFilterPlaceholder={t('monitor.search.label')}
                  labelFilterValue={draft.labels}
                  onLabelFilterChange={value => setDraft(prev => ({ ...prev, labels: value }))}
                  labelFilterClearLabel={t('common.clear')}
                  onLabelFilterClear={clearLabelFilter}
                  labelFilterClearButtonProps={
                    {
                      'data-monitors-filter-clear-action': 'labels',
                      'data-monitor-label-filter-clear-action-owner': 'hertzbeat-ui-icon-button'
                    } as React.ComponentProps<typeof HzMonitorFilterBar>['labelFilterClearButtonProps']
                  }
                  labelFilterInputProps={
                    {
                      'data-monitors-label-filter-input': 'true',
                      'data-monitor-manage-label-filter-input-owner': 'hertzbeat-ui-input',
                      'data-monitors-filter-enter-submit': 'labels',
                      'data-monitor-label-filter-enter-submit-owner': 'hertzbeat-ui-input'
                    } as React.InputHTMLAttributes<HTMLInputElement>
                  }
                  typeLabel={t('monitor.app')}
                  typeValue={draft.app}
                  typeOptions={monitorTypeFilterOptions}
                  onTypeChange={handleTypeFilterChange}
                  typePickerLabel={t('monitor.search.app')}
                  onTypePickerOpen={() => void openAppPicker('filter')}
                  typePickerButtonProps={
                    {
                      'data-monitor-manage-filter-action-owner': 'hertzbeat-ui-button',
                      'data-monitor-manage-filter-action': 'app-picker',
                      'data-monitors-filter-app-picker-trigger': 'true'
                    } as React.ButtonHTMLAttributes<HTMLButtonElement>
                  }
                  typeSelectProps={{
                    'data-monitor-type-filter': 'true',
                    'data-monitor-manage-filter-select-owner': 'hertzbeat-ui-select',
                    'data-monitor-manage-filter-select': 'type',
                    'data-monitors-app-filter-autosubmit': 'true',
                    'data-monitor-app-filter-autosubmit-owner': 'hertzbeat-ui-select'
                  }}
                  statusLabel={t('common.status')}
                  statusValue={draft.status}
                  statusOptions={statusFilterOptions.map(option => ({
                    value: option.value,
                    label: option.label
                  }))}
                  onStatusChange={handleStatusFilterChange}
                  statusSelectProps={{
                    'data-monitors-status-filter': 'true',
                    'data-monitor-manage-filter-select-owner': 'hertzbeat-ui-select',
                    'data-monitor-manage-filter-select': 'status',
                    'data-monitor-status-filter-autosubmit-owner': 'hertzbeat-ui-select',
                    'data-monitors-status-filter-autosubmit': 'true'
                  }}
                  applyLabel={t('common.apply-filters')}
                  clearLabel={t('common.clear')}
                  onApply={applyQuery}
                  onClear={resetQuery}
                  applyButtonProps={{
                    'data-monitor-manage-filter-action-owner': 'hertzbeat-ui-button',
                    'data-monitor-manage-filter-action': 'apply'
                  }}
                  clearButtonProps={{
                    'data-monitor-manage-filter-action-owner': 'hertzbeat-ui-button',
                    'data-monitor-manage-filter-action': 'clear'
                  }}
                />
              }
            >
              <div
                className="min-w-0"
                data-monitor-manage-shell-owner="hertzbeat-ui-explorer-frame"
              >
                <section className="min-w-0">
                  {tableRows.length === 0 ? (
                    <div className="p-3">
                      <HzEmptyState
                        title={t('monitors.empty-results.title')}
                        description={t('monitors.empty-results.copy')}
                        data-monitor-manage-empty-owner="hertzbeat-ui-empty-state"
                      />
                    </div>
                  ) : (
                    <div className="grid min-w-0 gap-0">
                      <HzBatchToolbar
                        data-monitor-manage-batch-owner="hertzbeat-ui-batch-toolbar"
                        data-monitor-batch-more-menu-contract="angular-toolbar-ellipsis-menu"
                        data-monitor-batch-more-menu-owner="hertzbeat-ui-batch-toolbar"
                        selectionCount={checkedCount}
                        selectionLabel={`${t('common.selected')} / ${displayTotal}`}
                        variant="embedded"
                        overflowLabel={t('monitors.controls.more-actions')}
                        overflowButtonProps={{
                          'data-monitor-batch-more-menu-trigger': 'angular-ellipsis-menu',
                          'data-monitor-batch-more-menu-trigger-owner': 'hertzbeat-ui-icon-button'
                        } as React.ComponentProps<typeof HzBatchToolbar>['overflowButtonProps']}
                        overflowPanelProps={{
                          'data-monitor-batch-more-menu-panel': 'angular-nz-dropdown-menu',
                          'data-monitor-batch-more-menu-clearance': 'floating-overlay-no-table-crop',
                          'data-monitor-batch-more-menu-panel-owner': 'hertzbeat-ui-batch-toolbar'
                        } as React.ComponentProps<typeof HzBatchToolbar>['overflowPanelProps']}
                        actions={[
                          {
                            id: 'select-all-results',
                            label: t('common.select-all-results'),
                            busy: pendingActionId === 'select-all-results',
                            busyLabel: t('common.loading'),
                            disabled: displayTotal === 0 || Boolean(pendingActionId && pendingActionId !== 'select-all-results'),
                            onSelect: () => void handleSelectAllResults(),
                            buttonProps: monitorBatchActionProps('select-all-results')
                          },
                          {
                            id: 'select-page',
                            label: t('common.select-page'),
                            disabled: currentPageIds.length === 0 || pendingActionId !== null,
                            onSelect: handleSelectVisible,
                            buttonProps: monitorBatchActionProps('select-page')
                          },
                          {
                            id: 'clear-selection',
                            label: t('common.clear-selection'),
                            disabled: checkedCount === 0 || pendingActionId !== null,
                            onSelect: handleClearSelection,
                            buttonProps: monitorBatchActionProps('clear-selection')
                          },
                          {
                            id: 'enable',
                            label: t('monitors.controls.enable-selected'),
                            presentation: 'menu',
                            busy: pendingActionId === 'enable',
                            busyLabel: t('common.notify.enable-pending'),
                            disabled: Boolean(pendingActionId && pendingActionId !== 'enable'),
                            onSelect: () => openBatchResponseConfirm('enable'),
                            buttonProps: {
                              ...monitorBatchActionProps('enable'),
                              'data-monitor-batch-response-filter': 'angular-status-filtered-selection',
                              'data-monitor-batch-response-eligible-status': 'paused',
                              'data-monitor-batch-more-menu-action': 'enable'
                            } as React.ButtonHTMLAttributes<HTMLButtonElement>
                          },
                          {
                            id: 'pause',
                            label: t('monitors.controls.pause-selected'),
                            presentation: 'menu',
                            busy: pendingActionId === 'pause',
                            busyLabel: t('common.notify.cancel-pending'),
                            disabled: Boolean(pendingActionId && pendingActionId !== 'pause'),
                            onSelect: () => openBatchResponseConfirm('pause'),
                            buttonProps: {
                              ...monitorBatchActionProps('pause'),
                              'data-monitors-pause-selected-action': 'true',
                              'data-monitor-batch-response-filter': 'angular-status-filtered-selection',
                              'data-monitor-batch-response-eligible-status': 'active',
                              'data-monitor-batch-more-menu-action': 'pause'
                            } as React.ButtonHTMLAttributes<HTMLButtonElement>
                          },
                          ...(!entityContextActive
                            ? [
                                {
                                  id: 'import',
                                  label: t('common.import'),
                                  presentation: 'menu' as const,
                                  busy: pendingActionId === 'import',
                                  busyLabel: t('common.notify.import-pending'),
                                  disabled: Boolean(pendingActionId && pendingActionId !== 'import'),
                                  onSelect: handleImportClick,
                                  buttonProps: {
                                    ...monitorBatchActionProps('import'),
                                    'data-monitor-batch-more-menu-action': 'import'
                                  } as React.ButtonHTMLAttributes<HTMLButtonElement>
                                }
                              ]
                            : []),
                          ...(!entityContextActive
                            ? [
                                {
                                  id: 'export-selected',
                                  label: t('monitor.export'),
                                  presentation: 'menu' as const,
                                  busy: pendingActionId === 'export-json' || pendingActionId === 'export-excel',
                                  busyLabel: t('common.notify.export-pending'),
                                  disabled: Boolean(
                                    pendingActionId && pendingActionId !== 'export-json' && pendingActionId !== 'export-excel'
                                  ),
                                  onSelect: () => openExportDialog('selected'),
                                  buttonProps: {
                                    ...monitorBatchActionProps('export-selected'),
                                    'data-monitors-export-type-trigger': 'selected',
                                    'data-monitor-export-type-trigger-owner': 'hertzbeat-ui-batch-toolbar',
                                    'data-monitor-batch-more-menu-action': 'export-selected'
                                  } as React.ButtonHTMLAttributes<HTMLButtonElement>
                                },
                                {
                                  id: 'export-all',
                                  label: t('monitor.export-all'),
                                  presentation: 'menu' as const,
                                  busy: pendingActionId === 'export-all-json' || pendingActionId === 'export-all-excel',
                                  busyLabel: t('common.notify.export-pending'),
                                  disabled: Boolean(
                                    pendingActionId && pendingActionId !== 'export-all-json' && pendingActionId !== 'export-all-excel'
                                  ),
                                  onSelect: () => openExportDialog('all'),
                                  buttonProps: {
                                    ...monitorBatchActionProps('export-all'),
                                    'data-monitors-export-type-trigger': 'all',
                                    'data-monitor-export-type-trigger-owner': 'hertzbeat-ui-batch-toolbar',
                                    'data-monitor-batch-more-menu-action': 'export-all'
                                  } as React.ButtonHTMLAttributes<HTMLButtonElement>
                                },
                              ]
                            : []),
                          {
                            id: 'delete',
                            label: `${t('common.button.delete')} ${checkedCount > 0 ? `(${checkedCount})` : ''}`,
                            presentation: 'menu',
                            busy: pendingActionId === 'delete',
                            busyLabel: t('common.notify.delete-pending'),
                            tone: 'critical',
                            disabled: Boolean(pendingActionId && pendingActionId !== 'delete'),
                            onSelect: () => {
                              if (!requireSelection(t('common.notify.no-select-delete'))) {
                                return;
                              }
                              openDeleteDialog(null);
                            },
                            buttonProps: {
                              ...monitorBatchActionProps('delete'),
                              'data-monitors-delete-confirm-trigger': 'hertzbeat-ui-modal',
                              'data-monitor-batch-more-menu-action': 'delete'
                            } as React.ButtonHTMLAttributes<HTMLButtonElement>
                          }
                        ]}
                      />
                      {actionFeedback ? (
                        <div data-monitor-action-feedback={actionFeedback.tone}>
                          <HzInlineFeedback
                            tone={actionFeedback.tone}
                            title={actionFeedback.title}
                            description={actionFeedback.description}
                            meta={pendingActionId ? t('common.loading') : undefined}
                            data-monitor-action-feedback-owner="hertzbeat-ui-inline-feedback"
                          />
                        </div>
                      ) : null}
                      <div data-monitor-manage-list-owner="hertzbeat-ui-data-table">
                        <HzDataTable<Monitor>
                          columns={
                            [
                              {
                                key: 'select',
                                header: t('common.select'),
                                width: '96px',
                                render: item => (
                                  <div onClick={event => event.stopPropagation()}>
                                    <HzCheckbox
                                      data-monitor-manage-selection-owner="hertzbeat-ui-checkbox"
                                      data-monitors-row-select={String(item.id)}
                                      data-monitor-manage-selection-disabled={isMonitorDisabled(item) ? 'disappeared' : undefined}
                                      aria-label={t('common.select')}
                                      disabled={isMonitorDisabled(item)}
                                      checked={checkedIds.includes(item.id)}
                                      onChange={event => {
                                        if (isMonitorDisabled(item)) {
                                          return;
                                        }
                                        const nextChecked = event.target.checked;
                                        setCheckedIdsImmediate(prev => {
                                          const next = resolveMonitorCheckboxSelection(prev, selectedId, item.id, nextChecked);
                                          setSelectedId(next.selectedId);
                                          return next.checkedIds;
                                        });
                                      }}
                                    />
                                  </div>
                                )
                              },
                              {
                                key: 'monitor',
                                header: t('monitor.list'),
                                render: item => {
                                  const isDynamicScrape = Boolean(item.scrape && item.scrape !== 'static');
                                  const rowCopy = isDynamicScrape ? t(`monitor.scrape.type.${item.scrape}`) : item.instance || emptyValue;
                                  const canCopyInstance = Boolean(item.instance && !isDynamicScrape);
                                  const entityResponseActionId = item.status === 0 ? `row-enable-${item.id}` : `row-pause-${item.id}`;
                                  const entityResponseBusy = pendingActionId === entityResponseActionId;
                                  const entityResponseDisabled =
                                    isMonitorDisabled(item) ||
                                    entityResponseBusy ||
                                    item.id < 0 ||
                                    Boolean(pendingActionId && pendingActionId !== entityResponseActionId);
                                  const entityTriageReason = entityContextActive
                                    ? item.status === 2
                                      ? t('entity.monitor.workbench.reason.down')
                                      : data.entityWorkbenchFallback
                                        ? t('entity.monitor.workbench.reason.fallback')
                                        : item.status === 0
                                          ? t('entity.monitor.workbench.reason.paused')
                                          : t('entity.monitor.workbench.reason.default')
                                    : null;
                                  const relatedLogsHref = buildMonitorRowSignalHref('logs', item, data.query);
                                  const relatedTracesHref = buildMonitorRowSignalHref('traces', item, data.query);
                                  const codeHref = buildMonitorRowCodeHref(item);
                                  const labelEntries = Object.entries(item.labels || {}).slice(0, 3);
                                  return (
                                    <div className="min-w-0">
                                      <HzDataCellText
                                        variant="title"
                                        display="block"
                                        data-monitor-row-name-owner="hertzbeat-ui-data-cell-text"
                                        data-monitor-row-optimistic-copy={item.id < 0 ? 'true' : undefined}
                                      >
                                        {item.name}
                                      </HzDataCellText>
                                      <div
                                        className="mt-0.5 flex min-w-0 items-center gap-1"
                                        data-monitor-row-instance-copy-layout="angular-host-copy"
                                      >
                                        <HzDataCellText
                                          variant="copy"
                                          display="block"
                                          spacing="stack-tight"
                                          data-monitor-row-copy-owner="hertzbeat-ui-data-cell-text"
                                          data-monitor-row-copy={rowCopy}
                                          data-monitor-row-scrape-display={isDynamicScrape ? 'angular-service-discovery' : undefined}
                                          data-monitor-row-scrape-display-owner={isDynamicScrape ? 'hertzbeat-ui-data-cell-text' : undefined}
                                          data-monitor-row-scrape-value={isDynamicScrape ? item.scrape : undefined}
                                        >
                                          {isDynamicScrape ? (
                                            <>
                                              <GitBranchIcon size={12} aria-hidden="true" data-monitor-row-scrape-icon="partition" />
                                              {rowCopy}
                                            </>
                                          ) : rowCopy}
                                        </HzDataCellText>
                                        {canCopyInstance ? (
                                          <HzIconButton
                                            label={t('common.button.copy.tip')}
                                            intent="ghost"
                                            onClick={event => {
                                              event.stopPropagation();
                                              void handleCopyInstance(item.instance || '');
                                            }}
                                            data-monitor-row-instance-copy="angular-host-copy"
                                            data-monitor-row-instance-copy-owner="hertzbeat-ui-icon-button"
                                            data-monitor-row-instance-copy-target={item.instance}
                                          >
                                            <CopyIcon size={13} />
                                          </HzIconButton>
                                        ) : null}
                                      </div>
                                      {labelEntries.length > 0 ? (
                                        <div
                                          className="mt-1 flex min-w-0 flex-wrap gap-1"
                                          data-monitor-row-labels-owner="hertzbeat-ui-label-tag"
                                          data-monitor-row-label-color="angular-render-label-color"
                                        >
                                          {labelEntries.map(([key, value]) => {
                                            const colorToken = renderAngularLabelColor(key);
                                            return (
                                              <HzLabelTag
                                                key={`${key}:${String(value)}`}
                                                colorToken={colorToken}
                                                data-monitor-row-label-color-token={colorToken}
                                              >
                                                {key}:{String(value)}
                                              </HzLabelTag>
                                            );
                                          })}
                                        </div>
                                      ) : null}
                                      {entityTriageReason ? (
                                        <HzDataCellText
                                          variant="meta"
                                          display="block"
                                          spacing="stack"
                                          casing="plain"
                                          data-monitor-row-entity-triage="angular-entity-reason"
                                          data-monitor-row-entity-triage-owner="hertzbeat-ui-data-cell-text"
                                          data-monitor-row-entity-triage-status={
                                            item.status === 2
                                              ? 'down'
                                              : data.entityWorkbenchFallback
                                                ? 'fallback'
                                                : item.status === 0
                                                  ? 'paused'
                                                  : 'default'
                                          }
                                        >
                                          {entityTriageReason}
                                        </HzDataCellText>
                                      ) : null}
                                      {entityContextActive ? (
                                        <HzButton
                                          size="xs"
                                          intent="secondary"
                                          aria-busy={entityResponseBusy ? 'true' : undefined}
                                          disabled={entityResponseDisabled}
                                          onClick={event => {
                                            event.stopPropagation();
                                            openRowResponseConfirm(item, item.status === 0 ? 'enable' : 'pause');
                                          }}
                                          data-monitor-row-entity-response-action="angular-inline-host-action"
                                          data-monitor-row-entity-response-owner="hertzbeat-ui-button"
                                          data-monitor-row-response-action={item.status === 0 ? 'enable' : 'pause'}
                                          data-monitor-row-action-disabled={isMonitorDisabled(item) ? 'disappeared' : undefined}
                                        >
                                          {item.status === 0 ? <PlayCircle size={13} /> : <PauseCircle size={13} />}
                                          {item.status === 0 ? t('monitor.enable') : t('monitor.cancel')}
                                        </HzButton>
                                      ) : null}
                                      {entityContextActive ? (
                                        <div
                                          className="mt-2 flex min-w-0 flex-wrap gap-1.5"
                                          data-monitor-row-entity-support-actions="angular-platform-support-action-bar"
                                          data-monitor-row-entity-support-actions-owner="hertzbeat-ui-button-link"
                                        >
                                          <HzButtonLink
                                            component={Link}
                                            href={relatedLogsHref}
                                            size="xs"
                                            intent="secondary"
                                            data-monitor-row-entity-support-action="related-logs"
                                            data-monitor-row-entity-support-target={relatedLogsHref}
                                          >
                                            <FileText size={13} />
                                            {t('entity.response.open-related-logs')}
                                          </HzButtonLink>
                                          <HzButtonLink
                                            component={Link}
                                            href={relatedTracesHref}
                                            size="xs"
                                            intent="secondary"
                                            data-monitor-row-entity-support-action="related-traces"
                                            data-monitor-row-entity-support-target={relatedTracesHref}
                                          >
                                            <Network size={13} />
                                            {t('entity.response.open-related-traces')}
                                          </HzButtonLink>
                                          {codeHref ? (
                                            <HzButtonLink
                                              href={codeHref}
                                              target="_blank"
                                              rel="noopener noreferrer"
                                              size="xs"
                                              intent="secondary"
                                              data-monitor-row-entity-support-action="code"
                                              data-monitor-row-entity-support-target={codeHref}
                                            >
                                              <FileCode2 size={13} />
                                              {t('entity.response.open-code')}
                                            </HzButtonLink>
                                          ) : (
                                            <HzButton
                                              size="xs"
                                              intent="secondary"
                                              disabled
                                              data-monitor-row-entity-support-action="code"
                                              data-monitor-row-entity-support-disabled="missing-code-navigation"
                                            >
                                              <FileCode2 size={13} />
                                              {t('entity.response.open-code')}
                                            </HzButton>
                                          )}
                                        </div>
                                      ) : null}
                                    </div>
                                  );
                                }
                              },
                              {
                                key: 'type',
                                header: t('monitor.app'),
                                width: '156px',
                                render: item => {
                                  const appKey = item.app || '';
                                  const appLabel = resolveMonitorTypeLabel(item.app);
                                  const appFilterHref = appKey ? `/monitors?app=${encodeURIComponent(appKey)}` : null;
                                  const cell = (
                                    <HzDataCellText
                                      variant="type"
                                      data-monitor-row-type-owner="hertzbeat-ui-data-cell-text"
                                      data-monitor-row-type={item.app || emptyValue}
                                    >
                                      {appLabel}
                                    </HzDataCellText>
                                  );

                                  return appFilterHref ? (
                                    <Link
                                      href={appFilterHref}
                                      className="inline-flex max-w-full"
                                      data-monitor-row-app-filter-link="angular-app-tag-link"
                                      data-monitor-row-app-filter-target={appFilterHref}
                                    >
                                      {cell}
                                    </Link>
                                  ) : cell;
                                }
                              },
                              {
                                key: 'status',
                                header: t('common.status'),
                                width: '132px',
                                render: item => (
                                  <HzStatusBadge
                                    tone={monitorStatusTone(item.status)}
                                    data-monitor-manage-status-tone={statusBadgeVariant(item.status)}
                                  >
                                    {statusLabel(item.status, t)}
                                  </HzStatusBadge>
                                )
                              },
                              {
                                key: 'updated',
                                header: t('common.updated'),
                                width: '220px',
                                render: item => {
                                  const updatedTime = formatTime(item.gmtUpdate || item.gmtCreate || null);
                                  return (
                                    <HzDataCellText
                                      variant="copy"
                                      data-monitor-row-updated-owner="hertzbeat-ui-data-cell-text"
                                      data-monitor-row-meta={updatedTime}
                                    >
                                      {updatedTime}
                                    </HzDataCellText>
                                  );
                                }
                              },
                              {
                                key: 'actions',
                                header: t('common.operations'),
                                width: '136px',
                                render: item => {
                                  const rowNavigationContext = {
                                    ...navigationContext,
                                    app: data.query.app || item.app || navigationContext.app
                                  };
                                  const detailHref = buildMonitorDetailHref(item.id, rowNavigationContext);
                                  const editHref = buildMonitorEditHref(item.id, rowNavigationContext);
                                  const copying = copyingIds.includes(item.id);
                                  const rowResponseActionId = item.status === 0 ? `row-enable-${item.id}` : `row-pause-${item.id}`;
                                  const rowResponseBusy = pendingActionId === rowResponseActionId;
                                  const rowDisabled = isMonitorDisabled(item);
                                  const rowActionMenuOpen = openRowActionMenuId === item.id;
                                  return (
                                    <div
                                      className="relative flex justify-end"
                                      data-monitor-row-actions="angular-ellipsis-dropdown"
                                      data-monitor-row-actions-owner="hertzbeat-ui-table-row-action-button"
                                      data-monitor-row-action-menu="angular-ellipsis-dropdown"
                                      data-monitor-row-action-menu-open={rowActionMenuOpen ? 'true' : 'false'}
                                      data-monitor-row-action-menu-layer="overlay-visible-above-table"
                                      data-monitor-row-action-menu-clearance="floating-overlay-no-table-crop"
                                      data-monitor-row-actions-entity-context={entityContextActive ? 'detail-edit-copy-only' : undefined}
                                      onClick={event => event.stopPropagation()}
                                    >
                                      <HzIconButton
                                        label={t('common.edit')}
                                        intent="ghost"
                                        disabled={rowDisabled}
                                        aria-expanded={rowActionMenuOpen}
                                        onClick={() => setOpenRowActionMenuId(rowActionMenuOpen ? null : item.id)}
                                        data-monitor-row-action-menu-trigger="angular-ellipsis-dropdown"
                                        data-monitor-row-action-menu-trigger-owner="hertzbeat-ui-icon-button"
                                        data-monitor-row-action-menu-open={rowActionMenuOpen ? 'true' : 'false'}
                                        data-monitor-row-action-disabled={rowDisabled ? 'disappeared' : undefined}
                                      >
                                        <MoreHorizontal size={14} />
                                      </HzIconButton>
                                      <div
                                        hidden={!rowActionMenuOpen}
                                        className="absolute right-0 top-7 z-30 grid min-w-[176px] gap-1 border border-[var(--hz-ui-line-strong)] bg-[var(--hz-ui-surface-raised)] p-1 shadow-[0_18px_42px_rgba(0,0,0,0.42)]"
                                        data-monitor-row-action-menu-panel="angular-nz-dropdown-menu"
                                        data-monitor-row-action-menu-panel-open={rowActionMenuOpen ? 'true' : 'false'}
                                        data-monitor-row-action-menu-layer-panel="overlay-visible-above-table"
                                        data-monitor-row-action-menu-clearance-panel="floating-overlay-no-table-crop"
                                      >
                                        {rowDisabled ? (
                                          <HzTableRowActionButton
                                            disabled
                                            width="root-span"
                                            data-monitors-open-detail-action="true"
                                            data-monitor-row-action-owner="hertzbeat-ui-table-row-action-button"
                                            data-monitor-row-action="detail"
                                            data-monitor-row-action-disabled="disappeared"
                                          >
                                            <BarChart3 size={13} />
                                            {t('monitor.detail')}
                                          </HzTableRowActionButton>
                                        ) : (
                                          <HzButtonLink
                                            component={Link}
                                            href={detailHref}
                                            size="xs"
                                            intent="ghost"
                                            layout="full"
                                            onClick={() => setOpenRowActionMenuId(null)}
                                            data-monitors-open-detail-action="true"
                                            data-monitor-row-action-owner="hertzbeat-ui-button-link"
                                            data-monitor-row-action="detail"
                                          >
                                            <BarChart3 size={13} />
                                            {t('monitor.detail')}
                                          </HzButtonLink>
                                        )}
                                        {rowDisabled ? (
                                          <HzTableRowActionButton
                                            disabled
                                            width="root-span"
                                            data-monitors-edit-action="true"
                                            data-monitor-row-action-owner="hertzbeat-ui-table-row-action-button"
                                            data-monitor-row-action="edit"
                                            data-monitor-row-action-disabled="disappeared"
                                          >
                                            <Pencil size={13} />
                                            {t('monitor.edit-monitor')}
                                          </HzTableRowActionButton>
                                        ) : (
                                          <HzButtonLink
                                            component={Link}
                                            href={editHref}
                                            size="xs"
                                            intent="ghost"
                                            layout="full"
                                            onClick={() => setOpenRowActionMenuId(null)}
                                            onFocus={() => warmMonitorEdit(item, editHref)}
                                            onMouseEnter={() => warmMonitorEdit(item, editHref)}
                                            onPointerDown={() => warmMonitorEdit(item, editHref)}
                                            data-monitors-edit-action="true"
                                            data-monitor-row-action-owner="hertzbeat-ui-button-link"
                                            data-monitor-row-action="edit"
                                          >
                                            <Pencil size={13} />
                                            {t('monitor.edit-monitor')}
                                          </HzButtonLink>
                                        )}
                                        <HzTableRowActionButton
                                          width="root-span"
                                          aria-busy={copying ? 'true' : undefined}
                                          disabled={rowDisabled || copying || item.id < 0}
                                          onClick={() => {
                                            setOpenRowActionMenuId(null);
                                            void handleCopyMonitor(item);
                                          }}
                                          data-monitors-copy-action="true"
                                          data-monitor-row-copy-lifecycle="angular-copy-success-refresh-unavailable-refresh"
                                          data-monitor-row-copy-lifecycle-owner="hertzbeat-ui-table-row-action-button"
                                          data-monitor-row-action-owner="hertzbeat-ui-table-row-action-button"
                                          data-monitor-row-action="copy"
                                          data-monitor-row-action-disabled={rowDisabled ? 'disappeared' : undefined}
                                        >
                                          <CopyIcon size={13} />
                                          {t('monitor.copy.action')}
                                        </HzTableRowActionButton>
                                        {!entityContextActive && item.status === 0 ? (
                                          <HzTableRowActionButton
                                            width="root-span"
                                            aria-busy={rowResponseBusy ? 'true' : undefined}
                                            disabled={rowDisabled || rowResponseBusy || item.id < 0 || Boolean(pendingActionId && pendingActionId !== rowResponseActionId)}
                                            onClick={() => {
                                              setOpenRowActionMenuId(null);
                                              openRowResponseConfirm(item, 'enable');
                                            }}
                                            data-monitor-row-response-action-owner="hertzbeat-ui-table-row-action-button"
                                            data-monitor-row-response-action="enable"
                                            data-monitor-row-action-disabled={rowDisabled ? 'disappeared' : undefined}
                                          >
                                            <PlayCircle size={13} />
                                            {t('monitor.enable')}
                                          </HzTableRowActionButton>
                                        ) : !entityContextActive ? (
                                          <HzTableRowActionButton
                                            width="root-span"
                                            aria-busy={rowResponseBusy ? 'true' : undefined}
                                            disabled={rowDisabled || rowResponseBusy || item.id < 0 || Boolean(pendingActionId && pendingActionId !== rowResponseActionId)}
                                            onClick={() => {
                                              setOpenRowActionMenuId(null);
                                              openRowResponseConfirm(item, 'pause');
                                            }}
                                            data-monitor-row-response-action-owner="hertzbeat-ui-table-row-action-button"
                                            data-monitor-row-response-action="pause"
                                            data-monitor-row-action-disabled={rowDisabled ? 'disappeared' : undefined}
                                          >
                                            <PauseCircle size={13} />
                                            {t('monitor.cancel')}
                                          </HzTableRowActionButton>
                                        ) : null}
                                        {!entityContextActive ? (
                                          <HzTableRowActionButton
                                            width="root-span"
                                            intent="danger"
                                            disabled={rowDisabled || item.id < 0 || Boolean(pendingActionId)}
                                            onClick={() => {
                                              setOpenRowActionMenuId(null);
                                              openDeleteDialog([item.id]);
                                            }}
                                            data-monitor-row-delete-action-owner="hertzbeat-ui-table-row-action-button"
                                            data-monitor-row-delete-action="single"
                                            data-monitor-row-action-disabled={rowDisabled ? 'disappeared' : undefined}
                                          >
                                            <Trash2 size={13} />
                                            {t('monitor.delete-monitor')}
                                          </HzTableRowActionButton>
                                        ) : null}
                                      </div>
                                    </div>
                                  );
                                }
                              }
                            ] satisfies HzDataColumn<Monitor>[]
                          }
                          rows={tableRows}
                          getRowKey={item => item.id}
                          selectedRowKey={selected?.id}
                          getRowProps={item =>
                            isMonitorDisabled(item)
                              ? {
                                  'aria-disabled': 'true',
                                  'data-monitor-row-disabled': 'disappeared',
                                  className: 'opacity-55'
                                }
                              : undefined
                          }
                          onRowClick={item => {
                            if (isMonitorDisabled(item)) {
                              return;
                            }
                            setSelectedId(item.id);
                            router.push(buildMonitorDetailHref(item.id, navigationContext));
                          }}
                          emptyLabel={t('monitors.empty-results.title')}
                          variant="embedded"
                          data-monitor-manage-list-variant="embedded"
                        />
                      </div>
                      <HzPaginationBar
                        data-monitor-manage-pagination-owner="hertzbeat-ui-pagination-bar"
                        summary={`${t('common.page')} ${resolvedPageIndex + 1} / ${totalPages} · ${t('monitor.center.console.result.total')} ${displayTotal}`}
                        pageSizeLabel={t('common.page-size')}
                        pageSizeValue={String(resolvedPageSize)}
                        pageSizeOptions={[
                          { value: '8', label: '8' },
                          { value: '20', label: '20' },
                          { value: '50', label: '50' }
                        ]}
                        pageSizeSelectProps={{
                          'data-monitor-manage-pagination-select-owner': 'hertzbeat-ui-select'
                        }}
                        onPageSizeChange={value =>
                          navigateWithQuery({
                            ...data.query,
                            pageIndex: '0',
                            pageSize: value
                          })
                        }
                        previousLabel={t('common.previous-page')}
                        nextLabel={t('common.next-page')}
                        pageJumpLabel={t('common.page')}
                        pageJumpValue={String(resolvedPageIndex + 1)}
                        pageJumpMax={totalPages}
                        onPageJumpChange={handlePageJumpChange}
                        pageJumpInputProps={{
                          'data-monitor-manage-pagination-page-jump-owner': 'hertzbeat-ui-input',
                          'data-monitor-manage-pagination-action': 'page-jump'
                        }}
                        previousDisabled={resolvedPageIndex <= 0}
                        nextDisabled={resolvedPageIndex >= totalPages - 1}
                        previousButtonProps={{
                          'data-monitor-manage-pagination-action-owner': 'hertzbeat-ui-button',
                          'data-monitor-manage-pagination-action': 'previous'
                        }}
                        nextButtonProps={{
                          'data-monitor-manage-pagination-action-owner': 'hertzbeat-ui-button',
                          'data-monitor-manage-pagination-action': 'next'
                        }}
                        onPrevious={() =>
                          navigateWithQuery({
                            ...data.query,
                            pageIndex: String(Math.max(0, resolvedPageIndex - 1)),
                            pageSize: String(resolvedPageSize)
                          })
                        }
                        onNext={() =>
                          navigateWithQuery({
                            ...data.query,
                            pageIndex: String(Math.min(totalPages - 1, resolvedPageIndex + 1)),
                            pageSize: String(resolvedPageSize)
                          })
                        }
                      />
                    </div>
                  )}
                </section>
              </div>
            </HzExplorerFrame>
            <div data-monitors-new-app-picker={appPickerOpen ? 'open' : 'closed'}>
              <HzTypePickerDialog
                open={appPickerOpen}
                onClose={() => setAppPickerOpen(false)}
                title={appPickerMode === 'filter' ? t('monitor.search.app') : t('monitor.new-monitor')}
                description={appPickerLoading ? t('common.loading') : appPickerError || undefined}
                categories={appPickerCategories}
                selectedId={data.query.app || undefined}
                search={appPickerSearch}
                onSearchChange={setAppPickerSearch}
                onSelect={selectNewMonitorApp}
                searchInputProps={
                  {
                    'data-monitor-app-picker-search-owner': 'hertzbeat-ui-input',
                    'data-monitor-app-picker-search-action': 'filter',
                    'data-monitors-app-picker-search-input': 'true'
                  } as React.ComponentProps<typeof HzTypePickerDialog>['searchInputProps']
                }
                labels={{
                  close: t('monitors.app-picker.close'),
                  catalogTitle: t('monitors.app-picker.catalog-title'),
                  templatePicker: {
                    itemCount: total => `${total} ${t('monitors.app-picker.item-count')}`,
                    searchPlaceholder: t('monitors.app-picker.search-placeholder'),
                    empty: t('monitors.app-picker.empty')
                  }
                }}
              />
            </div>
            <HzExportTypeDialog
              open={exportDialogScope !== null}
              title={t('monitor.export.switch-type')}
              description={
                exportDialogScope === 'selected'
                  ? t('monitor.export.use-type', { type: `${checkedCount}` })
                  : t('monitor.export-all.use-type', { type: `${displayTotal}` })
              }
              scope={exportDialogScope ?? 'selected'}
              selectedCount={checkedCount}
              closeLabel={t('common.button.cancel')}
              onClose={() => setExportDialogScope(null)}
              onSelect={type => void handleExportDialogSelect(type)}
              jsonBusy={pendingActionId === (exportDialogScope === 'all' ? 'export-all-json' : 'export-json')}
              excelBusy={pendingActionId === (exportDialogScope === 'all' ? 'export-all-excel' : 'export-excel')}
              jsonDescription={
                exportDialogScope === 'all'
                  ? t('monitor.export-all.use-type', { type: 'JSON' })
                  : t('monitor.export.use-type', { type: 'JSON' })
              }
              excelDescription={
                exportDialogScope === 'all'
                  ? t('monitor.export-all.use-type', { type: 'EXCEL' })
                  : t('monitor.export.use-type', { type: 'EXCEL' })
              }
              data-monitor-export-type-dialog-owner="hertzbeat-ui-export-type-dialog"
              data-monitor-export-type-dialog-contract="angular-nz-modal-600-no-footer"
              data-monitor-export-type-dialog-flow="angular-trigger-type-modal-before-download"
              data-monitors-export-type-dialog={exportDialogScope ?? 'closed'}
              jsonButtonProps={
                {
                  'data-monitor-export-type-option-owner': 'hertzbeat-ui-export-type-dialog',
                  'data-monitors-export-type-option': 'json'
                } as React.ComponentProps<typeof HzExportTypeDialog>['jsonButtonProps']
              }
              excelButtonProps={
                {
                  'data-monitor-export-type-option-owner': 'hertzbeat-ui-export-type-dialog',
                  'data-monitors-export-type-option': 'excel'
                } as React.ComponentProps<typeof HzExportTypeDialog>['excelButtonProps']
              }
            />
            <HzConfirmDialog
              open={Boolean(batchResponseConfirm)}
              onClose={() => {
                if (batchResponseConfirmBusy) return;
                setBatchResponseConfirm(null);
              }}
              kicker={t('menu.monitor.center')}
              title={batchResponseConfirm?.action === 'enable' ? t('common.confirm.enable-batch') : t('common.confirm.cancel-batch')}
              tone="critical"
              cancelLabel={t('common.button.cancel')}
              confirmLabel={t('common.button.ok')}
              onConfirm={() => void handleConfirmBatchResponse()}
              confirmDisabled={!batchResponseConfirm || batchResponseConfirmBusy}
              bodyRhythm="stack"
              data-monitor-batch-response-confirm="angular-modal-confirm"
              data-monitor-batch-response-confirm-owner="hertzbeat-ui-confirm-dialog"
              data-monitor-batch-response-confirm-action={batchResponseConfirm?.action ?? 'closed'}
              data-monitor-batch-response-confirm-count={batchResponseConfirm?.ids.length ?? 0}
              data-monitor-batch-response-confirm-closable="angular-nz-closable-false"
              data-monitor-batch-response-confirm-ok="angular-nz-ok-danger-primary"
            >
              <div data-monitor-batch-response-confirm-body="angular-batch-confirm">
                <HzInlineFeedback
                  tone="critical"
                  title={t('monitors.selected-count', { count: batchResponseConfirm?.ids.length ?? 0 })}
                  data-monitor-batch-response-confirm-selected-owner="hertzbeat-ui-inline-feedback"
                />
              </div>
            </HzConfirmDialog>
            <HzConfirmDialog
              open={Boolean(rowResponseConfirm)}
              onClose={() => {
                if (rowResponseConfirmBusy) return;
                setRowResponseConfirm(null);
              }}
              kicker={t('menu.monitor.center')}
              title={rowResponseConfirm?.action === 'enable' ? t('common.confirm.enable') : t('common.confirm.cancel')}
              tone="critical"
              cancelLabel={t('common.button.cancel')}
              confirmLabel={t('common.button.ok')}
              onConfirm={() => void handleConfirmRowResponse()}
              confirmDisabled={!rowResponseConfirm || rowResponseConfirmBusy}
              bodyRhythm="stack"
              data-monitor-row-response-confirm="angular-modal-confirm"
              data-monitor-row-response-confirm-owner="hertzbeat-ui-confirm-dialog"
              data-monitor-row-response-confirm-action={rowResponseConfirm?.action ?? 'closed'}
              data-monitor-row-response-confirm-target={rowResponseConfirm?.monitor.id ?? 'none'}
              data-monitor-row-response-confirm-closable="angular-nz-closable-false"
              data-monitor-row-response-confirm-ok="angular-nz-ok-danger-primary"
            >
              <div data-monitor-row-response-confirm-body="angular-single-row-confirm">
                <HzInlineFeedback
                  tone="critical"
                  title={rowResponseConfirm?.monitor.name || rowResponseConfirm?.monitor.instance || t('monitors.title')}
                  data-monitor-row-response-confirm-selected-owner="hertzbeat-ui-inline-feedback"
                />
              </div>
            </HzConfirmDialog>
            <HzConfirmDialog
              open={deleteDialogOpen}
              onClose={() => {
                setDeleteDialogOpen(false);
                setDeleteTargetIds(null);
              }}
              kicker={t('menu.monitor.center')}
              title={t('monitors.delete.title')}
              tone="critical"
              cancelLabel={t('common.button.cancel')}
              confirmLabel={t('monitors.delete.confirm')}
              onConfirm={() => void handleConfirmDelete()}
              confirmDisabled={deleteDialogCount === 0}
              bodyRhythm="stack"
              data-monitor-delete-confirm-owner="hertzbeat-ui-confirm-dialog"
              data-monitor-delete-confirm-closable="angular-nz-closable-false"
              data-monitor-delete-confirm-ok="angular-nz-ok-danger-primary"
            >
              <div data-monitors-delete-confirm="hertzbeat-ui-modal">
                <p>{t('monitors.delete.copy')}</p>
                <HzInlineFeedback
                  tone="critical"
                  title={t('monitors.delete.selected', { count: deleteDialogCount })}
                  data-monitor-delete-confirm-selected-owner="hertzbeat-ui-inline-feedback"
                />
              </div>
            </HzConfirmDialog>
          </>
        );
        }}
      </ClientWorkbench>
    </div>
  );
}
