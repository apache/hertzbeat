'use client';

import React, { useCallback, useMemo, useRef, useState } from 'react';
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
  type AlertSettingCreateKind,
  type AlertSettingCreateMode,
  type AlertSettingCreatePayload
} from '../../../components/pages/alert-setting-create-dialog';
import { ColdConfirmDialog } from '../../../components/ui/cold-confirm-dialog';
import { useI18n } from '../../../components/providers/i18n-provider';
import { getCurrentLocale } from '../../../lib/api-client';
import { api } from '../../../lib/alert-api-facade';
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

type SettingDeleteRequest = {
  kind: 'single' | 'batch';
  ids: number[];
};

type AlertSettingActionFeedback = {
  tone: HzStatusTone;
  title: string;
  description?: string;
  contract?: 'delete' | 'enable' | 'export-fail' | 'no-select-delete' | 'no-select-export' | 'import-success' | 'import-fail';
};

type AlertSettingSaveFeedback = {
  tone: HzStatusTone;
  title: string;
  description?: string;
  contract: 'create' | 'edit';
};

const ALERT_SETTING_SETTLED_CACHE_TTL_MS = 10_000;
const EMPTY_ALERT_SETTING_ROUTE_STATE: AlertSettingRouteState = {
  signal: null,
  signalContext: {}
};

function resolveDownloadFilename(contentDisposition: string | null, fallbackName: string) {
  const match = contentDisposition?.match(/filename\*?=(?:UTF-8'')?("?)([^";]+)\1/i);
  if (!match?.[2]) return fallbackName;
  try {
    return decodeURIComponent(match[2]);
  } catch {
    return match[2];
  }
}

export default function AlertSettingPage({ initialRouteState }: { initialRouteState?: AlertSettingRouteState } = {}) {
  const { t } = useI18n();
  const alertSettingRouteState = initialRouteState ?? EMPTY_ALERT_SETTING_ROUTE_STATE;
  const { signal, signalContext } = alertSettingRouteState;
  const evidenceContext = useMemo(
    () => buildAlertSettingEvidenceContext(signal, signalContext, t),
    [signal, signalContext, t]
  );
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(8);
  const [refreshKey, setRefreshKey] = useState(0);
  const [checkedIds, setCheckedIds] = useState<number[]>([]);
  const [createMode, setCreateMode] = useState<AlertSettingCreateMode | 'closed'>('closed');
  const [createDraft, setCreateDraft] = useState(() => createDefaultAlertSettingDraft('realtime'));
  const [creating, setCreating] = useState(false);
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
    setCreateDraft(createDefaultAlertSettingDraft('realtime', { labelsText: evidenceContext?.labelsText || '' }));
    setCreateMode('type');
  }

  function closeCreateFlow() {
    setCreateMode('closed');
    setCreating(false);
    setSaveFeedback(null);
  }

  function selectCreateType(kind: AlertSettingCreateKind) {
    setSaveFeedback(null);
    setCreateDraft(current => createDefaultAlertSettingDraft(kind, current));
    setCreateMode('authoring');
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
        title: t('common.notify.no-select-delete'),
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
      setCheckedIds([]);
      setDeleteRequest(null);
      setRefreshKey(value => value + 1);
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
        title: t('common.notify.no-select-export'),
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
        title: t('common.notify.no-select-export'),
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
    importInputRef.current?.click();
  }

  async function handleImportChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
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
          setCreateDraft(buildAlertSettingDraftFromDefine(define));
          setCreateMode('authoring');
        }

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
                setQuery(search);
                setPageIndex(0);
                setCheckedIds([]);
              }}
              onClearFilter={() => {
                setSearch('');
                setQuery('');
                setPageIndex(0);
                setCheckedIds([]);
              }}
              onRefresh={() => {
                setRefreshKey(value => value + 1);
                setCheckedIds([]);
              }}
              onNew={openTypeSelection}
              onDeleteSelected={requestBatchDelete}
              onExport={openExportDialog}
              onImport={handleImportClick}
              onToggleEnabled={(defineId, enabled) => void handleToggleEnabled(defineId, enabled)}
              onEdit={defineId => void handleEdit(defineId)}
              onDelete={requestSingleDelete}
              onCheckedIdsChange={setCheckedIds}
              onPageIndexChange={nextPageIndex => {
                setPageIndex(nextPageIndex);
                setCheckedIds([]);
              }}
              onPageSizeChange={nextPageSize => {
                setPageIndex(0);
                setPageSize(nextPageSize);
                setCheckedIds([]);
              }}
              pendingActionId={pendingActionId}
              actionFeedback={actionFeedback}
            />
            <HzFileInput
              ref={importInputRef}
              aria-label={t('alert.setting.import.input')}
              data-alert-setting-import-input-owner="hertzbeat-ui-file-input"
              data-alert-setting-import-file-input="true"
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
              evidenceReturnHref={evidenceContext?.returnHref}
              onClose={closeCreateFlow}
              onSelectType={selectCreateType}
              onDraftChange={setCreateDraft}
              onBackToType={() => setCreateMode('type')}
              onSubmit={submitCreate}
            />
            <div data-alert-delete-confirm={deleteRequest ? 'open' : 'closed'}>
              <ColdConfirmDialog
                open={Boolean(deleteRequest)}
                title={deleteRequest?.kind === 'batch' ? t('common.confirm.delete-batch') : t('common.confirm.delete')}
                copy={
                  deleteRequest?.kind === 'batch'
                    ? t('alert.setting.delete.confirm.batch', { count: deleteRequest.ids.length })
                    : t('alert.setting.delete.confirm.single')
                }
                confirmLabel={t('common.button.ok')}
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
