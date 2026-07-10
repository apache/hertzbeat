'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ClientWorkbench } from '../../../components/workbench/client-workbench';
import { useI18n } from '../../../components/providers/i18n-provider';
import { AlertGroupSurface } from '../../../components/pages/alert-group-surface';
import { HzConfirmDialog } from '../../../components/ui/hz-confirm-dialog';
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
import {
  buildAlertGroupEvidenceContext,
  buildAlertGroupFormDraft,
  getAlertGroupValidationField,
  validateAlertGroupForm,
  type AlertGroupValidationField
} from '../../../lib/alert-group/view-model';
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
const ALERT_GROUP_ROUTE_PATH = '/alert/group';
const ALERT_GROUP_EDITOR_FOCUS_SELECTORS: Record<AlertGroupValidationField, string> = {
  name: 'input[name="alert_group_name"]',
  'group-labels': '[data-alert-group-label-selector] input[data-hz-tag-input-control="draft"]',
  'group-wait': 'input[name="alert_group_wait"]',
  'group-interval': 'input[name="alert_group_interval"]',
  'repeat-interval': 'input[name="alert_group_repeat_interval"]'
};
const ALERT_GROUP_DRAFT_FINGERPRINT_FIELDS: Array<keyof AlertGroupFormDraft> = [
  'id',
  'name',
  'enable',
  'groupLabelsText',
  'groupWait',
  'groupInterval',
  'repeatInterval'
];

type AlertGroupListRouteState = {
  search: string;
  pageIndex: number;
  pageSize: number;
};

function parseAlertGroupRouteInteger(value: string | null, fallback: number, minimum = 0) {
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed >= minimum ? parsed : fallback;
}

function focusAlertGroupEditorField(field: AlertGroupValidationField) {
  if (typeof document === 'undefined') return;
  const selector = ALERT_GROUP_EDITOR_FOCUS_SELECTORS[field];
  window.requestAnimationFrame(() => {
    const target = document.querySelector<HTMLInputElement>(selector);
    target?.focus();
    target?.scrollIntoView({ block: 'center', inline: 'nearest' });
  });
}

function serializeAlertGroupDraft(draft: AlertGroupFormDraft) {
  return JSON.stringify(
    ALERT_GROUP_DRAFT_FINGERPRINT_FIELDS.map(field => [field, draft[field] == null ? '' : String(draft[field]).trim()])
  );
}

