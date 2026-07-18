/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';

import { resolveLocale } from '@/core/i18n/i18n';
import {
  classifyMonitorReadError,
  loadMonitorAppHierarchy,
  loadMonitorApps,
  loadMonitors,
  MonitorContractError,
  type Monitor
} from '@/features/monitor';
import {
  BulletinMetricTreeError,
  buildBulletinMetricTree,
  resolveSavedMetricTreeSelection,
  type BulletinMetricTreeMetricNode
} from '../model/bulletin-metric-tree-model';
import type { BulletinDraft } from '../model/bulletin-model';
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
  const { i18n } = useTranslation();
  const app = draft?.app ?? '';
  const locale = resolveLocale(i18n.resolvedLanguage ?? i18n.language);
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
  const hierarchy = useQuery({
    queryKey: bulletinQueryKeys.hierarchy(app, locale),
    queryFn: ({ signal }) => loadBulletinMetricTree(app, locale, signal),
    enabled: Boolean(draft && app),
    retry: false
  });
  return { app, apps, hierarchy, locale, monitors };
}

function resolveBulletinDependencies(
  draft: BulletinDraft | null,
  resources: ReturnType<typeof useBulletinDependencyResources>
) {
  const { app, apps, hierarchy, monitors } = resources;
  const metricTree = hierarchy.data ?? [];
  const records = buildBulletinDependencyRecords(apps.data, monitors.data, metricTree);
  const failure = resolveDependencyFailure(
    apps.isError,
    apps.error,
    monitors.isError,
    monitors.error,
    hierarchy.isError,
    hierarchy.error
  );
  const loading = isDependencyLoading(
    apps.isPending,
    monitors.isPending,
    hierarchy.isPending,
    app
  );
  const kind = loading ? 'loading' as const
    : failure ?? 'ready' as const;
  const fieldSelection = hasUnknownSavedFields(draft, metricTree) ? 'stale' as const : 'valid' as const;
  return { kind, fieldSelection, metricTree: kind === 'ready' ? metricTree : [], ...records };
}

export function loadBulletinApps({ signal }: { signal: AbortSignal }) {
  return loadMonitorApps(signal);
}

export function buildBulletinDependencyRecords(
  apps: Awaited<ReturnType<typeof loadMonitorApps>> | undefined,
  monitors: Monitor[] | undefined,
  metricTree: BulletinMetricTreeMetricNode[] | undefined
) {
  return {
    apps: (apps ?? []).filter(item => (
      Boolean(item.value) && item.value !== 'prometheus' && item.value !== '__system__'
    )),
    monitors: (monitors ?? []).map(item => ({ id: item.id, name: item.name, app: item.app })),
    metrics: (metricTree ?? []).map(item => ({
      name: item.metric,
      fields: item.children.map(field => field.field)
    }))
  };
}

export function classifyBulletinMonitorError(error: unknown): 'invalid' | 'unavailable' | 'error' {
  if (error instanceof MonitorContractError || error instanceof BulletinMetricTreeError) return 'invalid';
  return classifyMonitorReadError(error) === 'unavailable' ? 'unavailable' : 'error';
}

function resolveDependencyFailure(
  appsError: boolean,
  appsReason: unknown,
  monitorsError: boolean,
  monitorsReason: unknown,
  hierarchyError: boolean,
  hierarchyReason: unknown
) {
  if (monitorsError) return classifyBulletinMonitorError(monitorsReason);
  if (hierarchyError) return classifyBulletinMonitorError(hierarchyReason);
  if (appsError) return classifyBulletinMonitorError(appsReason);
  return null;
}

function isDependencyLoading(
  appsPending: boolean,
  monitorsPending: boolean,
  hierarchyPending: boolean,
  app: string
) {
  return appsPending || Boolean(app && (monitorsPending || hierarchyPending));
}

function hasUnknownSavedFields(draft: BulletinDraft | null, tree: BulletinMetricTreeMetricNode[]) {
  if (draft?.id == null) return false;
  return Object.keys(resolveSavedMetricTreeSelection(tree, draft.fields).unknownFields).length > 0;
}

async function loadBulletinMetricTree(app: string, locale: string, signal: AbortSignal) {
  return buildBulletinMetricTree(await loadMonitorAppHierarchy(app, locale, signal));
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
