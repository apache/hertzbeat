/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { useNotification } from '@refinedev/core';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useState, type Dispatch, type SetStateAction } from 'react';
import { useTranslation } from 'react-i18next';

import {
  classifyMonitorReadError, loadMonitorApps, loadMonitorMetricCatalog, loadMonitors, MonitorContractError, type Monitor
} from '@/features/monitor';
import {
  classifyBulletinError, createBulletinAndRead, deleteBulletinAndConfirm, loadBulletin,
  loadBulletinMetrics, loadBulletins, updateBulletinAndRead
} from '../api/bulletin-api';
import { createBulletinDraft, validateBulletinDraft, type Bulletin, type BulletinDraft } from '../model/bulletin-model';
import { useBulletinQueryController } from './bulletin-query-controller';

type Failure = 'missing' | 'invalid' | 'unavailable' | 'error';
type Command = 'idle' | 'reading' | 'saving' | 'deleting';
type Dependencies = ReturnType<typeof useBulletinDependencies>;

export function useBulletinController() {
  const { t } = useTranslation();
  const notification = useNotification();
  const client = useQueryClient();
  const query = useBulletinQueryController();
  const list = useQuery({ queryKey: ['bulletins', query.query], queryFn: () => loadBulletins(query.query), retry: false });
  const [draft, setDraft] = useState<BulletinDraft | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [command, setCommand] = useState<Command>('idle');
  const dependencies = useBulletinDependencies(draft);
  const listState = resolveListState(list);
  const activeSelectedId = reconcileBulletinSelection(selectedId, listState);
  useSelectionConvergence(selectedId, activeSelectedId, setSelectedId);
  const metrics = useBulletinMetrics(activeSelectedId);
  const refresh = useCallback(async () => {
    const result = await list.refetch();
    if (result.isError || !result.data) throw result.error ?? new Error('Bulletin list reread failed');
  }, [list]);
  const edit = useBulletinEdit({ command, notification, setCommand, setDraft, t });
  const save = useBulletinSave({ client, command, dependencies, draft, notification, refresh,
    setCommand, setDraft, setSelectedId, t });
  const remove = useBulletinRemove({ client, command, notification, refresh, selectedId,
    setCommand, setSelectedId, t });
  return {
    state: { command, dependencies, draft, list: listState, metrics, query: query.query,
      refreshing: list.isFetching, search: query.search, selectedId: activeSelectedId },
    actions: {
      changePage: query.changePage, close: () => command === 'idle' && setDraft(null),
      create: () => command === 'idle' && setDraft(createBulletinDraft()), edit,
      refresh: () => void refresh().catch(() => undefined), remove, save, select: setSelectedId,
      setSearch: query.setSearch, submitSearch: query.submitSearch,
      updateDraft: (patch: Partial<BulletinDraft>) => setDraft(current => current ? { ...current, ...patch } : null)
    }
  };
}

export function reconcileBulletinSelection(selectedId: number | null,
  list: { kind: string; records?: Array<{ id: number }> }) {
  if (selectedId == null || list.kind === 'loading') return selectedId;
  if (list.kind !== 'ready') return null;
  return list.records?.some(record => record.id === selectedId) ? selectedId : null;
}

function useSelectionConvergence(selectedId: number | null, activeSelectedId: number | null,
  setSelectedId: StateSetter<number | null>) {
  useEffect(() => {
    if (selectedId == null || activeSelectedId != null) return;
    let active = true;
    queueMicrotask(() => {
      if (active) setSelectedId(current => current === selectedId ? null : current);
    });
    return () => { active = false; };
  }, [activeSelectedId, selectedId, setSelectedId]);
}

