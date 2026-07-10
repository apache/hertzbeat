'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  HzExportTypeDialog,
  HzFileInput,
  type HzExportTypeDialogType,
  type HzStatusTone
} from '@hertzbeat/ui';
import { ClientWorkbench } from '../../../components/workbench/client-workbench';
import { AlertSettingSurface } from '../../../components/pages/alert-setting-surface';
import {
  AlertSettingCreateDialog,
  buildAlertSettingDraftFromDefine,
  createDefaultAlertSettingDraft,
  type AlertSettingCreateDraft,
  type AlertSettingCreateKind,
  type AlertSettingCreateMode,
  type AlertSettingCreatePayload,
  type AlertSettingCreatePreviewFeedback
} from '../../../components/pages/alert-setting-create-dialog';
import { HzConfirmDialog } from '../../../components/ui/hz-confirm-dialog';
import { useI18n } from '../../../components/providers/i18n-provider';
import { getCurrentLocale } from '../../../lib/api-client';
import { api, type AlertDefinePreviewRow } from '../../../lib/alert-api-facade';
import {
  buildAlertDefineExportUrl,
  buildAlertDefineImportUrl,
  deleteAlertDefineFromFacade,
  deleteAlertDefinesFromFacade,
  createAlertDefineFromFacade,
  loadAlertDefineDetailFromFacade,
  loadAlertSettingDataFromFacade,
  updateAlertDefineEnabledFromFacade,
  updateAlertDefineFromFacade
} from '../../../lib/alert-setting/controller';
import { buildAlertSettingEvidenceContext } from '../../../lib/alert-setting/view-model';
import {
  buildAlertSettingAppEntries,
  buildDefineListUrl,
  type AlertSettingRouteState
} from '../../../lib/alert-setting/query-state';
import { formatTime } from '../../../lib/format';
import type { SignalRouteContext } from '../../../lib/signal-route-context';

type SettingDeleteRequest = {
  kind: 'single' | 'batch';
  ids: number[];
};

type AlertSettingActionFeedback = {
  tone: HzStatusTone;
  title: string;
  description?: string;
  contract?:
    | 'delete'
    | 'enable'
    | 'export-fail'
    | 'no-select-delete'
    | 'no-select-export'
    | 'import-success'
    | 'import-fail'
    | 'delete-success'
    | 'enable-success'
    | 'save-success';
  deletedCount?: number;
  toggledRule?: {
    id: number;
    name: string;
    enabled: boolean;
  };
  savedRule?: {
    name: string;
    type: string;
    expr: string;
    enabled: boolean;
    intent: 'create' | 'edit';
  };
};

type AlertSettingSaveFeedback = {
  tone: HzStatusTone;
  title: string;
  description?: string;
  contract: 'create' | 'edit';
};

const ALERT_SETTING_SETTLED_CACHE_TTL_MS = 10_000;
export const ALERT_SETTING_PREVIEW_SAMPLE_LIMIT = 3;
const EMPTY_ALERT_SETTING_ROUTE_STATE: AlertSettingRouteState = {
  signal: null,
  createIntent: null,
  signalContext: {}
};

type AlertSettingPreviewTranslator = (key: string, values?: Record<string, string | number>) => string;

export function buildAlertSettingPreviewSuccessFeedback(
  rows: AlertDefinePreviewRow[],
  t: AlertSettingPreviewTranslator
): AlertSettingCreatePreviewFeedback {
  const sampleRows = rows.slice(0, ALERT_SETTING_PREVIEW_SAMPLE_LIMIT);
  if (rows.length === 0) {
    return {
      tone: 'warning',
      title: t('alert.setting.preview.empty.title'),
      description: t('alert.setting.preview.empty.description'),
      rows: sampleRows,
      totalRows: rows.length,
      sampleLimit: ALERT_SETTING_PREVIEW_SAMPLE_LIMIT,
      contract: 'empty'
    };
  }
  return {
    tone: 'success',
    title: t('alert.setting.preview.success.title', { count: rows.length }),
    description: t('alert.setting.preview.success.description'),
    rows: sampleRows,
    totalRows: rows.length,
    sampleLimit: ALERT_SETTING_PREVIEW_SAMPLE_LIMIT,
    contract: 'success'
  };
}
const ALERT_SETTING_ROUTE_PATH = '/alert/setting';

