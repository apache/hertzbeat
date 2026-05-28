'use client';

import React from 'react';
import { useCallback, useMemo, useState } from 'react';
import { ClientWorkbench } from '../../../components/workbench/client-workbench';
import { useI18n } from '../../../components/providers/i18n-provider';
import { AlertInhibitSurface } from '../../../components/pages/alert-inhibit-surface';
import { ColdConfirmDialog } from '../../../components/ui/cold-confirm-dialog';
import { api } from '../../../lib/alert-api-facade';
import {
  buildAlertInhibitEntityPrefillFromFacade,
  buildAlertInhibitFormDraft,
  createAlertInhibitFromFacade,
  deleteAlertInhibitFromFacade,
  deleteAlertInhibitsFromFacade,
  loadAlertInhibitDataFromFacade,
  loadAlertInhibitDetailFromFacade,
  loadMatchedAlertInhibitsFromFacade,
  updateAlertInhibitEnabledFromFacade,
  updateAlertInhibitFromFacade,
  type AlertInhibitFormDraft
} from '../../../lib/alert-inhibit/controller';
import { ALERT_INHIBIT_PAGE_SIZE_OPTIONS, buildAlertInhibitUrl, type AlertInhibitRouteState } from '../../../lib/alert-inhibit/query-state';
import { buildAlertInhibitEvidenceContext, validateAlertInhibitForm } from '../../../lib/alert-inhibit/view-model';
import { clearAlertInhibitEqualLabels, clearAlertInhibitTarget, copyAlertInhibitSourceToTarget, dropSeverityFromAlertInhibitTarget } from '../../../lib/alert-manage/view-model';
import { DEFAULT_ALERT_LABEL_OPTIONS, loadAlertLabelOptionsFromFacade } from '../../../lib/alert-label-options';
import { formatTime } from '../../../lib/format';
import type { AlertInhibit, PageResult } from '../../../lib/types';
import type { AlertInhibitManagementContext } from '../../../lib/alert-inhibit/query-state';

type InhibitDeleteRequest = {
  kind: 'single' | 'batch';
  ids: number[];
};

const ALERT_INHIBIT_SETTLED_CACHE_TTL_MS = 10_000;
const ALERT_INHIBIT_LABEL_OPTIONS_TIMEOUT_MS = 2_500;
const EMPTY_ALERT_INHIBIT_ROUTE_STATE: AlertInhibitRouteState = {
  returnContext: {
    search: '',
    status: '',
    severity: '',
    entityId: '',
    entityName: '',
    returnTo: ''
  },
  signal: null,
  signalContext: {},
  managementContext: {
    entityId: '',
    entityName: '',
    returnTo: '',
    returnLabel: '',
    matchMode: '',
    matchingRuleType: '',
    matchingRuleIds: [],
    matchedViewEnabled: false
  }
};

function filterMatchedInhibitsBySearch(inhibits: AlertInhibit[], search: string): AlertInhibit[] {
  const keyword = search.trim().toLowerCase();
  if (!keyword) return inhibits;
  return inhibits.filter(inhibit => {
    if (inhibit.name?.toLowerCase().includes(keyword)) {
      return true;
    }
    const sourceHit = Object.entries(inhibit.sourceLabels || {}).some(([key, value]) => `${key}:${value}`.toLowerCase().includes(keyword));
    const targetHit = Object.entries(inhibit.targetLabels || {}).some(([key, value]) => `${key}:${value}`.toLowerCase().includes(keyword));
    const equalHit = (inhibit.equalLabels || []).some(label => label.toLowerCase().includes(keyword));
    return sourceHit || targetHit || equalHit;
  });
}

function paginateMatchedInhibits(inhibits: AlertInhibit[], pageIndex: number, pageSize: number): PageResult<AlertInhibit> {
  const normalizedPageSize = Math.max(1, pageSize);
  const lastPageIndex = Math.max(0, Math.ceil(inhibits.length / normalizedPageSize) - 1);
  const normalizedPageIndex = Math.min(Math.max(0, pageIndex), lastPageIndex);
  const start = normalizedPageIndex * normalizedPageSize;
  return {
    content: inhibits.slice(start, start + normalizedPageSize),
    totalElements: inhibits.length,
    pageIndex: normalizedPageIndex,
    pageSize: normalizedPageSize
  };
}