function useBulletinDependencies(draft: BulletinDraft | null) {
  const app = draft?.app ?? '';
  const apps = useQuery({ queryKey: ['bulletin-apps'], queryFn: loadBulletinApps, retry: false, staleTime: 30_000 });
  const monitors = useQuery({ queryKey: ['bulletin-monitors', app], queryFn: () => loadAllMonitors(app),
    enabled: Boolean(draft && app), retry: false });
  const catalogMonitor = monitors.data?.find(item => draft?.monitorIds.includes(item.id)) ?? monitors.data?.[0];
  const catalog = useQuery({ queryKey: ['bulletin-metric-catalog', catalogMonitor?.id],
    queryFn: () => loadMonitorMetricCatalog(catalogMonitor!), enabled: Boolean(draft && catalogMonitor), retry: false });
  return useMemo(() => {
    const records = buildBulletinDependencyRecords(apps.data, monitors.data, catalog.data);
    const failure = resolveDependencyFailure(apps.isError, apps.error, monitors.isError, monitors.error,
      catalog.isError, catalog.error);
    const loading = isDependencyLoading(apps.isPending, monitors.isPending, catalog.isPending, app, catalogMonitor);
    const stale = hasStaleDependencies(draft, loading, records);
    return { kind: loading ? 'loading' as const : failure ?? (stale ? 'invalid' as const : 'ready' as const), ...records };
  }, [apps.data, apps.error, apps.isError, apps.isPending, app, catalog.data, catalog.error, catalog.isError,
    catalog.isPending, catalogMonitor, draft, monitors.data, monitors.error, monitors.isError, monitors.isPending]);
}

export function loadBulletinApps({ signal }: { signal: AbortSignal }) {
  return loadMonitorApps(signal);
}

export function buildBulletinDependencyRecords(
  apps: Awaited<ReturnType<typeof loadMonitorApps>> | undefined,
  monitors: Monitor[] | undefined,
  catalog: Awaited<ReturnType<typeof loadMonitorMetricCatalog>> | undefined
) {
  return {
    apps: (apps ?? []).filter(item => Boolean(item.value) && item.value !== 'prometheus' && item.value !== '__system__'),
    monitors: (monitors ?? []).map(item => ({ id: item.id, name: item.name, app: item.app })),
    metrics: (catalog?.metrics ?? []).filter(item => item.visible).map(item => ({
      name: item.name, fields: (item.fields ?? []).flatMap(field => field.field ? [field.field] : [])
    }))
  };
}

function resolveDependencyFailure(appsError: boolean, appsReason: unknown, monitorsError: boolean,
  monitorsReason: unknown, catalogError: boolean, catalogReason: unknown) {
  if (monitorsError) return classifyBulletinMonitorError(monitorsReason);
  if (catalogError) return classifyBulletinMonitorError(catalogReason);
  if (appsError) return classifyBulletinMonitorError(appsReason);
  return null;
}

function isDependencyLoading(appsPending: boolean, monitorsPending: boolean, catalogPending: boolean,
  app: string, catalogMonitor: Monitor | undefined) {
  return appsPending || Boolean(app && monitorsPending) || Boolean(catalogMonitor && catalogPending);
}

function hasStaleDependencies(draft: BulletinDraft | null, loading: boolean,
  records: ReturnType<typeof buildBulletinDependencyRecords>) {
  if (draft?.id == null || loading) return false;
  return validateBulletinDraft(draft, records.monitors, records.metrics).length > 0;
}

function useBulletinMetrics(selectedId: number | null) {
  const query = useQuery({ queryKey: ['bulletin-metrics', selectedId], queryFn: () => loadBulletinMetrics(selectedId!),
    enabled: selectedId != null, retry: false, refetchInterval: 30_000 });
  if (selectedId == null) return { kind: 'idle' as const };
  if (query.isPending) return { kind: 'loading' as const };
  if (query.isError) return { kind: classifyBulletinError(query.error, 'metrics') };
  return query.data.content.length ? { kind: 'ready' as const, data: query.data } : { kind: 'empty' as const };
}

function useBulletinEdit({ command, notification, setCommand, setDraft, t }: CommandContext) {
  return useCallback(async (id: number) => {
    if (command !== 'idle') return;
    setCommand('reading');
    try { setDraft(await loadBulletin(id)); }
    catch (error) { notify(notification, t, 'read', classifyBulletinError(error, 'read-detail')); }
    finally { setCommand('idle'); }
  }, [command, notification, setCommand, setDraft, t]);
}

