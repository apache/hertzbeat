'use client';

import React from 'react';
import { useCallback, useMemo, useState } from 'react';
import { ClientWorkbench } from '../../../components/workbench/client-workbench';
import { useI18n } from '../../../components/providers/i18n-provider';
import { AlertSilenceSurface } from '../../../components/pages/alert-silence-surface';
import { HzConfirmDialog } from '../../../components/ui/hz-confirm-dialog';
import { api } from '../../../lib/alert-api-facade';
import {
  buildAlertSilenceEntityPrefillFromFacade,
  buildAlertSilenceFormDraft,
  createAlertSilenceFromFacade,
  deleteAlertSilenceFromFacade,
  deleteAlertSilencesFromFacade,
  loadAlertSilenceDataFromFacade,
  loadAlertSilenceDetailFromFacade,
  loadMatchedAlertSilencesFromFacade,
  updateAlertSilenceEnabledFromFacade,
  updateAlertSilenceFromFacade,
  type AlertSilenceFormDraft
} from '../../../lib/alert-silence/controller';
import { ALERT_SILENCE_PAGE_SIZE_OPTIONS, buildAlertSilenceUrl, type AlertSilenceRouteState } from '../../../lib/alert-silence/query-state';
import { buildAlertSilenceEvidenceContext, validateAlertSilenceForm } from '../../../lib/alert-silence/view-model';
import { DEFAULT_ALERT_LABEL_OPTIONS, loadAlertLabelOptionsFromFacade } from '../../../lib/alert-label-options';
import { formatTime } from '../../../lib/format';
import type { AlertSilence, PageResult } from '../../../lib/types';
import type { AlertSilenceManagementContext } from '../../../lib/alert-silence/query-state';

type SilenceDeleteRequest = {
  kind: 'single' | 'batch';
  ids: number[];
};