type AlertSettingListRouteState = {
  search: string;
  pageIndex: number;
  pageSize: number;
};

function parseAlertSettingRouteInteger(value: string | null, fallback: number, minimum = 0) {
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed >= minimum ? parsed : fallback;
}

export function buildAlertSettingCreateDraftSeed(
  signal: string | null | undefined,
  labelsText: string,
  context: SignalRouteContext = {}
): Partial<AlertSettingCreateDraft> {
  const seed: Partial<AlertSettingCreateDraft> = { labelsText };
  const name = context.alertName?.trim();
  const expression = context.alertExpression?.trim();
  const datasource = context.alertDatasource?.trim();
  const template = context.alertTemplate?.trim();
  if (name) seed.name = name;
  if (expression) seed.expr = expression;
  if (datasource) seed.datasource = datasource;
  if (template) seed.template = template;
  if (signal === 'logs') {
    return { ...seed, kind: 'realtime', dataType: 'log' };
  }
  if (signal === 'metrics') {
    return { ...seed, kind: 'realtime', dataType: 'metric' };
  }
  if (signal === 'traces') {
    return { ...seed, kind: 'periodic', dataType: 'trace' };
  }
  return seed;
}

export function resolveAlertSettingInitialCreateMode(
  signal: string | null | undefined,
  createIntent: AlertSettingRouteState['createIntent'],
  draftSeed: Partial<AlertSettingCreateDraft>
): AlertSettingCreateMode | 'closed' {
  if (createIntent !== 'create') {
    return 'closed';
  }
  if ((signal === 'metrics' || signal === 'logs' || signal === 'traces') && draftSeed.expr?.trim()) {
    return 'authoring';
  }
  return 'type';
}

function resolveDownloadFilename(contentDisposition: string | null, fallbackName: string) {
  const match = contentDisposition?.match(/filename\*?=(?:UTF-8'')?("?)([^";]+)\1/i);
  if (!match?.[2]) return fallbackName;
  try {
    return decodeURIComponent(match[2]);
  } catch {
    return match[2];
  }
}

const ALERT_DEFINE_IMPORT_FILE_ACCEPT = '.json,.yaml,.yml,.xlsx';

function isAlertDefineImportFile(file: File) {
  const normalizedName = file.name.trim().toLowerCase();
  return (
    normalizedName.endsWith('.json') ||
    normalizedName.endsWith('.yaml') ||
    normalizedName.endsWith('.yml') ||
    normalizedName.endsWith('.xlsx')
  );
}

