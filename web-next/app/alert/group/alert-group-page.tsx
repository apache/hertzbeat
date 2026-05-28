'use client';

import React, { useCallback, useMemo, useState } from 'react';
import { ClientWorkbench } from '../../../components/workbench/client-workbench';
import { useI18n } from '../../../components/providers/i18n-provider';
import { AlertGroupSurface } from '../../../components/pages/alert-group-surface';
import { ColdConfirmDialog } from '../../../components/ui/cold-confirm-dialog';
import { api } from '../../../lib/alert-api-facade';
import {
  createAlertGroupFromFacade,
  deleteAlertGroupFromFacade,
  deleteAlertGroupsFromFacade,
  loadAlertGroupDataFromFacade,
  loadAlertGroupDetailFromFacade,
  updateAlertGroupEnabledFromFacade,
  updateAlertGroupFromFacade,
  type AlertGroupFormDraft
} from '../../../lib/alert-group/controller';
import { ALERT_GROUP_PAGE_SIZE_OPTIONS, buildAlertGroupUrl, type AlertGroupRouteState } from '../../../lib/alert-group/query-state';
import { buildAlertGroupEvidenceContext, buildAlertGroupFormDraft, validateAlertGroupForm } from '../../../lib/alert-group/view-model';
import { DEFAULT_ALERT_LABEL_OPTIONS, loadAlertLabelOptionsFromFacade } from '../../../lib/alert-label-options';
import { formatTime } from '../../../lib/format';
import type { AlertGroupConverge } from '../../../lib/types';

type GroupDeleteRequest = {
  kind: 'single' | 'batch';
  ids: number[];
};

type AlertGroupErrorContract = 'save' | 'enable' | 'delete';

const ALERT_GROUP_SETTLED_CACHE_TTL_MS = 10_000;
const EMPTY_ALERT_GROUP_ROUTE_STATE: AlertGroupRouteState = {
  signal: null,
  signalContext: {}
};

