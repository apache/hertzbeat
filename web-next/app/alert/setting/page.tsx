'use client';

import React, { useCallback, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
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
import { apiGet, apiMessageDelete, apiMessageGet, apiMessagePost, apiMessagePut } from '../../../lib/api-client';
import {
  deleteAlertDefine,
  deleteAlertDefines,
  loadAlertDefineDetail,
  loadAlertSettingData,
  updateAlertDefineEnabled
} from '../../../lib/alert-setting/controller';
import { buildAlertSettingEvidenceContext } from '../../../lib/alert-setting/view-model';
import { formatTime } from '../../../lib/format';
import { readSignalRouteContext } from '../../../lib/signal-route-context';

type SettingDeleteRequest = {
  kind: 'single' | 'batch';
  ids: number[];
};

export default function AlertSettingPage() {
  const { t } = useI18n();
  const searchParams = useSearchParams();
  const signal = searchParams.get('signal');
  const signalContext = useMemo(() => readSignalRouteContext(searchParams), [searchParams]);
  const evidenceContext = useMemo(
    () => buildAlertSettingEvidenceContext(signal, signalContext, t),
    [signal, signalContext, t]
  );
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);
  const [checkedIds, setCheckedIds] = useState<number[]>([]);
  const [createMode, setCreateMode] = useState<AlertSettingCreateMode | 'closed'>('closed');
  const [createDraft, setCreateDraft] = useState(() => createDefaultAlertSettingDraft('realtime'));
  const [creating, setCreating] = useState(false);
  const [deleteRequest, setDeleteRequest] = useState<SettingDeleteRequest | null>(null);
  const [deletePending, setDeletePending] = useState(false);

  const load = useCallback(async () => {
    void refreshKey;
    return loadAlertSettingData(apiGet, apiMessageGet, query);
  }, [query, refreshKey]);

  function openTypeSelection() {
    setCreateDraft(createDefaultAlertSettingDraft('realtime', { labelsText: evidenceContext?.labelsText || '' }));
    setCreateMode('type');
  }

  function closeCreateFlow() {
    setCreateMode('closed');
    setCreating(false);
  }

  function selectCreateType(kind: AlertSettingCreateKind) {
    setCreateDraft(current => createDefaultAlertSettingDraft(kind, current));
    setCreateMode('authoring');
  }

  async function submitCreate(payload: AlertSettingCreatePayload) {
    setCreating(true);
    try {
      if (typeof payload.id === 'number') {
        await apiMessagePut('/alert/define', payload);
      } else {
        await apiMessagePost('/alert/define', payload);
      }
      closeCreateFlow();
      setCheckedIds([]);
      setRefreshKey(value => value + 1);
    } finally {
      setCreating(false);
    }
  }

  function requestSingleDelete(defineId: number) {
    setDeleteRequest({ kind: 'single', ids: [defineId] });
  }

  function requestBatchDelete() {
    if (checkedIds.length === 0) return;
    setDeleteRequest({ kind: 'batch', ids: checkedIds });
  }

  async function confirmDelete() {
    const request = deleteRequest;
    if (!request || request.ids.length === 0) return;
    setDeletePending(true);
    try {
      if (request.kind === 'batch') {
        await deleteAlertDefines(apiMessageDelete as any, request.ids);
      } else {
        await deleteAlertDefine(apiMessageDelete as any, request.ids[0]);
      }
      setCheckedIds([]);
      setDeleteRequest(null);
      setRefreshKey(value => value + 1);
    } finally {
      setDeletePending(false);
    }
  }

  return (
    <ClientWorkbench load={load} loadingCopy={t('alert.setting.loading')}>
      {data => {
        async function handleToggleEnabled(defineId: number, enabled: boolean) {
          const target = data.list.content.find(item => item.id === defineId);
          if (!target) return;
          await updateAlertDefineEnabled(apiMessagePut as any, target, enabled);
          setRefreshKey(value => value + 1);
        }

        async function handleEdit(defineId: number) {
          const define = await loadAlertDefineDetail(apiMessageGet as any, defineId);
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
                setCheckedIds([]);
              }}
              onClearFilter={() => {
                setSearch('');
                setQuery('');
                setCheckedIds([]);
              }}
              onRefresh={() => {
                setRefreshKey(value => value + 1);
                setCheckedIds([]);
              }}
              onNew={openTypeSelection}
              onDeleteSelected={requestBatchDelete}
              onExport={() => {}}
              onImport={() => {}}
              onToggleEnabled={(defineId, enabled) => void handleToggleEnabled(defineId, enabled)}
              onEdit={defineId => void handleEdit(defineId)}
              onDelete={requestSingleDelete}
              onCheckedIdsChange={setCheckedIds}
            />
            <AlertSettingCreateDialog
              t={t}
              open={createMode !== 'closed'}
              mode={createMode === 'closed' ? 'type' : createMode}
              intent={typeof createDraft.id === 'number' ? 'edit' : 'create'}
              datasourceStatus={data.datasourceStatus}
              draft={createDraft}
              submitting={creating}
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
          </>
        );
      }}
    </ClientWorkbench>
  );
}
