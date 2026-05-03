'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  DrawerCodePreview,
  DrawerSection,
  ObservabilityStatusState,
  SelectableEvidenceList,
  StageSection,
  SummaryMetricGrid,
  ToolbarField,
  ToolbarRow
} from '@/components/observability';
import { ClientWorkbench } from '@/components/workbench/client-workbench';
import { useI18n } from '@/components/providers/i18n-provider';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { FileInput } from '@/components/ui/file-input';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { OverlayDialog } from '@/components/workbench/overlay-dialog';
import { RowList, WorkbenchPage } from '@/components/workbench/workbench-page';
import { apiMessageDelete, apiMessageGet, apiMessagePost, getAuthorizationToken, getCurrentLocale } from '@/lib/api-client';
import { formatTime } from '@/lib/format';
import {
  buildExportAllMonitorsUrl,
  buildExportMonitorsUrl,
  buildImportMonitorsUrl,
  copyMonitor,
  deleteGrafanaDashboard,
  deleteMonitors,
  enableMonitor,
  enableMonitors,
  pauseMonitor,
  pauseMonitors,
  resolveDownloadFilename
} from '@/lib/monitor-manage/controller';
import { buildLabelRows, statusLabel } from '@/lib/monitor-manage/display-mapping';
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
  queryStateFromParams,
  type MonitorQueryState
} from '@/lib/monitor-manage/query-state';
import {
  buildMonitorMetrics,
  buildMonitorWorkbenchNarrative,
  buildSelectedMonitorRows,
  shouldFallbackMonitorEntityWorkbench
} from '@/lib/monitor-manage/view-model';
import type { Monitor, PageResult } from '@/lib/types';

type MonitorPageData = {
  list: PageResult<Monitor>;
  query: MonitorQueryState;
  entityWorkbenchFallback: boolean;
};