function useBulletinSave({ client, command, dependencies, draft, notification, refresh,
  setCommand, setDraft, setSelectedId, t }: SaveContext) {
  return useCallback(async () => {
    if (!draft || command !== 'idle' || dependencies.kind !== 'ready') return false;
    if (validateBulletinDraft(draft, dependencies.monitors, dependencies.metrics).length) {
      notification.open?.({ message: t('bulletin.validation'), type: 'error' });
      return false;
    }
    setCommand('saving');
    try {
      const saved = draft.id == null ? await createBulletinAndRead(draft) : await updateBulletinAndRead(draft);
      await client.invalidateQueries({ queryKey: ['bulletins'] });
      await refresh();
      setSelectedId(saved.id);
      await refreshSavedBulletinMetrics(client, saved.id);
      setDraft(null);
      notification.open?.({ message: t('bulletin.saveSuccess'), type: 'success' });
      return true;
    } catch (error) {
      notify(notification, t, 'save', classifyBulletinError(error, draft.id == null ? 'create' : 'update'));
      return false;
    } finally { setCommand('idle'); }
  }, [client, command, dependencies, draft, notification, refresh, setCommand, setDraft, setSelectedId, t]);
}

export async function refreshSavedBulletinMetrics(client: ReturnType<typeof useQueryClient>, id: number) {
  const queryKey = ['bulletin-metrics', id] as const;
  await client.invalidateQueries({ queryKey, exact: true, refetchType: 'none' });
  await client.fetchQuery({ queryKey, queryFn: () => loadBulletinMetrics(id), staleTime: 0 });
}

function useBulletinRemove({ client, command, notification, refresh, selectedId,
  setCommand, setSelectedId, t }: RemoveContext) {
  return useCallback(async (record: Bulletin) => {
    if (command !== 'idle') return;
    setCommand('deleting');
    try {
      await deleteBulletinAndConfirm(record.id);
      if (selectedId === record.id) setSelectedId(null);
      await client.invalidateQueries({ queryKey: ['bulletins'] }); await refresh();
      notification.open?.({ message: t('bulletin.deleteSuccess'), type: 'success' });
    } catch (error) { notify(notification, t, 'deleteError', classifyBulletinError(error, 'delete')); }
    finally { setCommand('idle'); }
  }, [client, command, notification, refresh, selectedId, setCommand, setSelectedId, t]);
}

async function loadAllMonitors(app: string): Promise<Monitor[]> {
  if (!app) return [];
  const result: Monitor[] = [];
  let pageIndex = 0;
  let totalPages = 1;
  do {
    const page = await loadMonitors({ search: '', app, status: '9', labels: '', pageIndex, pageSize: 50 });
    if (page.totalPages > 20) throw new Error('Monitor option safety bound exceeded');
    result.push(...page.content); totalPages = page.totalPages; pageIndex += 1;
  } while (pageIndex < totalPages);
  return result;
}

export function classifyBulletinMonitorError(error: unknown): Exclude<Failure, 'missing'> {
  if (error instanceof MonitorContractError) return 'invalid';
  return classifyMonitorReadError(error) === 'unavailable' ? 'unavailable' : 'error';
}
function resolveListState(list: ReturnType<typeof useQuery>) {
  if (list.isPending) return { kind: 'loading' as const };
  if (list.isError) return { kind: classifyBulletinError(list.error) };
  const data = list.data as Awaited<ReturnType<typeof loadBulletins>>;
  return data.content.length ? { kind: 'ready' as const, records: data.content, total: data.totalElements } : { kind: 'empty' as const };
}
function notify(notification: ReturnType<typeof useNotification>, t: (key: string) => string,
  operation: 'read' | 'save' | 'deleteError', failure: Failure) {
  notification.open?.({ message: t(`bulletin.${operation}.${failure}`), type: 'error' });
}

type StateSetter<T> = Dispatch<SetStateAction<T>>;
type CommandContext = { command: Command; notification: ReturnType<typeof useNotification>;
  setCommand: StateSetter<Command>; setDraft: StateSetter<BulletinDraft | null>; t: (key: string) => string };
type SaveContext = CommandContext & { client: ReturnType<typeof useQueryClient>; dependencies: Dependencies;
  draft: BulletinDraft | null; refresh: () => Promise<void>; setSelectedId: StateSetter<number | null> };
type RemoveContext = Omit<CommandContext, 'setDraft'> & { client: ReturnType<typeof useQueryClient>;
  refresh: () => Promise<void>; selectedId: number | null; setSelectedId: StateSetter<number | null> };
