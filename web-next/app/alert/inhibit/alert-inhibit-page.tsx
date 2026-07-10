'use client';

import React from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ClientWorkbench } from '../../../components/workbench/client-workbench';
import { useI18n } from '../../../components/providers/i18n-provider';
import { AlertInhibitSurface } from '../../../components/pages/alert-inhibit-surface';
import { HzConfirmDialog } from '../../../components/ui/hz-confirm-dialog';
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
import {
  buildAlertInhibitEvidenceContext,
  getAlertInhibitValidationField,
  validateAlertInhibitForm,
  type AlertInhibitValidationField
} from '../../../lib/alert-inhibit/view-model';
import { clearAlertInhibitEqualLabels, clearAlertInhibitTarget, copyAlertInhibitSourceToTarget, dropSeverityFromAlertInhibitTarget } from '../../../lib/alert-manage/view-model';
import { DEFAULT_ALERT_LABEL_OPTIONS, loadAlertLabelOptionsFromFacade } from '../../../lib/alert-label-options';
import { formatTime } from '../../../lib/format';
import type { AlertInhibit, PageResult } from '../../../lib/types';
import type { AlertInhibitManagementContext } from '../../../lib/alert-inhibit/query-state';
import type { SignalRouteContext } from '../../../lib/signal-route-context';

type InhibitDeleteRequest = {
  kind: 'single' | 'batch';
  ids: number[];
};

const ALERT_INHIBIT_SETTLED_CACHE_TTL_MS = 10_000;
const ALERT_INHIBIT_LABEL_OPTIONS_TIMEOUT_MS = 2_500;
const ALERT_INHIBIT_ROUTE_PATH = '/alert/inhibit';
const ALERT_INHIBIT_EDITOR_FOCUS_SELECTORS: Record<AlertInhibitValidationField, string> = {
  name: 'input[name="inhibit_name"]',
  'source-labels': '[data-alert-inhibit-source-label-selector] [data-hz-label-selector-draft-row="true"] input[data-hz-label-selector-key-input="searchable-key"]',
  'target-labels': '[data-alert-inhibit-target-label-selector] [data-hz-label-selector-draft-row="true"] input[data-hz-label-selector-key-input="searchable-key"]',
  'equal-labels': '[data-alert-inhibit-equal-label-selector] input[data-hz-tag-input-control="draft"]'
};
const ALERT_INHIBIT_DRAFT_FINGERPRINT_FIELDS: Array<keyof AlertInhibitFormDraft> = [
  'id',
  'name',
  'enable',
  'sourceLabelsText',
  'targetLabelsText',
  'equalLabelsText'
];
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

type AlertInhibitListRouteState = {
  search: string;
  pageIndex: number;
  pageSize: number;
};

function parseAlertInhibitRouteInteger(value: string | null, fallback: number, minimum = 0) {
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed >= minimum ? parsed : fallback;
}

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

function focusAlertInhibitEditorField(field: AlertInhibitValidationField) {
  if (typeof document === 'undefined') return;
  const selector = ALERT_INHIBIT_EDITOR_FOCUS_SELECTORS[field];
  window.requestAnimationFrame(() => {
    const target = document.querySelector<HTMLInputElement>(selector);
    target?.focus();
    target?.scrollIntoView({ block: 'center', inline: 'nearest' });
  });
}

function serializeAlertInhibitDraft(draft: AlertInhibitFormDraft) {
  return JSON.stringify(
    ALERT_INHIBIT_DRAFT_FINGERPRINT_FIELDS.map(field => [field, draft[field] == null ? '' : String(draft[field]).trim()])
  );
}

function buildAlertInhibitReturnEvidenceContext(returnContext: AlertInhibitRouteState['returnContext']): SignalRouteContext {
  return {
    entityId: returnContext.entityId,
    entityName: returnContext.entityName,
    returnTo: returnContext.returnTo,
    serviceName: returnContext.serviceName,
    serviceNamespace: returnContext.serviceNamespace,
    environment: returnContext.environment,
    timeRange: returnContext.timeRange,
    start: returnContext.start,
    end: returnContext.end,
    refresh: returnContext.refresh,
    live: returnContext.live,
    tz: returnContext.tz,
    source: returnContext.source,
    monitorId: returnContext.monitorId,
    monitorName: returnContext.monitorName,
    monitorApp: returnContext.monitorApp,
    monitorInstance: returnContext.monitorInstance,
    traceId: returnContext.traceId,
    spanId: returnContext.spanId,
    collector: returnContext.collector,
    template: returnContext.template
  };
}