export default function AlertGroupPage({ initialRouteState }: { initialRouteState?: AlertGroupRouteState } = {}) {
  const { t } = useI18n();
  const alertGroupRouteState = initialRouteState ?? EMPTY_ALERT_GROUP_ROUTE_STATE;
  const { signal, signalContext } = alertGroupRouteState;
  const groupEvidenceContext = useMemo(
    () => buildAlertGroupEvidenceContext(signal, signalContext, t),
    [signal, signalContext, t]
  );
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState<number>(ALERT_GROUP_PAGE_SIZE_OPTIONS[0]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editorLoading, setEditorLoading] = useState(false);
  const [editorSaving, setEditorSaving] = useState(false);
  const [editorMessage, setEditorMessage] = useState<string | null>(null);
  const [editorError, setEditorError] = useState<string | null>(null);
  const [editorErrorDetail, setEditorErrorDetail] = useState<string | null>(null);
  const [editorErrorContract, setEditorErrorContract] = useState<AlertGroupErrorContract | null>(null);
  const [draft, setDraft] = useState<AlertGroupFormDraft>(() => buildAlertGroupFormDraft(null, groupEvidenceContext?.draftPatch));
  const [refreshTick, setRefreshTick] = useState(0);
  const [checkedIds, setCheckedIds] = useState<number[]>([]);
  const [deleteRequest, setDeleteRequest] = useState<GroupDeleteRequest | null>(null);
  const [deletePending, setDeletePending] = useState(false);
  const alertGroupListUrl = useMemo(() => buildAlertGroupUrl({ search: query, pageIndex, pageSize }), [pageIndex, pageSize, query]);
  const alertGroupCacheKey = useMemo(
    () => ['alert-group', alertGroupListUrl, refreshTick].join('|'),
    [alertGroupListUrl, refreshTick]
  );

  const load = useCallback(async () => {
    const data = await loadAlertGroupDataFromFacade(
      {
        list: api.alertGroups.list,
        labelOptions: () => loadAlertLabelOptionsFromFacade(api.alertLabels.list)
      },
      { search: query, pageIndex, pageSize }
    );
    return { ...data, refreshTick };
  }, [pageIndex, pageSize, query, refreshTick]);

  return (
    <ClientWorkbench
      load={load}
      loadingCopy={t('alert.group.loading')}
      cacheKey={alertGroupCacheKey}
      cacheSettledTtlMs={ALERT_GROUP_SETTLED_CACHE_TTL_MS}
    >
      {data => {
        const labelOptions = data.labelOptions ?? DEFAULT_ALERT_LABEL_OPTIONS;
        const selected = data.list.content.find(item => item.id === selectedId) ?? data.list.content[0] ?? null;

        async function handleNew() {
          setDraft(buildAlertGroupFormDraft(null, groupEvidenceContext?.draftPatch));
          setEditorError(null);
          setEditorErrorDetail(null);
          setEditorErrorContract(null);
          setEditorMessage(null);
          setEditorOpen(true);
        }

        async function handleEdit(groupId?: number) {
          const targetId = groupId ?? selected?.id;
          if (!targetId) return;
          setEditorLoading(true);
          setEditorError(null);
          setEditorErrorDetail(null);
          setEditorErrorContract(null);
          setEditorMessage(null);
          try {
            const detail = await loadAlertGroupDetailFromFacade(api.alertGroups.detail, targetId);
            setDraft(buildAlertGroupFormDraft(detail));
            setEditorOpen(true);
          } catch (error) {
            setEditorError(error instanceof Error ? error.message : t('common.notify.edit-fail'));
            setEditorErrorDetail(null);
            setEditorErrorContract(null);
          } finally {
            setEditorLoading(false);
          }
        }

        async function handleSave() {
          const validationError = validateAlertGroupForm(draft, t);
          if (validationError) {
            setEditorError(validationError);
            setEditorErrorDetail(null);
            setEditorErrorContract(null);
            return;
          }
          const isEdit = Boolean(draft.id);
          setEditorSaving(true);
          setEditorError(null);
          setEditorErrorDetail(null);
          setEditorErrorContract(null);
          setEditorMessage(null);
          try {
            if (isEdit) {
              await updateAlertGroupFromFacade(api.alertGroups.update, draft);
            } else {
              await createAlertGroupFromFacade(api.alertGroups.create, draft);
            }
            setEditorMessage(t(isEdit ? 'common.notify.edit-success' : 'common.notify.new-success'));
            setEditorOpen(false);
            setRefreshTick(value => value + 1);
          } catch (error) {
            setEditorError(t(isEdit ? 'common.notify.edit-fail' : 'common.notify.new-fail'));
            setEditorErrorDetail(error instanceof Error ? error.message : null);
            setEditorErrorContract('save');
          } finally {
            setEditorSaving(false);
          }
        }

        async function handleToggleEnabled(group?: AlertGroupConverge | null) {
          const target = group ?? selected;
          if (!target) return;
          try {
            await updateAlertGroupEnabledFromFacade(api.alertGroups.update, target, !(target.enable ?? true));
            setEditorMessage(t('common.notify.edit-success'));
            setEditorError(null);
            setEditorErrorDetail(null);
            setEditorErrorContract(null);
            setRefreshTick(value => value + 1);
          } catch (error) {
            setEditorError(t('common.notify.edit-fail'));
            setEditorErrorDetail(error instanceof Error ? error.message : null);
            setEditorErrorContract('enable');
          }
        }

        async function handleDelete(groupId?: number) {
          const targetId = groupId ?? selected?.id;
          if (!targetId) return;
          setDeleteRequest({ kind: 'single', ids: [targetId] });
        }

        async function handleConfirmedDelete() {
          const request = deleteRequest;
          if (!request || request.ids.length === 0) return;
          setDeletePending(true);
          try {
            if (request.kind === 'batch') {
              await deleteAlertGroupsFromFacade(api.alertGroups.delete, request.ids);
              setCheckedIds([]);
            } else {
              await deleteAlertGroupFromFacade(api.alertGroups.delete, request.ids[0]);
            }
            const nextTotal = Math.max((data.list.totalElements || 0) - request.ids.length, 0);
            const nextLastPageIndex = Math.max(0, Math.ceil(nextTotal / pageSize) - 1);
            setPageIndex(value => Math.min(value, nextLastPageIndex));
            setSelectedId(null);
            setEditorOpen(false);
            setEditorMessage(t('common.notify.delete-success'));
            setEditorError(null);
            setEditorErrorDetail(null);
            setEditorErrorContract(null);
            setDeleteRequest(null);
            setRefreshTick(value => value + 1);
          } catch (error) {
            setEditorError(t('common.notify.delete-fail'));
            setEditorErrorDetail(error instanceof Error ? error.message : null);
            setEditorErrorContract('delete');
          } finally {
            setDeletePending(false);
          }
        }

        function handleRefresh() {
          setRefreshTick(value => value + 1);
        }

        async function handleDeleteSelected() {
          if (checkedIds.length === 0) {
            setEditorError(t('common.notify.no-select-delete'));
            setEditorErrorDetail(null);
            setEditorErrorContract(null);
            setEditorMessage(null);
            return;
          }
          setEditorError(null);
          setEditorErrorDetail(null);
          setEditorErrorContract(null);
          setDeleteRequest({ kind: 'batch', ids: checkedIds });
        }

        function handleApplyFilter() {
          setQuery(search);
          setPageIndex(0);
          setSelectedId(null);
          setCheckedIds([]);
        }

        function handleClearFilter() {
          setSearch('');
          setQuery('');
          setPageIndex(0);
          setSelectedId(null);
          setCheckedIds([]);
        }

        function handlePageIndexChange(nextPageIndex: number) {
          setPageIndex(nextPageIndex);
          setSelectedId(null);
          setCheckedIds([]);
        }

        function handlePageSizeChange(nextPageSize: number) {
          setPageSize(nextPageSize);
          setPageIndex(0);
          setSelectedId(null);
          setCheckedIds([]);
        }

        return (
          <>
            <AlertGroupSurface
              t={t}
              data={data}
              search={search}
              selectedId={selectedId}
              checkedIds={checkedIds}
              editorOpen={editorOpen}
              editorLoading={editorLoading}
              editorSaving={editorSaving}
              editorMessage={editorMessage}
              editorError={editorError}
              editorErrorDetail={editorErrorDetail}
              editorErrorContract={editorErrorContract}
              evidenceContext={groupEvidenceContext}
              draft={draft}
              formatTime={formatTime}
              labelOptions={labelOptions}
              onSearchChange={setSearch}
              onApplyFilter={handleApplyFilter}
              onClearFilter={handleClearFilter}
              onRefresh={handleRefresh}
              onSelect={setSelectedId}
              onCheckedIdsChange={setCheckedIds}
              pageSizeOptions={[...ALERT_GROUP_PAGE_SIZE_OPTIONS]}
              onPageIndexChange={handlePageIndexChange}
              onPageSizeChange={handlePageSizeChange}
              onNew={() => void handleNew()}
              onSave={() => void handleSave()}
              onToggleEnabled={group => void handleToggleEnabled(group)}
              onEdit={groupId => void handleEdit(groupId)}
              onDelete={groupId => void handleDelete(groupId)}
              onDeleteSelected={() => void handleDeleteSelected()}
              onCloseEditor={() => setEditorOpen(false)}
              onDraftChange={setDraft}
            />
            <div data-alert-delete-confirm={deleteRequest ? 'open' : 'closed'}>
              <ColdConfirmDialog
                open={Boolean(deleteRequest)}
                title={deleteRequest?.kind === 'batch' ? t('common.confirm.delete-batch') : t('common.confirm.delete')}
                copy={
                  deleteRequest?.kind === 'batch'
                    ? t('alert.group.delete.confirm.batch', { count: deleteRequest.ids.length })
                    : t('alert.group.delete.confirm.single')
                }
                confirmLabel={t('common.button.ok')}
                cancelLabel={t('common.button.cancel')}
                pending={deletePending}
                onCancel={() => setDeleteRequest(null)}
                onConfirm={() => void handleConfirmedDelete()}
              />
            </div>
          </>
        );
      }}
    </ClientWorkbench>
  );
}