function shouldUseMatchedInhibitView(context: AlertInhibitManagementContext, matchedViewEnabled: boolean) {
  return matchedViewEnabled && context.matchMode === 'entity-noise-controls';
}

function withTimeoutFallback<T>(promise: Promise<T>, fallback: T, timeoutMs: number): Promise<T> {
  return new Promise(resolve => {
    const timer = setTimeout(() => resolve(fallback), timeoutMs);
    promise.then(
      value => {
        clearTimeout(timer);
        resolve(value);
      },
      () => {
        clearTimeout(timer);
        resolve(fallback);
      }
    );
  });
}

export default function AlertInhibitPage({ initialRouteState }: { initialRouteState?: AlertInhibitRouteState } = {}) {
  const { t } = useI18n();
  const alertInhibitRouteState = initialRouteState ?? EMPTY_ALERT_INHIBIT_ROUTE_STATE;
  const { returnContext, signal, signalContext, managementContext } = alertInhibitRouteState;
  const inhibitEvidenceContext = useMemo(
    () => buildAlertInhibitEvidenceContext(signal, signalContext, t),
    [signal, signalContext, t]
  );
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState<number>(ALERT_INHIBIT_PAGE_SIZE_OPTIONS[0]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editorLoading, setEditorLoading] = useState(false);
  const [editorSaving, setEditorSaving] = useState(false);
  const [editorMessage, setEditorMessage] = useState<string | null>(null);
  const [editorError, setEditorError] = useState<string | null>(null);
  const [editorErrorDetail, setEditorErrorDetail] = useState<string | null>(null);
  const [editorErrorContract, setEditorErrorContract] = useState<'save' | 'enable' | null>(null);
  const [draft, setDraft] = useState<AlertInhibitFormDraft>(() => buildAlertInhibitFormDraft(null, inhibitEvidenceContext?.draftPatch));
  const [refreshTick, setRefreshTick] = useState(0);
  const [checkedIds, setCheckedIds] = useState<number[]>([]);
  const [deleteRequest, setDeleteRequest] = useState<InhibitDeleteRequest | null>(null);
  const [deletePending, setDeletePending] = useState(false);
  const [matchedViewEnabled, setMatchedViewEnabled] = useState(managementContext.matchedViewEnabled);
  const [createdOutsideMatchedViewNotice, setCreatedOutsideMatchedViewNotice] = useState(false);
  const [entityPrefillSource, setEntityPrefillSource] = useState<'alerts-common-labels' | 'none'>('none');
  const [entityPrefillWarning, setEntityPrefillWarning] = useState<string | null>(null);
  const alertInhibitListUrl = useMemo(() => buildAlertInhibitUrl({ search: query, pageIndex, pageSize }), [pageIndex, pageSize, query]);
  const matchedRuleIdsKey = managementContext.matchingRuleIds.join(',');
  const useMatchedView = shouldUseMatchedInhibitView(managementContext, matchedViewEnabled);
  const alertInhibitCacheKey = useMemo(
    () => ['alert-inhibit', useMatchedView ? `matched:${matchedRuleIdsKey}` : alertInhibitListUrl, refreshTick].join('|'),
    [alertInhibitListUrl, matchedRuleIdsKey, refreshTick, useMatchedView]
  );

  const load = useCallback(async () => {
    const labelOptionsPromise = withTimeoutFallback(
      loadAlertLabelOptionsFromFacade(api.alertLabels.list),
      DEFAULT_ALERT_LABEL_OPTIONS,
      ALERT_INHIBIT_LABEL_OPTIONS_TIMEOUT_MS
    );
    if (useMatchedView) {
      const [matchedResult, labelOptions] = await Promise.all([
        loadMatchedAlertInhibitsFromFacade(api.alertInhibits.detail, managementContext.matchingRuleIds),
        labelOptionsPromise
      ]);
      const filtered = filterMatchedInhibitsBySearch(matchedResult.matched, query);
      return {
        list: paginateMatchedInhibits(filtered, pageIndex, pageSize),
        labelOptions,
        refreshTick,
        missingMatchedRuleCount: matchedResult.missingMatchedRuleCount
      };
    }

    const data = await loadAlertInhibitDataFromFacade(
      {
        list: api.alertInhibits.list,
        labelOptions: () => labelOptionsPromise
      },
      { search: query, pageIndex, pageSize }
    );
    return { ...data, refreshTick, missingMatchedRuleCount: 0 };
  }, [managementContext.matchingRuleIds, pageIndex, pageSize, query, refreshTick, useMatchedView]);

  return (
    <ClientWorkbench
      load={load}
      loadingCopy={t('alert.inhibit.loading')}
      cacheKey={alertInhibitCacheKey}
      cacheSettledTtlMs={ALERT_INHIBIT_SETTLED_CACHE_TTL_MS}
    >
      {data => {
        const labelOptions = data.labelOptions ?? DEFAULT_ALERT_LABEL_OPTIONS;
        const selected = data.list.content.find(item => item.id === selectedId) ?? data.list.content[0] ?? null;

        async function handleNew() {
          const displayName = managementContext.entityName || managementContext.returnLabel || managementContext.entityId || 'entity';
          const entityContextDraft = managementContext.entityId || managementContext.entityName || managementContext.returnTo
            ? { name: `${displayName} inhibit` }
            : {};
          const baseDraftPatch = inhibitEvidenceContext?.draftPatch ?? entityContextDraft;
          setEntityPrefillSource('none');
          setEntityPrefillWarning(null);
          if (managementContext.entityId || managementContext.entityName || managementContext.returnTo) {
            setEditorLoading(true);
            try {
              const prefill = await buildAlertInhibitEntityPrefillFromFacade(
                entityId => api.entities.alerts(entityId, { pageIndex: 0, pageSize: 20, status: 'firing' }),
                managementContext.entityId,
                t('entity.noise-controls.authoring.inhibit.prefill-warning'),
                t('entity.noise-controls.authoring.prefill-warning.no-entity-id')
              );
              setEntityPrefillSource(prefill.source);
              setEntityPrefillWarning(prefill.warning);
              setDraft(buildAlertInhibitFormDraft(null, { ...baseDraftPatch, ...prefill.draftPatch }));
            } finally {
              setEditorLoading(false);
            }
          } else {
            setDraft(buildAlertInhibitFormDraft(null, baseDraftPatch));
          }
          setEditorError(null);
          setEditorErrorDetail(null);
          setEditorErrorContract(null);
          setEditorMessage(null);
          setCreatedOutsideMatchedViewNotice(false);
          setEditorOpen(true);
        }

        async function handleEdit(inhibitId?: number) {
          const targetId = inhibitId ?? selected?.id;
          if (!targetId) return;
          setEditorLoading(true);
          setEditorError(null);
          setEditorErrorDetail(null);
          setEditorErrorContract(null);
          setEditorMessage(null);
          try {
            const detail = await loadAlertInhibitDetailFromFacade(api.alertInhibits.detail, targetId);
            setDraft(buildAlertInhibitFormDraft(detail));
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
          const validationError = validateAlertInhibitForm(draft, t);
          if (validationError) {
            setEditorError(validationError);
            setEditorErrorDetail(null);
            setEditorErrorContract(null);
            return;
          }
          setEditorSaving(true);
          setEditorError(null);
          setEditorErrorDetail(null);
          setEditorErrorContract(null);
          setEditorMessage(null);
          const isEdit = Boolean(draft.id);
          try {
            if (isEdit) {
              await updateAlertInhibitFromFacade(api.alertInhibits.update, draft);
            } else {
              await createAlertInhibitFromFacade(api.alertInhibits.create, draft);
            }
            setEditorMessage(t(isEdit ? 'common.notify.edit-success' : 'common.notify.new-success'));
            setEditorOpen(false);
            setCreatedOutsideMatchedViewNotice(!isEdit && useMatchedView);
            setRefreshTick(value => value + 1);
          } catch (error) {
            setEditorError(t(isEdit ? 'common.notify.edit-fail' : 'common.notify.new-fail'));
            setEditorErrorDetail(error instanceof Error ? error.message : null);
            setEditorErrorContract('save');
          } finally {
            setEditorSaving(false);
          }
        }

        async function handleToggleEnabled(inhibit?: AlertInhibit) {
          const target = inhibit ?? selected;
          if (!target) return;
          try {
            await updateAlertInhibitEnabledFromFacade(api.alertInhibits.update, target, !(target.enable ?? true));
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

        async function handleDelete(inhibitId?: number) {
          const targetId = inhibitId ?? selected?.id;
          if (!targetId) return;
          setDeleteRequest({ kind: 'single', ids: [targetId] });
        }

        async function handleConfirmedDelete() {
          const request = deleteRequest;
          if (!request || request.ids.length === 0) return;
          setDeletePending(true);
          try {
            if (request.kind === 'batch') {
              await deleteAlertInhibitsFromFacade(api.alertInhibits.delete, request.ids);
              setCheckedIds([]);
            } else {
              await deleteAlertInhibitFromFacade(api.alertInhibits.delete, request.ids[0]);
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
            <AlertInhibitSurface
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
              returnContext={returnContext}
              managementContext={managementContext}
              matchedViewEnabled={useMatchedView}
              missingMatchedRuleCount={data.missingMatchedRuleCount ?? 0}
              createdOutsideMatchedViewNotice={createdOutsideMatchedViewNotice}
              entityPrefillSource={entityPrefillSource}
              entityPrefillWarning={entityPrefillWarning}
              evidenceContext={inhibitEvidenceContext}
              draft={draft}
              labelOptions={labelOptions}
              formatTime={formatTime}
              onSearchChange={setSearch}
              onApplyFilter={handleApplyFilter}
              onClearFilter={handleClearFilter}
              onRefresh={handleRefresh}
              onSelect={setSelectedId}
              onCheckedIdsChange={setCheckedIds}
              pageSizeOptions={[...ALERT_INHIBIT_PAGE_SIZE_OPTIONS]}
              onPageIndexChange={handlePageIndexChange}
              onPageSizeChange={handlePageSizeChange}
              onViewAllRules={() => {
                setMatchedViewEnabled(false);
                setCreatedOutsideMatchedViewNotice(false);
                setPageIndex(0);
                setSelectedId(null);
                setCheckedIds([]);
              }}
              onViewMatchedRules={() => {
                setMatchedViewEnabled(true);
                setPageIndex(0);
                setSelectedId(null);
                setCheckedIds([]);
              }}
              onNew={() => void handleNew()}
              onEdit={inhibitId => void handleEdit(inhibitId)}
              onSave={() => void handleSave()}
              onToggleEnabled={inhibit => void handleToggleEnabled(inhibit)}
              onDelete={inhibitId => void handleDelete(inhibitId)}
              onDeleteSelected={() => void handleDeleteSelected()}
              onCloseEditor={() => setEditorOpen(false)}
              onDraftChange={setDraft}
              onCopySourceToTarget={() => setDraft(prev => copyAlertInhibitSourceToTarget(prev))}
              onDropSeverity={() => setDraft(prev => dropSeverityFromAlertInhibitTarget(prev))}
              onClearTarget={() => setDraft(prev => clearAlertInhibitTarget(prev))}
              onClearEqual={() => setDraft(prev => clearAlertInhibitEqualLabels(prev))}
            />
            <div data-alert-delete-confirm={deleteRequest ? 'open' : 'closed'}>
              <ColdConfirmDialog
                open={Boolean(deleteRequest)}
                title={deleteRequest?.kind === 'batch' ? t('common.confirm.delete-batch') : t('common.confirm.delete')}
                copy={
                  deleteRequest?.kind === 'batch'
                    ? t('alert.inhibit.delete.confirm.batch', { count: deleteRequest.ids.length })
                    : t('alert.inhibit.delete.confirm.single')
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