export default function AlertInhibitPage({ initialRouteState }: { initialRouteState?: AlertInhibitRouteState } = {}) {
  const { t } = useI18n();
  const router = useRouter();
  const searchParams = useSearchParams();
  const routeSearchParamString = searchParams.toString();
  const routeSearch = searchParams.get('search') ?? '';
  const routePageIndex = parseAlertInhibitRouteInteger(searchParams.get('pageIndex'), 0);
  const routePageSize = parseAlertInhibitRouteInteger(searchParams.get('pageSize'), ALERT_INHIBIT_PAGE_SIZE_OPTIONS[0], 1);
  const routeListState = useMemo<AlertInhibitListRouteState>(() => ({
    search: routeSearch,
    pageIndex: routePageIndex,
    pageSize: routePageSize
  }), [routePageIndex, routePageSize, routeSearch]);
  const alertInhibitRouteState = initialRouteState ?? EMPTY_ALERT_INHIBIT_ROUTE_STATE;
  const { returnContext, signal, signalContext, managementContext } = alertInhibitRouteState;
  const inhibitEvidenceRouteContext = useMemo(
    () => signal ? signalContext : buildAlertInhibitReturnEvidenceContext(returnContext),
    [returnContext, signal, signalContext]
  );
  const inhibitEvidenceContext = useMemo(
    () => buildAlertInhibitEvidenceContext(signal, inhibitEvidenceRouteContext, t),
    [signal, inhibitEvidenceRouteContext, t]
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
  const [editorErrorContract, setEditorErrorContract] = useState<'save' | 'enable' | 'delete' | null>(null);
  const [draft, setDraft] = useState<AlertInhibitFormDraft>(() => buildAlertInhibitFormDraft(null, inhibitEvidenceContext?.draftPatch));
  const [editorInitialFingerprint, setEditorInitialFingerprint] = useState(() => (
    serializeAlertInhibitDraft(buildAlertInhibitFormDraft(null, inhibitEvidenceContext?.draftPatch))
  ));
  const [editorDiscardDialogOpen, setEditorDiscardDialogOpen] = useState(false);
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
  const editorDraftFingerprint = useMemo(() => serializeAlertInhibitDraft(draft), [draft]);
  const shouldConfirmEditorDiscard = Boolean(editorOpen && editorDraftFingerprint !== editorInitialFingerprint && !editorSaving);

  useEffect(() => {
    setSearch(routeListState.search);
    setQuery(routeListState.search);
    setPageIndex(routeListState.pageIndex);
    setPageSize(routeListState.pageSize);
    setSelectedId(null);
    setCheckedIds([]);
  }, [routeListState]);

  const replaceRouteQuery = useCallback((nextState: AlertInhibitListRouteState) => {
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

    if (nextState.pageSize !== ALERT_INHIBIT_PAGE_SIZE_OPTIONS[0]) {
      nextParams.set('pageSize', String(nextState.pageSize));
    } else {
      nextParams.delete('pageSize');
    }

    const nextParamString = nextParams.toString();
    const nextUrl = nextParamString ? `${ALERT_INHIBIT_ROUTE_PATH}?${nextParamString}` : ALERT_INHIBIT_ROUTE_PATH;
    const currentUrl = routeSearchParamString ? `${ALERT_INHIBIT_ROUTE_PATH}?${routeSearchParamString}` : ALERT_INHIBIT_ROUTE_PATH;
    if (nextUrl !== currentUrl) {
      router.replace(nextUrl, { scroll: false });
    }
  }, [routeSearchParamString, router]);

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
              const nextDraft = buildAlertInhibitFormDraft(null, { ...baseDraftPatch, ...prefill.draftPatch });
              setDraft(nextDraft);
              setEditorInitialFingerprint(serializeAlertInhibitDraft(nextDraft));
            } finally {
              setEditorLoading(false);
            }
          } else {
            const nextDraft = buildAlertInhibitFormDraft(null, baseDraftPatch);
            setDraft(nextDraft);
            setEditorInitialFingerprint(serializeAlertInhibitDraft(nextDraft));
          }
          setEditorDiscardDialogOpen(false);
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
            const nextDraft = buildAlertInhibitFormDraft(detail);
            setDraft(nextDraft);
            setEditorInitialFingerprint(serializeAlertInhibitDraft(nextDraft));
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
          const validationError = validateAlertInhibitForm(draft, t);
          if (validationError) {
            const validationField = getAlertInhibitValidationField(draft);
            setEditorError(validationError);
            setEditorErrorDetail(null);
            setEditorErrorContract(null);
            if (validationField) {
              focusAlertInhibitEditorField(validationField);
            }
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
            setEditorInitialFingerprint(serializeAlertInhibitDraft(draft));
            setEditorMessage(t(isEdit ? 'common.notify.edit-success' : 'common.notify.new-success'));
            setEditorOpen(false);
            setEditorDiscardDialogOpen(false);
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

        function handleCloseEditor() {
          setEditorOpen(false);
          setEditorError(null);
          setEditorErrorDetail(null);
          setEditorErrorContract(null);
          setEditorDiscardDialogOpen(false);
        }

        function requestCloseEditor() {
          if (shouldConfirmEditorDiscard) {
            setEditorDiscardDialogOpen(true);
            return;
          }
          handleCloseEditor();
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

        return (
          <>
            {(() => {
              const deleteTargetNames = deleteRequest?.ids
                .map(id => data.list.content.find(item => item.id === id)?.name?.trim())
                .filter((name): name is string => Boolean(name)) ?? [];
              const missingDeleteTargetCount = deleteRequest
                ? Math.max(deleteRequest.ids.length - deleteTargetNames.length, 0)
                : 0;
              const deleteConfirmCopy = [
                deleteRequest?.kind === 'batch'
                  ? t('alert.inhibit.delete.confirm.batch', { count: deleteRequest.ids.length })
                  : t('alert.inhibit.delete.confirm.single'),
                deleteTargetNames.length > 0
                  ? t('alert.inhibit.delete.confirm.targets', { names: deleteTargetNames.join(', ') })
                  : null,
                missingDeleteTargetCount > 0
                  ? t('alert.inhibit.delete.confirm.targets-more', { count: missingDeleteTargetCount })
                  : null
              ].filter(Boolean).join('\n');

              return (
                <div data-alert-delete-confirm={deleteRequest ? 'open' : 'closed'}>
                  <HzConfirmDialog
                    open={Boolean(deleteRequest)}
                    title={deleteRequest?.kind === 'batch' ? t('common.confirm.delete-batch') : t('common.confirm.delete')}
                    copy={deleteConfirmCopy}
                    confirmLabel={t('alert.inhibit.delete.confirm.action')}
                    cancelLabel={t('common.button.cancel')}
                    pending={deletePending}
                    onCancel={() => setDeleteRequest(null)}
                    onConfirm={() => void handleConfirmedDelete()}
                  />
                </div>
              );
            })()}
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
              requestedPageSize={pageSize}
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
              onCloseEditor={requestCloseEditor}
              onDraftChange={setDraft}
              onCopySourceToTarget={() => setDraft(prev => copyAlertInhibitSourceToTarget(prev))}
              onDropSeverity={() => setDraft(prev => dropSeverityFromAlertInhibitTarget(prev))}
              onClearTarget={() => setDraft(prev => clearAlertInhibitTarget(prev))}
              onClearEqual={() => setDraft(prev => clearAlertInhibitEqualLabels(prev))}
            />
            <div
              data-alert-inhibit-unsaved-cancel="hertzbeat-ui-confirm-dialog"
              data-alert-inhibit-unsaved-cancel-state={editorDiscardDialogOpen ? 'open' : 'closed'}
            >
              <HzConfirmDialog
                open={editorDiscardDialogOpen}
                title={t('alert.inhibit.unsaved-cancel.title')}
                kicker={t('alert.inhibit.unsaved-cancel.kicker')}
                copy={t('alert.inhibit.unsaved-cancel.copy')}
                confirmLabel={t('alert.inhibit.unsaved-cancel.discard')}
                cancelLabel={t('alert.inhibit.unsaved-cancel.keep-editing')}
                onCancel={() => setEditorDiscardDialogOpen(false)}
                onConfirm={handleCloseEditor}
              />
            </div>
          </>
        );
      }}
    </ClientWorkbench>
  );
}