export default function AlertGroupPage({ initialRouteState }: { initialRouteState?: AlertGroupRouteState } = {}) {
  const { t } = useI18n();
  const router = useRouter();
  const searchParams = useSearchParams();
  const routeSearchParamString = searchParams.toString();
  const routeSearch = searchParams.get('search') ?? '';
  const routePageIndex = parseAlertGroupRouteInteger(searchParams.get('pageIndex'), 0);
  const routePageSize = parseAlertGroupRouteInteger(searchParams.get('pageSize'), ALERT_GROUP_PAGE_SIZE_OPTIONS[0], 1);
  const routeListState = useMemo<AlertGroupListRouteState>(() => ({
    search: routeSearch,
    pageIndex: routePageIndex,
    pageSize: routePageSize
  }), [routePageIndex, routePageSize, routeSearch]);
  const alertGroupRouteState = initialRouteState ?? EMPTY_ALERT_GROUP_ROUTE_STATE;
  const { signal, signalContext } = alertGroupRouteState;
  const groupEvidenceContext = useMemo(
    () => buildAlertGroupEvidenceContext(signal, signalContext, t),
    [signal, signalContext, t]
  );
  const [search, setSearch] = useState(routeListState.search);
  const [query, setQuery] = useState(routeListState.search);
  const [pageIndex, setPageIndex] = useState(routeListState.pageIndex);
  const [pageSize, setPageSize] = useState<number>(routeListState.pageSize);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editorLoading, setEditorLoading] = useState(false);
  const [editorSaving, setEditorSaving] = useState(false);
  const [editorMessage, setEditorMessage] = useState<string | null>(null);
  const [editorError, setEditorError] = useState<string | null>(null);
  const [editorErrorDetail, setEditorErrorDetail] = useState<string | null>(null);
  const [editorErrorContract, setEditorErrorContract] = useState<AlertGroupErrorContract | null>(null);
  const [draft, setDraft] = useState<AlertGroupFormDraft>(() => buildAlertGroupFormDraft(null, groupEvidenceContext?.draftPatch));
  const [editorInitialFingerprint, setEditorInitialFingerprint] = useState(() => (
    serializeAlertGroupDraft(buildAlertGroupFormDraft(null, groupEvidenceContext?.draftPatch))
  ));
  const [editorDiscardDialogOpen, setEditorDiscardDialogOpen] = useState(false);
  const [refreshTick, setRefreshTick] = useState(0);
  const [checkedIds, setCheckedIds] = useState<number[]>([]);
  const [deleteRequest, setDeleteRequest] = useState<GroupDeleteRequest | null>(null);
  const [deletePending, setDeletePending] = useState(false);
  const alertGroupListUrl = useMemo(() => buildAlertGroupUrl({ search: query, pageIndex, pageSize }), [pageIndex, pageSize, query]);
  const alertGroupCacheKey = useMemo(
    () => ['alert-group', alertGroupListUrl, refreshTick].join('|'),
    [alertGroupListUrl, refreshTick]
  );
  const editorDraftFingerprint = useMemo(() => serializeAlertGroupDraft(draft), [draft]);
  const shouldConfirmEditorDiscard = Boolean(editorOpen && editorDraftFingerprint !== editorInitialFingerprint && !editorSaving);

  useEffect(() => {
    setSearch(routeListState.search);
    setQuery(routeListState.search);
    setPageIndex(routeListState.pageIndex);
    setPageSize(routeListState.pageSize);
    setSelectedId(null);
    setCheckedIds([]);
  }, [routeListState]);

  const replaceRouteQuery = useCallback((nextState: AlertGroupListRouteState) => {
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

    if (nextState.pageSize !== ALERT_GROUP_PAGE_SIZE_OPTIONS[0]) {
      nextParams.set('pageSize', String(nextState.pageSize));
    } else {
      nextParams.delete('pageSize');
    }

    const nextParamString = nextParams.toString();
    const nextUrl = nextParamString ? `${ALERT_GROUP_ROUTE_PATH}?${nextParamString}` : ALERT_GROUP_ROUTE_PATH;
    const currentUrl = routeSearchParamString ? `${ALERT_GROUP_ROUTE_PATH}?${routeSearchParamString}` : ALERT_GROUP_ROUTE_PATH;
    if (nextUrl !== currentUrl) {
      router.replace(nextUrl, { scroll: false });
    }
  }, [routeSearchParamString, router]);

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
          const nextDraft = buildAlertGroupFormDraft(null, groupEvidenceContext?.draftPatch);
          setDraft(nextDraft);
          setEditorInitialFingerprint(serializeAlertGroupDraft(nextDraft));
          setEditorDiscardDialogOpen(false);
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
            const nextDraft = buildAlertGroupFormDraft(detail);
            setDraft(nextDraft);
            setEditorInitialFingerprint(serializeAlertGroupDraft(nextDraft));
            setEditorDiscardDialogOpen(false);
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
            const validationField = getAlertGroupValidationField(draft);
            setEditorError(validationError);
            setEditorErrorDetail(null);
            setEditorErrorContract(null);
            if (validationField) {
              focusAlertGroupEditorField(validationField);
            }
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
            setEditorInitialFingerprint(serializeAlertGroupDraft(draft));
            setEditorMessage(t(isEdit ? 'common.notify.edit-success' : 'common.notify.new-success'));
            setEditorOpen(false);
            setEditorDiscardDialogOpen(false);
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
          const nextSearch = search.trim();
          const nextState = { search: nextSearch, pageIndex: 0, pageSize };
          setSearch(nextSearch);
          setQuery(nextSearch);
          setPageIndex(0);
          setSelectedId(null);
          setCheckedIds([]);
          replaceRouteQuery(nextState);
        }

        function handleClearFilter() {
          const nextState = { search: '', pageIndex: 0, pageSize };
          setSearch('');
          setQuery('');
          setPageIndex(0);
          setSelectedId(null);
          setCheckedIds([]);
          replaceRouteQuery(nextState);
        }

        function handlePageIndexChange(nextPageIndex: number) {
          setPageIndex(nextPageIndex);
          setSelectedId(null);
          setCheckedIds([]);
          replaceRouteQuery({ search: query, pageIndex: nextPageIndex, pageSize });
        }

        function handlePageSizeChange(nextPageSize: number) {
          const nextState = { search: query, pageIndex: 0, pageSize: nextPageSize };
          setPageSize(nextPageSize);
          setPageIndex(0);
          setSelectedId(null);
          setCheckedIds([]);
          replaceRouteQuery(nextState);
        }

        function handleCloseEditor() {
          setEditorOpen(false);
          setEditorError(null);
          setEditorErrorDetail(null);
          setEditorErrorContract(null);
          setEditorMessage(null);
          setEditorDiscardDialogOpen(false);
        }

        function requestCloseEditor() {
          if (shouldConfirmEditorDiscard) {
            setEditorDiscardDialogOpen(true);
            return;
          }
          handleCloseEditor();
        }

        const deleteTargetNames = deleteRequest?.ids
          .map(id => data.list.content.find(item => item.id === id)?.name?.trim())
          .filter((name): name is string => Boolean(name)) ?? [];
        const missingDeleteTargetCount = deleteRequest
          ? Math.max(deleteRequest.ids.length - deleteTargetNames.length, 0)
          : 0;
        const deleteConfirmCopy = [
          deleteRequest?.kind === 'batch'
            ? t('alert.group.delete.confirm.batch', { count: deleteRequest.ids.length })
            : t('alert.group.delete.confirm.single'),
          deleteTargetNames.length > 0
            ? t('alert.group.delete.confirm.targets', { names: deleteTargetNames.join(', ') })
            : null,
          missingDeleteTargetCount > 0
            ? t('alert.group.delete.confirm.targets-more', { count: missingDeleteTargetCount })
            : null
        ].filter(Boolean).join('\n');

        return (
          <>
            <AlertGroupSurface
              t={t}
              data={data}
              search={search}
              selectedId={selectedId}
              checkedIds={checkedIds}
              requestedPageSize={pageSize}
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
              onCloseEditor={requestCloseEditor}
              onDraftChange={setDraft}
            />
            <div
              data-alert-group-unsaved-cancel="hertzbeat-ui-confirm-dialog"
              data-alert-group-unsaved-cancel-state={editorDiscardDialogOpen ? 'open' : 'closed'}
            >
              <HzConfirmDialog
                open={editorDiscardDialogOpen}
                title={t('alert.group.unsaved-cancel.title')}
                kicker={t('alert.group.unsaved-cancel.kicker')}
                copy={t('alert.group.unsaved-cancel.copy')}
                confirmLabel={t('alert.group.unsaved-cancel.discard')}
                cancelLabel={t('alert.group.unsaved-cancel.keep-editing')}
                onCancel={() => setEditorDiscardDialogOpen(false)}
                onConfirm={handleCloseEditor}
              />
            </div>
            <div data-alert-delete-confirm={deleteRequest ? 'open' : 'closed'}>
              <HzConfirmDialog
                open={Boolean(deleteRequest)}
                title={deleteRequest?.kind === 'batch' ? t('common.confirm.delete-batch') : t('common.confirm.delete')}
                copy={deleteConfirmCopy}
                confirmLabel={t('alert.group.delete.confirm.action')}
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
