/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { useQuery } from '@tanstack/react-query';

import {
  classifyMonitorReadError,
  loadMonitorApps,
  loadMonitorMetricCatalog,
  loadMonitors,
  MonitorContractError,
  type Monitor
} from '@/features/monitor';
import { validateBulletinDraft, type BulletinDraft } from '../model/bulletin-model';
import { bulletinQueryKeys } from './bulletin-query-keys';

const bulletinDependencyStaleTimeMs = 30_000;
const maximumMonitorProofPages = 20;
const monitorProofPageSize = 50;

export type BulletinDependencies = ReturnType<typeof useBulletinDependencies>;

export function useBulletinDependencies(draft: BulletinDraft | null) {
  const resources = useBulletinDependencyResources(draft);
  return resolveBulletinDependencies(draft, resources);
}

function useBulletinDependencyResources(draft: BulletinDraft | null) {
  const app = draft?.app ?? '';
  const apps = useQuery({
    queryKey: bulletinQueryKeys.apps(),
    queryFn: loadBulletinApps,
    retry: false,
    staleTime: bulletinDependencyStaleTimeMs
  });
  const monitors = useQuery({
    queryKey: bulletinQueryKeys.monitors(app),
    queryFn: () => loadAllMonitors(app),
    enabled: Boolean(draft && app),
    retry: false
  });
  const catalogMonitor = monitors.data?.find(item => draft?.monitorIds.includes(item.id))
    ?? monitors.data?.[0];
  const catalog = useQuery({
    queryKey: bulletinQueryKeys.catalog(catalogMonitor?.id ?? null),
    queryFn: () => loadMonitorMetricCatalog(catalogMonitor!),
    enabled: Boolean(draft && catalogMonitor),
    retry: false
  });
  return { app, apps, catalog, catalogMonitor, monitors };
}

function resolveBulletinDependencies(
  draft: BulletinDraft | null,
  resources: ReturnType<typeof useBulletinDependencyResources>
) {
  const { app, apps, catalog, catalogMonitor, monitors } = resources;
  const records = buildBulletinDependencyRecords(apps.data, monitors.data, catalog.data);
  const failure = resolveDependencyFailure(
    apps.isError,
    apps.error,
    monitors.isError,
    monitors.error,
    catalog.isError,
    catalog.error
  );
  const loading = isDependencyLoading(
    apps.isPending,
    monitors.isPending,
    catalog.isPending,
    app,
    catalogMonitor
  );
  const stale = hasStaleDependencies(draft, loading, records);
  const kind = loading ? 'loading' as const
    : failure ?? (stale ? 'invalid' as const : 'ready' as const);
  return { kind, ...records };
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
    apps: (apps ?? []).filter(item => (
      Boolean(item.value) && item.value !== 'prometheus' && item.value !== '__system__'
    )),
    monitors: (monitors ?? []).map(item => ({ id: item.id, name: item.name, app: item.app })),
    metrics: (catalog?.metrics ?? []).filter(item => item.visible).map(item => ({
      name: item.name,
      fields: (item.fields ?? []).flatMap(field => field.field ? [field.field] : [])
    }))
  };
}

export function classifyBulletinMonitorError(error: unknown): 'invalid' | 'unavailable' | 'error' {
  if (error instanceof MonitorContractError) return 'invalid';
  return classifyMonitorReadError(error) === 'unavailable' ? 'unavailable' : 'error';
}

function resolveDependencyFailure(
  appsError: boolean,
  appsReason: unknown,
  monitorsError: boolean,
  monitorsReason: unknown,
  catalogError: boolean,
  catalogReason: unknown
) {
  if (monitorsError) return classifyBulletinMonitorError(monitorsReason);
  if (catalogError) return classifyBulletinMonitorError(catalogReason);
  if (appsError) return classifyBulletinMonitorError(appsReason);
  return null;
}

function isDependencyLoading(
  appsPending: boolean,
  monitorsPending: boolean,
  catalogPending: boolean,
  app: string,
  catalogMonitor: Monitor | undefined
) {
  return appsPending || Boolean(app && monitorsPending) || Boolean(catalogMonitor && catalogPending);
}

function hasStaleDependencies(
  draft: BulletinDraft | null,
  loading: boolean,
  records: ReturnType<typeof buildBulletinDependencyRecords>
) {
  if (draft?.id == null || loading) return false;
  return validateBulletinDraft(draft, records.monitors, records.metrics).length > 0;
}

async function loadAllMonitors(app: string): Promise<Monitor[]> {
  if (!app) return [];
  const result: Monitor[] = [];
  let pageIndex = 0;
  let totalPages = 1;
  do {
    const page = await loadMonitors({
      search: '',
      app,
      status: '9',
      labels: '',
      pageIndex,
      pageSize: monitorProofPageSize
    });
    if (page.totalPages > maximumMonitorProofPages) {
      throw new Error('Monitor option safety bound exceeded');
    }
    result.push(...page.content);
    totalPages = page.totalPages;
    pageIndex += 1;
  } while (pageIndex < totalPages);
  return result;
}