export default function MonitorsPage() {
  const { t } = useI18n();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [draft, setDraft] = useState<MonitorQueryState>(() =>
    applyMonitorWorkspaceDefaults(queryStateFromParams(searchParams))
  );
  const [query, setQuery] = useState<MonitorQueryState>(() =>
    applyMonitorWorkspaceDefaults(queryStateFromParams(searchParams))
  );
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [checkedIds, setCheckedIds] = useState<number[]>([]);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const importInputRef = useRef<HTMLInputElement | null>(null);
  const explicitStatus = searchParams.get('status') || '';

  useEffect(() => {
    const nextQuery = applyMonitorWorkspaceDefaults(queryStateFromParams(searchParams));
    setDraft(nextQuery);
    setQuery(nextQuery);
    const hasDisplayLabelParam = searchParams.has('returnLabel') || Boolean(searchParams.get('returnTo')?.includes('returnLabel'));
    if (hasDisplayLabelParam) {
      const canonicalRoute = buildMonitorRouteUrl(nextQuery);
      const currentQuery = searchParams.toString();
      const currentRoute = currentQuery ? `/monitors?${currentQuery}` : '/monitors';
      if (canonicalRoute !== currentRoute) {
        router.replace(canonicalRoute);
      }
    }
  }, [router, searchParams]);

  const load = useCallback(async (): Promise<MonitorPageData> => {
    void reloadKey;
    const list = await apiMessageGet<PageResult<Monitor>>(buildMonitorUrl(query));
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
      const fallbackList = await apiMessageGet<PageResult<Monitor>>(buildMonitorUrl(fallbackQuery));
      return {
        list: fallbackList,
        query: fallbackQuery,
        entityWorkbenchFallback: true
      };
    }

    return {
      list,
      query,
      entityWorkbenchFallback: false
    };
  }, [explicitStatus, query, reloadKey]);

  return (
    <ClientWorkbench load={load} loadingCopy={t('monitors.loading')}>
      {data => {
        const selected = data.list.content.find(item => item.id === selectedId) ?? data.list.content[0] ?? null;
        const labelRows = buildLabelRows(selected?.labels, t);
        const resolvedPageIndex = Math.max(0, Number.parseInt(data.query.pageIndex || String(data.list.pageIndex ?? 0), 10) || 0);
        const resolvedPageSize = Math.max(1, Number.parseInt(data.query.pageSize || String(data.list.pageSize ?? 8), 10) || 8);
        const totalPages = Math.max(1, Math.ceil((data.list.totalElements || 0) / resolvedPageSize));
        const entityContextActive = hasMonitorEntityContext(query);
        const downCount = data.list.content.filter(item => item.status === 2).length;
        const badgeVariantForStatus = (status?: number) => {
          if (status === 1) return 'success' as const;
          if (status === 2) return 'danger' as const;
          return 'default' as const;
        };

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
          setCheckedIds([]);
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
          setCheckedIds([]);
          setSelectedId(null);
          router.replace(buildMonitorRouteUrl(nextQuery));
        };

        const navigateWithQuery = (nextQuery: MonitorQueryState) => {
          setDraft(nextQuery);
          setQuery(nextQuery);
          setCheckedIds([]);
          setSelectedId(null);
          router.replace(buildMonitorRouteUrl(nextQuery));
        };

        const checkedCount = checkedIds.length;
        const currentPageIds = data.list.content.map(item => item.id);
        const allVisibleSelected = currentPageIds.length > 0 && currentPageIds.every(id => checkedIds.includes(id));
        const selectedSummary = selected ? `${selected.name} · ${statusLabel(selected.status, t)}` : t('common.none');
        const navigationContext = {
          app: data.query.app || selected?.app || 'website',
          labels: data.query.labels,
          pageIndex: String(resolvedPageIndex),
          pageSize: String(resolvedPageSize),
          entityId: data.query.entityId,
          entityName: data.query.entityName,
          returnTo: buildMonitorRouteUrl(data.query)
        };

        const downloadExport = async (path: string, fallbackName: string) => {
          const token = getAuthorizationToken();
          const locale = getCurrentLocale();
          const response = await fetch(path.startsWith('/api') ? path : `/api${path}`, {
            headers: {
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
              ...(locale ? { 'Accept-Language': locale } : {})
            },
            cache: 'no-store'
          });
          if (!response.ok) {
            throw new Error(`Export failed: ${response.status}`);
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
          const token = getAuthorizationToken();
          const locale = getCurrentLocale();
          const formData = new FormData();
          formData.append('file', file);
          const response = await fetch(`/api${buildImportMonitorsUrl()}`, {
            method: 'POST',
            headers: {
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
              ...(locale ? { 'Accept-Language': locale } : {})
            },
            body: formData
          });
          if (!response.ok) {
            throw new Error(`Import failed: ${response.status}`);
          }
          const payload = (await response.json()) as { code: number; msg?: string };
          if (payload.code !== 0) {
            throw new Error(payload.msg || t('common.notify.import-fail'));
          }
        };

        const handleCopyMonitor = async () => {
          if (!selected?.id) return;
          try {
            await copyMonitor(apiMessagePost as any, selected.id);
            setActionMessage(t('monitor.copy.success'));
            setActionError(null);
            setReloadKey(prev => prev + 1);
          } catch (error) {
            setActionError(error instanceof Error ? error.message : t('monitor.copy.failed'));
          }
        };

        const handleEnableMonitor = async () => {
          if (!selected?.id) return;
          try {
            await enableMonitor(apiMessageGet as any, selected.id);
            setActionMessage(t('common.notify.enable-success'));
            setActionError(null);
            setReloadKey(prev => prev + 1);
          } catch (error) {
            setActionError(error instanceof Error ? error.message : t('common.notify.enable-fail'));
          }
        };

        const handlePauseMonitor = async () => {
          if (!selected?.id) return;
          try {
            await pauseMonitor(apiMessageDelete as any, selected.id);
            setActionMessage(t('common.notify.cancel-success'));
            setActionError(null);
            setReloadKey(prev => prev + 1);
          } catch (error) {
            setActionError(error instanceof Error ? error.message : t('common.notify.cancel-fail'));
          }
        };

        const handleDeleteGrafanaDashboard = async () => {
          if (!selected?.id) return;
          try {
            await deleteGrafanaDashboard(apiMessageDelete as any, selected.id);
            setActionMessage(t('common.delete-success'));
            setActionError(null);
          } catch (error) {
            setActionError(error instanceof Error ? error.message : t('common.delete-failed'));
          }
        };

        const handleDeleteSelected = async () => {
          if (checkedIds.length === 0) {
            setDeleteDialogOpen(false);
            return;
          }
          try {
            await deleteMonitors(apiMessageDelete as any, checkedIds);
            setActionMessage(t('common.delete-success'));
            setActionError(null);
            setCheckedIds([]);
            setDeleteDialogOpen(false);
            setReloadKey(prev => prev + 1);
          } catch (error) {
            setActionError(error instanceof Error ? error.message : t('common.delete-failed'));
          }
        };

        const handleSelectVisible = () => {
          setCheckedIds(currentPageIds);
        };

        const handleClearSelection = () => {
          setCheckedIds([]);
        };

        const handleExportSelected = async (type: 'JSON' | 'EXCEL') => {
          if (checkedIds.length === 0) {
            setActionError(t('common.notify.no-select-export'));
            return;
          }
          try {
            await downloadExport(
              buildExportMonitorsUrl(checkedIds, type),
              type === 'JSON' ? 'monitors.json' : 'monitors.xlsx'
            );
            setActionMessage(t('common.notify.export-success'));
            setActionError(null);
          } catch (error) {
            setActionError(error instanceof Error ? error.message : t('common.notify.export-fail'));
          }
        };

        const handleExportAll = async (type: 'JSON' | 'EXCEL') => {
          try {
            await downloadExport(
              buildExportAllMonitorsUrl(type),
              type === 'JSON' ? 'all-monitors.json' : 'all-monitors.xlsx'
            );
            setActionMessage(t('common.notify.export-success'));
            setActionError(null);
          } catch (error) {
            setActionError(error instanceof Error ? error.message : t('common.notify.export-fail'));
          }
        };

        const handleImportClick = () => {
          importInputRef.current?.click();
        };

        const handleImportChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
          const file = event.target.files?.[0];
          event.target.value = '';
          if (!file) return;
          try {
            await uploadImport(file);
            setActionMessage(t('common.notify.import-submitted'));
            setActionError(null);
            setReloadKey(prev => prev + 1);
          } catch (error) {
            setActionError(error instanceof Error ? error.message : t('common.notify.import-fail'));
          }
        };

        const handleEnableSelected = async () => {
          if (checkedIds.length === 0) return;
          try {
            await enableMonitors(apiMessageGet as any, checkedIds);
            setActionMessage(t('common.notify.enable-success'));
            setActionError(null);
            setCheckedIds([]);
            setReloadKey(prev => prev + 1);
          } catch (error) {
            setActionError(error instanceof Error ? error.message : t('common.notify.enable-fail'));
          }
        };

        const handlePauseSelected = async () => {
          if (checkedIds.length === 0) return;
          try {
            await pauseMonitors(apiMessageDelete as any, checkedIds);
            setActionMessage(t('common.notify.cancel-success'));
            setActionError(null);
            setCheckedIds([]);
            setReloadKey(prev => prev + 1);
          } catch (error) {
            setActionError(error instanceof Error ? error.message : t('common.notify.cancel-fail'));
          }
        };

        return (
          <>
            <WorkbenchPage
            kicker={t('monitors.kicker')}
            title={t('monitors.title')}
            subtitle={buildMonitorWorkbenchNarrative(
              {
                entityContextActive,
                total: data.list.totalElements || 0,
                downCount,
                status: data.query.status,
                fellBackToAll: data.entityWorkbenchFallback
              },
              t
            )}
            tone="operator"
            facts={[
              { label: t('common.workspace'), value: t('monitors.workspace') },
              { label: t('monitors.fact.total'), value: String(data.list.totalElements ?? 0) },
              { label: t('monitors.fact.page-count'), value: String(data.list.content?.length ?? 0) },
              { label: t('monitors.fact.filter-status'), value: data.query.status ? statusLabel(Number(data.query.status), t) : t('common.all') }
            ]}
            actions={
              <>
                <Button size="sm" variant="subtle" onClick={resetQuery}>
                  {t('common.clear')}
                </Button>
                <Button size="sm" variant="subtle" onClick={allVisibleSelected ? handleClearSelection : handleSelectVisible}>
                  {allVisibleSelected ? t('common.clear-selection') : t('common.select-all')}
                </Button>
                {entityContextActive ? (
                  <Link href={buildMonitorEntityReturnHref(query)}>
                    <Button size="sm" variant="default">
                      {query.entityName || t('entity.response.context.return')}
                    </Button>
                  </Link>
                ) : null}
                {!entityContextActive ? (
                  <>
                    <FileInput
                      ref={importInputRef}
                      data-monitors-import-file-input="true"
                      onChange={event => void handleImportChange(event)}
                    />
                    <Link href={buildMonitorNewHref(navigationContext)}>
                      <Button size="sm" variant="subtle">{t('monitor.new-monitor')}</Button>
                    </Link>
                    <Button size="sm" variant="subtle" onClick={handleImportClick}>
                      {t('common.import')}
                    </Button>
                  </>
                ) : null}
                <Button size="sm" variant="primary" onClick={applyQuery}>
                  {t('common.apply-filters')}
                </Button>
                {selected ? (
                  <Link href={buildMonitorDetailHref(selected.id, navigationContext)}>
                    <Button size="sm" variant="default" data-monitors-open-detail-action="true">
                      {t('monitors.open-detail')}
                    </Button>
                  </Link>
                ) : null}
                {selected ? (
                  <Link href={buildMonitorEditHref(selected.id, navigationContext)}>
                    <Button size="sm" variant="default">{t('monitor.edit-monitor')}</Button>
                  </Link>
                ) : null}
              </>
            }
            main={
              <div className="space-y-3">
                <ToolbarRow className="grid md:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)_160px]">
                  <ToolbarField label={t('common.search')}>
                    <Input
                      data-monitors-search-input="true"
                      placeholder={t('monitors.search.placeholder')}
                      value={draft.search}
                      onChange={e => setDraft(prev => ({ ...prev, search: e.target.value }))}
                    />
                  </ToolbarField>
                  <ToolbarField label={t('common.app')}>
                    <Input
                      data-monitors-app-input="true"
                      placeholder={t('common.app.placeholder')}
                      value={draft.app}
                      onChange={e => setDraft(prev => ({ ...prev, app: e.target.value }))}
                    />
                  </ToolbarField>
                  <ToolbarField label={t('common.labels')}>
                    <Input placeholder={t('monitors.labels.placeholder')} value={draft.labels} onChange={e => setDraft(prev => ({ ...prev, labels: e.target.value }))} />
                  </ToolbarField>
                  <ToolbarField label={t('common.status')}>
                    <Select
                      data-monitors-status-filter="true"
                      value={draft.status}
                      onChange={e => setDraft(prev => ({ ...prev, status: e.target.value }))}
                    >
                      <option value="">{t('monitors.status.all')}</option>
                      <option value="1">{t('monitors.status.up')}</option>
                      <option value="2">{t('monitors.status.down')}</option>
                      <option value="0">{t('monitors.status.paused')}</option>
                    </Select>
                  </ToolbarField>
                </ToolbarRow>

                <SummaryMetricGrid items={buildMonitorMetrics(data.list.content, t)} compact tone="operator" />

                <StageSection
                  title={t('monitors.section.list.title')}
                  description={t('monitors.section.list.copy')}
                  compact
                  chrome="plain"
                >
                  {data.list.content.length === 0 ? (
                    <ObservabilityStatusState title={t('monitors.empty-results.title')} copy={t('monitors.empty-results.copy')} />
                  ) : (
                    <div className="grid gap-0">
                      <div className="flex items-center justify-between border-b border-[var(--ops-border-color)] px-3 py-2 text-[11px] uppercase tracking-[0.14em] text-[var(--ops-text-tertiary)]">
                        <div>{t('monitors.section.list.head')}</div>
                        <div>{`${t('common.selected')} ${checkedCount} / ${data.list.content.length}`}</div>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 border-b border-[var(--ops-border-color)] px-3 py-2.5">
                        <Button size="sm" variant="subtle" onClick={() => void handleEnableSelected()} disabled={checkedCount === 0}>
                          {t('monitors.controls.enable-selected')}
                        </Button>
                        <Button
                          size="sm"
                          variant="subtle"
                          onClick={() => void handlePauseSelected()}
                          disabled={checkedCount === 0}
                          data-monitors-pause-selected-action="true"
                        >
                          {t('monitors.controls.pause-selected')}
                        </Button>
                        <Button size="sm" variant="subtle" onClick={() => void handleExportSelected('JSON')} disabled={checkedCount === 0}>
                          {t('common.export-selected-json')}
                        </Button>
                        <Button size="sm" variant="subtle" onClick={() => void handleExportSelected('EXCEL')} disabled={checkedCount === 0}>
                          {t('common.export-selected-excel')}
                        </Button>
                        <Button
                          size="sm"
                          variant="subtle"
                          onClick={() => setDeleteDialogOpen(true)}
                          disabled={checkedCount === 0}
                          data-monitors-delete-confirm-trigger="cold-modal"
                        >
                          {t('common.button.delete')} {checkedCount > 0 ? `(${checkedCount})` : ''}
                        </Button>
                      </div>
                      <SelectableEvidenceList
                        rows={data.list.content.map(item => ({
                          key: String(item.id),
                          title: item.name,
                          copy: item.instance || `${item.app} · ${item.scrape || '-'}`,
                          meta: t('monitors.updated-at', { time: formatTime(item.gmtUpdate || item.gmtCreate || null) }),
                          extra: (
                            <div className="flex flex-wrap items-center justify-between gap-2 pt-0.5">
                              <div className="flex flex-wrap items-center gap-2">
                                <Badge variant={badgeVariantForStatus(item.status)}>{statusLabel(item.status, t)}</Badge>
                                <span className="text-[10px] uppercase tracking-[0.14em] text-[var(--ops-text-tertiary)]">
                                  {`${item.app} · scrape ${item.scrape || '-'}`}
                                </span>
                              </div>
                              <div onClick={event => event.stopPropagation()}>
                                <Checkbox
                                  data-monitors-row-select={String(item.id)}
                                  checked={checkedIds.includes(item.id)}
                                  onChange={event => {
                                    const nextChecked = event.target.checked;
                                    setCheckedIds(prev => {
                                      const next = resolveMonitorCheckboxSelection(prev, selectedId, item.id, nextChecked);
                                      setSelectedId(next.selectedId);
                                      return next.checkedIds;
                                    });
                                  }}
                                  containerClassName="min-h-0 text-[11px] text-[var(--ops-text-secondary)]"
                                  label={t('common.select')}
                                />
                              </div>
                            </div>
                          )
                        }))}
                        selectedKey={selectedId != null ? String(selectedId) : null}
                        onSelect={key => {
                          const monitorId = Number(key);
                          setSelectedId(monitorId);
                          router.push(buildMonitorDetailHref(monitorId, navigationContext));
                        }}
                      />
                      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--ops-border-color)] px-3 py-2.5">
                        <div className="text-xs text-[var(--ops-text-secondary)]">
                          {`${t('common.page')} ${resolvedPageIndex + 1} / ${totalPages} · ${t('monitor.center.console.result.total')} ${data.list.totalElements || 0}`}
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-xs text-[var(--ops-text-secondary)]">{t('common.page-size')}</span>
                          <Select
                            value={String(resolvedPageSize)}
                            onChange={event =>
                              navigateWithQuery({
                                ...data.query,
                                pageIndex: '0',
                                pageSize: event.target.value
                              })
                            }
                          >
                            <option value="8">8</option>
                            <option value="20">20</option>
                            <option value="50">50</option>
                          </Select>
                          <Button
                            size="sm"
                            variant="subtle"
                            disabled={resolvedPageIndex <= 0}
                            onClick={() =>
                              navigateWithQuery({
                                ...data.query,
                                pageIndex: String(Math.max(0, resolvedPageIndex - 1)),
                                pageSize: String(resolvedPageSize)
                              })
                            }
                          >
                            {t('common.previous')}
                          </Button>
                          <Button
                            size="sm"
                            variant="subtle"
                            disabled={resolvedPageIndex >= totalPages - 1}
                            onClick={() =>
                              navigateWithQuery({
                                ...data.query,
                                pageIndex: String(Math.min(totalPages - 1, resolvedPageIndex + 1)),
                                pageSize: String(resolvedPageSize)
                              })
                            }
                          >
                            {t('common.next')}
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                </StageSection>
              </div>
            }
            side={
              <div className="space-y-3">
                <DrawerSection title={t('monitors.rail.selected')} chrome="plain">
                  <RowList
                    rows={buildSelectedMonitorRows(selected, t, formatTime, statusLabel)}
                  />
                  {selected ? (
                    <DrawerCodePreview className="mt-2">
                      {JSON.stringify(selected, null, 2)}
                    </DrawerCodePreview>
                  ) : null}
                </DrawerSection>

                <DrawerSection title={t('monitors.rail.labels')} chrome="plain">
                  <RowList rows={labelRows.length > 0 ? labelRows : [{ title: t('monitors.empty-labels.title'), copy: t('monitors.empty-labels.copy'), meta: '-' }]} />
                </DrawerSection>

                <DrawerSection title={t('monitors.rail.controls')} chrome="plain">
                  <div className="grid gap-2">
                    <section className="grid gap-2 border-b border-[var(--ops-border-color)] pb-2">
                      <div className="text-[10px] uppercase tracking-[0.16em] text-[var(--ops-text-tertiary)]">
                        {t('monitors.controls.selected.title')}
                      </div>
                      <div className="text-[12px] leading-5 text-[var(--ops-text-secondary)]">{selectedSummary}</div>
                      <div className="flex flex-wrap gap-2">
                        {selected ? (
                          <Button size="sm" variant="default" onClick={() => void handleCopyMonitor()} data-monitors-copy-action="true">
                            {t('monitor.copy.action')}
                          </Button>
                        ) : null}
                        {selected?.status === 0 ? (
                          <Button size="sm" variant="default" onClick={() => void handleEnableMonitor()}>
                            {t('common.enable')}
                          </Button>
                        ) : null}
                        {selected && selected.status !== 0 ? (
                          <Button size="sm" variant="subtle" onClick={() => void handlePauseMonitor()}>
                            {t('common.pause')}
                          </Button>
                        ) : null}
                        {selected ? (
                          <Button size="sm" variant="subtle" onClick={() => void handleDeleteGrafanaDashboard()}>
                            {t('monitor.detail.delete-grafana')}
                          </Button>
                        ) : null}
                      </div>
                    </section>

                    <section className="grid gap-2 pt-1">
                      <div className="text-[10px] uppercase tracking-[0.16em] text-[var(--ops-text-tertiary)]">
                        {t('monitors.controls.batch.title')}
                      </div>
                      <div className="text-[12px] leading-5 text-[var(--ops-text-secondary)]">
                        {t('monitors.controls.batch.copy')}
                        {' · '}
                        {`${t('common.selected')} ${checkedCount}`}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button size="sm" variant="subtle" onClick={() => void handleExportAll('JSON')}>
                          {t('common.export-all-json')}
                        </Button>
                        <Button size="sm" variant="subtle" onClick={() => void handleExportAll('EXCEL')}>
                          {t('common.export-all-excel')}
                        </Button>
                      </div>
                    </section>
                  </div>
                  {actionMessage ? <div className="mt-2 text-sm text-emerald-300">{actionMessage}</div> : null}
                  {actionError ? <div className="mt-2"><ObservabilityStatusState title={t('common.failed')} copy={actionError} tone="danger" /></div> : null}
                </DrawerSection>
              </div>
            }
            />
            <OverlayDialog
              open={deleteDialogOpen}
              onClose={() => setDeleteDialogOpen(false)}
              kicker={t('menu.monitor.center')}
              title="确认删除监控"
              maxWidthClassName="max-w-xl"
              footer={
                <div className="flex justify-end gap-2">
                  <Button size="sm" variant="subtle" onClick={() => setDeleteDialogOpen(false)}>
                    取消
                  </Button>
                  <Button size="sm" variant="primary" onClick={() => void handleDeleteSelected()} disabled={checkedCount === 0}>
                    确认删除
                  </Button>
                </div>
              }
            >
              <div
                data-monitors-delete-confirm="cold-modal"
                className="space-y-3 text-[12px] leading-6 text-[var(--ops-text-secondary)]"
              >
                <p>删除后选中的监控对象会从监控目录移除，相关实体绑定和告警排查入口需要重新归并。</p>
                <div className="rounded-[4px] border border-[var(--ops-border-color)] bg-[var(--ops-surface-raised)] px-3 py-2 font-semibold text-[var(--ops-text-primary)]">
                  已选择 {checkedCount} 个监控对象
                </div>
              </div>
            </OverlayDialog>
          </>
        );
      }}
    </ClientWorkbench>
  );
}