const ALERT_SILENCE_SETTLED_CACHE_TTL_MS = 10_000;
const ALERT_SILENCE_LABEL_OPTIONS_TIMEOUT_MS = 2_500;
const EMPTY_ALERT_SILENCE_ROUTE_STATE: AlertSilenceRouteState = {
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

function filterMatchedSilencesBySearch(silences: AlertSilence[], search: string): AlertSilence[] {
  const keyword = search.trim().toLowerCase();
  if (!keyword) return silences;
  return silences.filter(silence => {
    if (silence.name?.toLowerCase().includes(keyword)) {
      return true;
    }
    return Object.entries(silence.labels || {}).some(([key, value]) => `${key}:${value}`.toLowerCase().includes(keyword));
  });
}

function paginateMatchedSilences(silences: AlertSilence[], pageIndex: number, pageSize: number): PageResult<AlertSilence> {
  const normalizedPageSize = Math.max(1, pageSize);
  const lastPageIndex = Math.max(0, Math.ceil(silences.length / normalizedPageSize) - 1);
  const normalizedPageIndex = Math.min(Math.max(0, pageIndex), lastPageIndex);
  const start = normalizedPageIndex * normalizedPageSize;
  return {
    content: silences.slice(start, start + normalizedPageSize),
    totalElements: silences.length,
    pageIndex: normalizedPageIndex,
    pageSize: normalizedPageSize
  };
}

function shouldUseMatchedSilenceView(context: AlertSilenceManagementContext, matchedViewEnabled: boolean) {
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

export default function AlertSilencePage({ initialRouteState }: { initialRouteState?: AlertSilenceRouteState } = {}) {
  const { t } = useI18n();
  const alertSilenceRouteState = initialRouteState ?? EMPTY_ALERT_SILENCE_ROUTE_STATE;
  const { returnContext, signal, signalContext, managementContext } = alertSilenceRouteState;
  const silenceEvidenceContext = useMemo(
    () => buildAlertSilenceEvidenceContext(signal, signalContext, t),
    [signal, signalContext, t]
  );
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState<number>(ALERT_SILENCE_PAGE_SIZE_OPTIONS[0]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editorLoading, setEditorLoading] = useState(false);
  const [editorSaving, setEditorSaving] = useState(false);
  const [editorMessage, setEditorMessage] = useState<string | null>(null);
  const [editorError, setEditorError] = useState<string | null>(null);
  const [editorErrorDetail, setEditorErrorDetail] = useState<string | null>(null);
  const [editorErrorContract, setEditorErrorContract] = useState<'save' | 'enable' | 'delete' | null>(null);
  const [draft, setDraft] = useState<AlertSilenceFormDraft>(() => buildAlertSilenceFormDraft(null, silenceEvidenceContext?.draftPatch));
  const [refreshTick, setRefreshTick] = useState(0);
  const [checkedIds, setCheckedIds] = useState<number[]>([]);
  const [deleteRequest, setDeleteRequest] = useState<SilenceDeleteRequest | null>(null);
  const [deletePending, setDeletePending] = useState(false);
  const [matchedViewEnabled, setMatchedViewEnabled] = useState(managementContext.matchedViewEnabled);
  const [createdOutsideMatchedViewNotice, setCreatedOutsideMatchedViewNotice] = useState(false);
  const [entityPrefillSource, setEntityPrefillSource] = useState<'alerts-common-labels' | 'none'>('none');
  const [entityPrefillWarning, setEntityPrefillWarning] = useState<string | null>(null);
  const alertSilenceListUrl = useMemo(() => buildAlertSilenceUrl({ search: query, pageIndex, pageSize }), [pageIndex, pageSize, query]);
  const matchedRuleIdsKey = managementContext.matchingRuleIds.join(',');
  const useMatchedView = shouldUseMatchedSilenceView(managementContext, matchedViewEnabled);
  const alertSilenceCacheKey = useMemo(
    () => ['alert-silence', useMatchedView ? `matched:${matchedRuleIdsKey}` : alertSilenceListUrl, refreshTick].join('|'),
    [alertSilenceListUrl, matchedRuleIdsKey, refreshTick, useMatchedView]
  );

  const load = useCallback(async () => {
    const labelOptionsPromise = withTimeoutFallback(
      loadAlertLabelOptionsFromFacade(api.alertLabels.list),
      DEFAULT_ALERT_LABEL_OPTIONS,
      ALERT_SILENCE_LABEL_OPTIONS_TIMEOUT_MS
    );
    if (useMatchedView) {
      const [matchedResult, labelOptions] = await Promise.all([
        loadMatchedAlertSilencesFromFacade(api.alertSilences.detail, managementContext.matchingRuleIds),
        labelOptionsPromise
      ]);
      const filtered = filterMatchedSilencesBySearch(matchedResult.matched, query);
      return {
        list: paginateMatchedSilences(filtered, pageIndex, pageSize),
        labelOptions,
        refreshTick,
        missingMatchedRuleCount: matchedResult.missingMatchedRuleCount
      };
    }

    const data = await loadAlertSilenceDataFromFacade(
      {
        list: api.alertSilences.list,
        labelOptions: () => labelOptionsPromise
      },
      { search: query, pageIndex, pageSize }
    );
    return { ...data, refreshTick, missingMatchedRuleCount: 0 };
  }, [managementContext.matchingRuleIds, pageIndex, pageSize, query, refreshTick, useMatchedView]);

  return (
    <ClientWorkbench
      load={load}
      loadingCopy={t('alert.silence.loading')}
      cacheKey={alertSilenceCacheKey}
      cacheSettledTtlMs={ALERT_SILENCE_SETTLED_CACHE_TTL_MS}
    >
      {data => {
        const labelOptions = data.labelOptions ?? DEFAULT_ALERT_LABEL_OPTIONS;
        const selected = data.list.content.find(item => item.id === selectedId) ?? data.list.content[0] ?? null;

        async function handleNew() {
          const displayName = managementContext.entityName || managementContext.returnLabel || managementContext.entityId || 'entity';
          const entityContextDraft = managementContext.entityId || managementContext.entityName || managementContext.returnTo
            ? { name: `${displayName} silence` }
            : {};
          const baseDraftPatch = silenceEvidenceContext?.draftPatch ?? entityContextDraft;
          setEntityPrefillSource('none');
          setEntityPrefillWarning(null);
          if (managementContext.entityId || managementContext.entityName || managementContext.returnTo) {
            setEditorLoading(true);
            try {
              const prefill = await buildAlertSilenceEntityPrefillFromFacade(
                entityId => api.entities.alerts(entityId, { pageIndex: 0, pageSize: 20, status: 'firing' }),
                managementContext.entityId,
                t('entity.noise-controls.authoring.silence.prefill-warning'),
                t('entity.noise-controls.authoring.prefill-warning.no-entity-id')
              );
              setEntityPrefillSource(prefill.source);
              setEntityPrefillWarning(prefill.warning);
              setDraft(buildAlertSilenceFormDraft(null, { ...baseDraftPatch, ...prefill.draftPatch }));
            } finally {
              setEditorLoading(false);
            }
          } else {
            setDraft(buildAlertSilenceFormDraft(null, baseDraftPatch));
          }
          setEditorError(null);
          setEditorErrorDetail(null);
          setEditorErrorContract(null);
          setEditorMessage(null);
          setCreatedOutsideMatchedViewNotice(false);
          setEditorOpen(true);
        }

        async function handleEdit(silenceId?: number) {
          const targetId = silenceId ?? selected?.id;
          if (!targetId) return;
          setEditorLoading(true);
          setEditorError(null);
          setEditorErrorDetail(null);
          setEditorErrorContract(null);
          setEditorMessage(null);
          try {
            const detail = await loadAlertSilenceDetailFromFacade(api.alertSilences.detail, targetId);
            setDraft(buildAlertSilenceFormDraft(detail));
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
          const validationError = validateAlertSilenceForm(draft, t);
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
              await updateAlertSilenceFromFacade(api.alertSilences.update, draft);
            } else {
              await createAlertSilenceFromFacade(api.alertSilences.create, draft);
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

        async function handleToggleEnabled(silence?: AlertSilence) {
          const target = silence ?? selected;
          if (!target) return;
          try {
            await updateAlertSilenceEnabledFromFacade(api.alertSilences.update, target, !(target.enable ?? true));
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

        async function handleDelete(silenceId?: number) {
          const targetId = silenceId ?? selected?.id;
          if (!targetId) return;
          setDeleteRequest({ kind: 'single', ids: [targetId] });
        }

        async function handleConfirmedDelete() {
          const request = deleteRequest;
          if (!request || request.ids.length === 0) return;
          setDeletePending(true);
          try {
            if (request.kind === 'batch') {
              await deleteAlertSilencesFromFacade(api.alertSilences.delete, request.ids);
              setCheckedIds([]);
            } else {
              await deleteAlertSilenceFromFacade(api.alertSilences.delete, request.ids[0]);
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
            <AlertSilenceSurface
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
              evidenceContext={silenceEvidenceContext}
              draft={draft}
              labelOptions={labelOptions}
              formatTime={formatTime}
              onSearchChange={setSearch}
              onApplyFilter={handleApplyFilter}
              onClearFilter={handleClearFilter}
              onRefresh={handleRefresh}
              onSelect={setSelectedId}
              onCheckedIdsChange={setCheckedIds}
              pageSizeOptions={[...ALERT_SILENCE_PAGE_SIZE_OPTIONS]}
              onPageIndexChange={handlePageIndexChange}
              onPageSizeChange={handlePageSizeChange}
              onViewAllRules={() => {
                setMatchedViewEnabled(false);
                setCreatedOutsideMatchedViewNotice(false);
                setPageIndex(0);
                setCheckedIds([]);
              }}
              onViewMatchedRules={() => {
                setMatchedViewEnabled(true);
                setPageIndex(0);
                setCheckedIds([]);
              }}
              onNew={() => void handleNew()}
              onEdit={silenceId => void handleEdit(silenceId)}
              onSave={() => void handleSave()}
              onToggleEnabled={silence => void handleToggleEnabled(silence)}
              onDelete={silenceId => void handleDelete(silenceId)}
              onDeleteSelected={() => void handleDeleteSelected()}
              onCloseEditor={() => setEditorOpen(false)}
              onDraftChange={setDraft}
            />
            <div data-alert-delete-confirm={deleteRequest ? 'open' : 'closed'}>
              <HzConfirmDialog
                open={Boolean(deleteRequest)}
                title={deleteRequest?.kind === 'batch' ? t('common.confirm.delete-batch') : t('common.confirm.delete')}
                copy={
                  deleteRequest?.kind === 'batch'
                    ? t('alert.silence.delete.confirm.batch', { count: deleteRequest.ids.length })
                    : t('alert.silence.delete.confirm.single')
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