export default function AlertSettingPage({ initialRouteState }: { initialRouteState?: AlertSettingRouteState } = {}) {
  const { t } = useI18n();
  const router = useRouter();
  const searchParams = useSearchParams();
  const routeSearchParamString = searchParams.toString();
  const routeSearch = searchParams.get('search') ?? '';
  const routePageIndex = parseAlertSettingRouteInteger(searchParams.get('pageIndex'), 0);
  const routePageSize = parseAlertSettingRouteInteger(searchParams.get('pageSize'), 8, 1);
  const routeListState = useMemo<AlertSettingListRouteState>(() => ({
    search: routeSearch,
    pageIndex: routePageIndex,
    pageSize: routePageSize
  }), [routePageIndex, routePageSize, routeSearch]);
  const alertSettingRouteState = initialRouteState ?? EMPTY_ALERT_SETTING_ROUTE_STATE;
  const { signal, createIntent, signalContext } = alertSettingRouteState;
  const evidenceContext = useMemo(
    () => buildAlertSettingEvidenceContext(signal, signalContext, t),
    [signal, signalContext, t]
  );
  const initialCreateDraftSeed = useMemo(
    () => buildAlertSettingCreateDraftSeed(signal, evidenceContext?.labelsText || '', signalContext),
    [signal, evidenceContext, signalContext]
  );
  const [search, setSearch] = useState(routeListState.search);
  const [query, setQuery] = useState(routeListState.search);
  const [pageIndex, setPageIndex] = useState(routeListState.pageIndex);
  const [pageSize, setPageSize] = useState(routeListState.pageSize);
  const [refreshKey, setRefreshKey] = useState(0);
  const [checkedIds, setCheckedIds] = useState<number[]>([]);
  const [createMode, setCreateMode] = useState<AlertSettingCreateMode | 'closed'>(
    () => resolveAlertSettingInitialCreateMode(signal, createIntent, initialCreateDraftSeed)
  );
  const [createDraft, setCreateDraft] = useState(() => createDefaultAlertSettingDraft(initialCreateDraftSeed.kind || 'realtime', initialCreateDraftSeed));
  const [creating, setCreating] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [previewFeedback, setPreviewFeedback] = useState<AlertSettingCreatePreviewFeedback | null>(null);
  const [deleteRequest, setDeleteRequest] = useState<SettingDeleteRequest | null>(null);
  const [deletePending, setDeletePending] = useState(false);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [pendingExportType, setPendingExportType] = useState<HzExportTypeDialogType | null>(null);
  const [pendingActionId, setPendingActionId] = useState<string | null>(null);
  const [actionFeedback, setActionFeedback] = useState<AlertSettingActionFeedback | null>(null);
  const [saveFeedback, setSaveFeedback] = useState<AlertSettingSaveFeedback | null>(null);
  const importInputRef = useRef<HTMLInputElement | null>(null);
  const alertSettingListUrl = useMemo(() => buildDefineListUrl(query, pageIndex, pageSize), [query, pageIndex, pageSize]);
  const alertSettingCacheKey = useMemo(
    () => ['alert-setting', alertSettingListUrl, refreshKey].join('|'),
    [alertSettingListUrl, refreshKey]
  );

  useEffect(() => {
    setSearch(routeListState.search);
    setQuery(routeListState.search);
    setPageIndex(routeListState.pageIndex);
    setPageSize(routeListState.pageSize);
    setCheckedIds([]);
  }, [routeListState]);

  const replaceRouteQuery = useCallback((nextState: AlertSettingListRouteState) => {
    const nextParams = new URLSearchParams(routeSearchParamString);
    const cleanSearch = nextState.search.trim();
    if (cleanSearch) {
      nextParams.set('search', cleanSearch);
    } else {
      nextParams.delete('search');
    }

    if (nextState.pageIndex > 0) {
      nextParams.set('pageIndex', String(nextState.pageIndex));
    } else {
      nextParams.delete('pageIndex');
    }

    if (nextState.pageSize !== 8) {
      nextParams.set('pageSize', String(nextState.pageSize));
    } else {
      nextParams.delete('pageSize');
    }

    const nextParamString = nextParams.toString();
    const nextUrl = nextParamString ? `${ALERT_SETTING_ROUTE_PATH}?${nextParamString}` : ALERT_SETTING_ROUTE_PATH;
    const currentUrl = routeSearchParamString ? `${ALERT_SETTING_ROUTE_PATH}?${routeSearchParamString}` : ALERT_SETTING_ROUTE_PATH;
    if (nextUrl !== currentUrl) {
      router.replace(nextUrl, { scroll: false });
    }
  }, [routeSearchParamString, router]);

  const clearCreateIntentFromRoute = useCallback(() => {
    if (!routeSearchParamString) return;
    const nextParams = new URLSearchParams(routeSearchParamString);
    if (nextParams.get('intent') !== 'create') return;
    nextParams.delete('intent');
    const nextParamString = nextParams.toString();
    const nextUrl = nextParamString ? `${ALERT_SETTING_ROUTE_PATH}?${nextParamString}` : ALERT_SETTING_ROUTE_PATH;
    const currentUrl = `${ALERT_SETTING_ROUTE_PATH}?${routeSearchParamString}`;
    if (nextUrl !== currentUrl) {
      router.replace(nextUrl, { scroll: false });
    }
  }, [routeSearchParamString, router]);

  const load = useCallback(async () => {
    void refreshKey;
    const appMap = await api.alertSettings.appDefines(getCurrentLocale()).catch(() => null);
    const appEntries = buildAlertSettingAppEntries(appMap);
    return loadAlertSettingDataFromFacade(
      {
        list: api.alertSettings.list,
        datasourceStatus: api.alertSettings.datasourceStatus
      },
      query,
      pageIndex,
      pageSize,
      appEntries
    );
  }, [query, pageIndex, pageSize, refreshKey]);

  function openTypeSelection() {
    setSaveFeedback(null);
    setPreviewFeedback(null);
    setActionFeedback(null);
    const draftSeed = buildAlertSettingCreateDraftSeed(signal, evidenceContext?.labelsText || '', signalContext);
    setCreateDraft(createDefaultAlertSettingDraft(draftSeed.kind || 'realtime', draftSeed));
    setCreateMode('type');
  }

  function openRealtimeAuthoring() {
    setSaveFeedback(null);
    setPreviewFeedback(null);
    setActionFeedback(null);
    const draftSeed = buildAlertSettingCreateDraftSeed(signal, evidenceContext?.labelsText || '', signalContext);
    setCreateDraft(createDefaultAlertSettingDraft('realtime', { ...draftSeed, kind: 'realtime' }));
    setCreateMode('authoring');
  }

  function closeCreateFlow() {
    setCreateMode('closed');
    setCreating(false);
    setSaveFeedback(null);
    setPreviewing(false);
    setPreviewFeedback(null);
    clearCreateIntentFromRoute();
  }

  function selectCreateType(kind: AlertSettingCreateKind) {
    setSaveFeedback(null);
    setPreviewFeedback(null);
    setActionFeedback(null);
    setCreateDraft(current => createDefaultAlertSettingDraft(kind, current));
    setCreateMode('authoring');
  }

  function updateCreateDraft(nextDraft: AlertSettingCreateDraft) {
    setPreviewFeedback(null);
    setCreateDraft(nextDraft);
  }

  async function previewCreate(payload: AlertSettingCreatePayload) {
    setSaveFeedback(null);
    const supportsPreview = payload.type.startsWith('periodic_') || payload.type === 'realtime_log';
    if (!supportsPreview) {
      setPreviewFeedback({
        tone: 'warning',
        title: t('alert.setting.preview.unsupported.title'),
        description: t('alert.setting.preview.unsupported.description'),
        contract: 'unsupported'
      });
      return;
    }
    setPreviewing(true);
    setPreviewFeedback(null);
    try {
      const rows = await api.alertSettings.preview(payload.datasource, payload.type, payload.expr);
      setPreviewFeedback(buildAlertSettingPreviewSuccessFeedback(rows, t));
    } catch (error) {
      setPreviewFeedback({
        tone: 'critical',
        title: t('alert.setting.preview.failed.title'),
        description: error instanceof Error ? error.message : undefined,
        contract: 'failed'
      });
    } finally {
      setPreviewing(false);
    }
  }

  async function submitCreate(payload: AlertSettingCreatePayload) {
    const isEdit = typeof payload.id === 'number';
    setCreating(true);
    setSaveFeedback(null);
    try {
      if (isEdit) {
        await updateAlertDefineFromFacade(api.alertSettings.update, payload);
      } else {
        await createAlertDefineFromFacade(api.alertSettings.create, payload);
      }
      setActionFeedback({
        tone: 'success',
        title: t('alert.setting.save.success.title', { name: payload.name }),
        description: t(payload.enable ? 'alert.setting.save.success.enabled' : 'alert.setting.save.success.disabled'),
        contract: 'save-success',
        savedRule: {
          name: payload.name,
          type: payload.type,
          expr: payload.expr,
          enabled: payload.enable,
          intent: isEdit ? 'edit' : 'create'
        }
      });
      closeCreateFlow();
      setCheckedIds([]);
      setRefreshKey(value => value + 1);
    } catch (error) {
      setSaveFeedback({
        tone: 'critical',
        title: t(isEdit ? 'common.notify.edit-fail' : 'common.notify.new-fail'),
        description: error instanceof Error ? error.message : undefined,
        contract: isEdit ? 'edit' : 'create'
      });
    } finally {
      setCreating(false);
    }
  }

  function requestSingleDelete(defineId: number) {
    setDeleteRequest({ kind: 'single', ids: [defineId] });
  }

  function requestBatchDelete() {
    if (checkedIds.length === 0) {
      setActionFeedback({
        tone: 'warning',
        title: t('alert.setting.notify.no-select-delete'),
        contract: 'no-select-delete'
      });
      return;
    }
    setActionFeedback(null);
    setDeleteRequest({ kind: 'batch', ids: checkedIds });
  }

  async function confirmDelete() {
    const request = deleteRequest;
    if (!request || request.ids.length === 0) return;
    setDeletePending(true);
    setActionFeedback(null);
    try {
      if (request.kind === 'batch') {
        await deleteAlertDefinesFromFacade(api.alertSettings.delete, request.ids);
      } else {
        await deleteAlertDefineFromFacade(api.alertSettings.delete, request.ids[0]);
      }
      const deletedCount = request.ids.length;
      setCheckedIds([]);
      setDeleteRequest(null);
      setRefreshKey(value => value + 1);
      setActionFeedback({
        tone: 'success',
        title: t('alert.setting.delete.success.title', { count: deletedCount }),
        description: t('alert.setting.delete.success.description'),
        contract: 'delete-success',
        deletedCount
      });
    } catch (error) {
      setActionFeedback({
        tone: 'critical',
        title: t('common.notify.delete-fail'),
        description: error instanceof Error ? error.message : undefined,
        contract: 'delete'
      });
    } finally {
      setDeletePending(false);
    }
  }

  async function downloadAlertDefineExport(type: HzExportTypeDialogType) {
    const locale = getCurrentLocale();
    const response = await fetch(`/api${buildAlertDefineExportUrl(checkedIds, type)}`, {
      headers: {
        ...(locale ? { 'Accept-Language': locale } : {})
      },
      credentials: 'same-origin',
      cache: 'no-store'
    });
    if (!response.ok) {
      throw new Error(t('common.notify.export-fail-status', { status: response.status }));
    }
    const contentType = response.headers.get('Content-Type') || '';
    if (contentType.includes('application/json')) {
      throw new Error('');
    }
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = resolveDownloadFilename(response.headers.get('Content-Disposition'), type === 'JSON' ? 'alert-defines.json' : 'alert-defines.xlsx');
    anchor.click();
    window.URL.revokeObjectURL(url);
  }

  async function uploadAlertDefineImport(file: File) {
    const locale = getCurrentLocale();
    const formData = new FormData();
    formData.append('file', file);
    const response = await fetch(`/api${buildAlertDefineImportUrl()}`, {
      method: 'POST',
      headers: {
        ...(locale ? { 'Accept-Language': locale } : {})
      },
      credentials: 'same-origin',
      body: formData
    });
    if (!response.ok) {
      throw new Error(t('common.notify.import-fail-status', { status: response.status }));
    }
    const payload = (await response.json()) as { code: number; msg?: string };
    if (payload.code !== 0) {
      throw new Error(payload.msg || t('common.notify.import-fail'));
    }
  }

  async function runSettingAction(
    actionId: string,
    pendingTitle: string,
    task: () => Promise<string>,
    fallbackTitle: string,
    contracts: { success?: AlertSettingActionFeedback['contract']; failure?: AlertSettingActionFeedback['contract'] } = {}
  ) {
    setPendingActionId(actionId);
    setActionFeedback({ tone: 'info', title: pendingTitle });
    try {
      const successTitle = await task();
      setActionFeedback({ tone: 'success', title: successTitle, contract: contracts.success });
      return true;
    } catch (error) {
      setActionFeedback({
        tone: 'critical',
        title: fallbackTitle,
        description: error instanceof Error ? error.message : t('common.failed'),
        contract: contracts.failure
      });
      return false;
    } finally {
      setPendingActionId(current => (current === actionId ? null : current));
    }
  }

  function openExportDialog() {
    if (checkedIds.length === 0) {
      setActionFeedback({
        tone: 'warning',
        title: t('alert.setting.notify.no-select-export'),
        contract: 'no-select-export'
      });
      return;
    }
    setActionFeedback(null);
    setExportDialogOpen(true);
  }

  async function handleExportDialogSelect(type: HzExportTypeDialogType) {
    if (checkedIds.length === 0) {
      setActionFeedback({
        tone: 'warning',
        title: t('alert.setting.notify.no-select-export'),
        contract: 'no-select-export'
      });
      setExportDialogOpen(false);
      return;
    }
    setPendingActionId('export');
    setPendingExportType(type);
    setActionFeedback(null);
    try {
      await downloadAlertDefineExport(type);
      setExportDialogOpen(false);
    } catch (error) {
      setActionFeedback({
        tone: 'critical',
        title: t('common.notify.export-fail'),
        description: error instanceof Error && error.message ? error.message : undefined,
        contract: 'export-fail'
      });
    } finally {
      setPendingActionId(current => (current === 'export' ? null : current));
      setPendingExportType(null);
    }
  }

  function handleImportClick() {
    if (pendingActionId) return;
    importInputRef.current?.click();
  }

  async function handleImportChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (pendingActionId) return;
    if (!isAlertDefineImportFile(file)) {
      setActionFeedback({
        tone: 'warning',
        title: t('common.notify.import-fail'),
        description: t('common.notify.import-invalid-file'),
        contract: 'import-fail'
      });
      return;
    }
    await runSettingAction(
      'import',
      t('common.notify.import-submitted', { taskName: file.name }),
      async () => {
        await uploadAlertDefineImport(file);
        setCheckedIds([]);
        setRefreshKey(value => value + 1);
        return t('common.notify.import-success');
      },
      t('common.notify.import-fail'),
      { success: 'import-success', failure: 'import-fail' }
    );
  }

  return (
    <ClientWorkbench
      load={load}
      loadingCopy={t('alert.setting.loading')}
      cacheKey={alertSettingCacheKey}
      cacheSettledTtlMs={ALERT_SETTING_SETTLED_CACHE_TTL_MS}
    >
      {data => {
        async function handleToggleEnabled(defineId: number, enabled: boolean) {
          const target = data.list.content.find(item => item.id === defineId);
          if (!target) return;
          setActionFeedback(null);
          try {
            await updateAlertDefineEnabledFromFacade(api.alertSettings.update, target, enabled);
            const targetName = target.name || String(defineId);
            setActionFeedback({
              tone: 'success',
              title: t('alert.setting.enable.success.title', { name: targetName }),
              description: t(enabled ? 'alert.setting.enable.success.enabled' : 'alert.setting.enable.success.disabled'),
              contract: 'enable-success',
              toggledRule: {
                id: defineId,
                name: targetName,
                enabled
              }
            });
            setRefreshKey(value => value + 1);
          } catch (error) {
            setActionFeedback({
              tone: 'critical',
              title: t('common.notify.edit-fail'),
              description: error instanceof Error ? error.message : undefined,
              contract: 'enable'
            });
          }
        }

        async function handleEdit(defineId: number) {
          const define = await loadAlertDefineDetailFromFacade(api.alertSettings.detail, defineId);
          setSaveFeedback(null);
          setPreviewFeedback(null);
          setCreateDraft(buildAlertSettingDraftFromDefine(define));
          setCreateMode('authoring');
        }

        const deleteTargetIds = deleteRequest?.ids ?? [];
        const deleteTargetNames = deleteTargetIds
          .map(id => {
            const target = data.list.content.find(item => item.id === id);
            return target ? target.name || String(id) : undefined;
          })
          .filter((name): name is string => Boolean(name))
          .slice(0, 5);
        const hiddenDeleteTargetCount = Math.max(deleteTargetIds.length - deleteTargetNames.length, 0);
        const deleteBaseCopy = deleteRequest?.kind === 'batch'
          ? t('alert.setting.delete.confirm.batch', { count: deleteTargetIds.length })
          : t('alert.setting.delete.confirm.single');
        const deleteConfirmCopy = [
          deleteBaseCopy,
          deleteTargetNames.length > 0
            ? t('alert.setting.delete.confirm.targets', { names: deleteTargetNames.join(', ') })
            : null,
          hiddenDeleteTargetCount > 0
            ? t('alert.setting.delete.confirm.targets-more', { count: hiddenDeleteTargetCount })
            : null
        ].filter(Boolean).join(' ');

        return (
          <>
            <AlertSettingSurface
              t={t}
              data={data}
              search={search}
              checkedIds={checkedIds}
              evidenceContext={evidenceContext}
              formatTime={formatTime}
              onSearchChange={setSearch}
              onApplyFilter={() => {
                const nextSearch = search.trim();
                const nextState = { search: nextSearch, pageIndex: 0, pageSize };
                setSearch(nextSearch);
                setQuery(nextSearch);
                setPageIndex(nextState.pageIndex);
                setCheckedIds([]);
                replaceRouteQuery(nextState);
              }}
              onClearFilter={() => {
                const nextState = { search: '', pageIndex: 0, pageSize };
                setSearch('');
                setQuery('');
                setPageIndex(nextState.pageIndex);
                setCheckedIds([]);
                replaceRouteQuery(nextState);
              }}
              onRefresh={() => {
                setRefreshKey(value => value + 1);
                setCheckedIds([]);
              }}
              onNew={openTypeSelection}
              onNewRealtime={openRealtimeAuthoring}
              onDeleteSelected={requestBatchDelete}
              onExport={openExportDialog}
              onImport={handleImportClick}
              onToggleEnabled={(defineId, enabled) => void handleToggleEnabled(defineId, enabled)}
              onEdit={defineId => void handleEdit(defineId)}
              onDelete={requestSingleDelete}
              onCheckedIdsChange={setCheckedIds}
              requestedPageSize={pageSize}
              onPageIndexChange={nextPageIndex => {
                setPageIndex(nextPageIndex);
                setCheckedIds([]);
                replaceRouteQuery({ search: query, pageIndex: nextPageIndex, pageSize });
              }}
              onPageSizeChange={nextPageSize => {
                const nextState = { search: query, pageIndex: 0, pageSize: nextPageSize };
                setPageIndex(0);
                setPageSize(nextPageSize);
                setCheckedIds([]);
                replaceRouteQuery(nextState);
              }}
              pendingActionId={pendingActionId}
              actionFeedback={actionFeedback}
            />
            <HzFileInput
              ref={importInputRef}
              accept={ALERT_DEFINE_IMPORT_FILE_ACCEPT}
              aria-label={t('alert.setting.import.input')}
              multiple={false}
              data-alert-setting-import-input-owner="hertzbeat-ui-file-input"
              data-alert-setting-import-file-input="true"
              data-alert-setting-import-upload-contract="angular-nz-upload-limit-one-no-list"
              data-alert-setting-import-show-list="false"
              data-alert-setting-import-refresh-contract="angular-success-refresh"
              data-alert-setting-import-failure-refresh-contract="angular-failure-no-refresh"
              onChange={event => void handleImportChange(event)}
            />
            <AlertSettingCreateDialog
              t={t}
              open={createMode !== 'closed'}
              mode={createMode === 'closed' ? 'type' : createMode}
              intent={typeof createDraft.id === 'number' ? 'edit' : 'create'}
              datasourceStatus={data.datasourceStatus}
              draft={createDraft}
              submitting={creating}
              saveFeedback={saveFeedback}
              previewing={previewing}
              previewFeedback={previewFeedback}
              evidenceReturnHref={evidenceContext?.returnHref}
              onClose={closeCreateFlow}
              onSelectType={selectCreateType}
              onDraftChange={updateCreateDraft}
              onBackToType={() => {
                setPreviewFeedback(null);
                setCreateMode('type');
              }}
              onSubmit={submitCreate}
              onPreview={previewCreate}
            />
            <div data-alert-delete-confirm={deleteRequest ? 'open' : 'closed'}>
              <HzConfirmDialog
                open={Boolean(deleteRequest)}
                kicker={t('common.confirm.operation')}
                title={deleteRequest?.kind === 'batch' ? t('common.confirm.delete-batch') : t('common.confirm.delete')}
                copy={deleteConfirmCopy}
                confirmLabel={t('alert.setting.delete.confirm.action')}
                cancelLabel={t('common.button.cancel')}
                pending={deletePending}
                onCancel={() => setDeleteRequest(null)}
                onConfirm={() => void confirmDelete()}
              />
            </div>
            <HzExportTypeDialog
              open={exportDialogOpen}
              title={t('alert.export.switch-type')}
              description={t('alert.setting.export.selected', { count: checkedIds.length })}
              scope="selected"
              selectedCount={checkedIds.length}
              closeLabel={t('common.button.cancel')}
              onClose={() => setExportDialogOpen(false)}
              onSelect={type => void handleExportDialogSelect(type)}
              jsonBusy={pendingExportType === 'JSON'}
              excelBusy={pendingExportType === 'EXCEL'}
              jsonDescription={t('alert.export.use-type', { type: 'JSON' })}
              excelDescription={t('alert.export.use-type', { type: 'EXCEL' })}
              data-alert-setting-export-type-dialog-owner="hertzbeat-ui-export-type-dialog"
              data-alert-setting-export-type-dialog={exportDialogOpen ? 'open' : 'closed'}
              data-alert-setting-export-success-contract="angular-download-closes-dialog-no-toast"
              data-alert-setting-export-success-owner="route-action-feedback-contract"
              data-alert-setting-export-loading-contract="angular-selected-type-only"
              data-alert-setting-export-loading-owner="route-action-feedback-contract"
              jsonButtonProps={
                {
                  'data-alert-setting-export-type-option-owner': 'hertzbeat-ui-export-type-dialog',
                  'data-alert-setting-export-type-option': 'json',
                  'data-alert-setting-export-loading': 'json-selected-only'
                } as React.ComponentProps<typeof HzExportTypeDialog>['jsonButtonProps']
              }
              excelButtonProps={
                {
                  'data-alert-setting-export-type-option-owner': 'hertzbeat-ui-export-type-dialog',
                  'data-alert-setting-export-type-option': 'excel',
                  'data-alert-setting-export-loading': 'excel-selected-only'
                } as React.ComponentProps<typeof HzExportTypeDialog>['excelButtonProps']
              }
            />
          </>
        );
      }}
    </ClientWorkbench>
  );
}
