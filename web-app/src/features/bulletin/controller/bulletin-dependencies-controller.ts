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
import type {
  BulletinDependencyKind,
  BulletinDependencyProof,
  BulletinDependencySelection
} from '../model/bulletin-dependency-proof';
import type { BulletinDraft } from '../model/bulletin-model';
import { bulletinQueryKeys } from './bulletin-query-keys';

const bulletinDependencyStaleTimeMs = 30_000;
const maximumMonitorProofPages = 20;
const monitorProofPageSize = 50;

type DependencyResourceState = Exclude<BulletinDependencyKind, 'idle'>;

type DependencyResource<T> = {
  status: 'pending' | 'error' | 'success';
  fetchStatus: 'idle' | 'fetching' | 'paused';
  data: T | undefined;
  error: unknown;
};

type BulletinDependencyResources = {
  app: string;
  apps: DependencyResource<Awaited<ReturnType<typeof loadMonitorApps>>>;
  monitors: DependencyResource<Monitor[]>;
  hierarchy: DependencyResource<BulletinMetricTreeMetricNode[]>;
};

export function useBulletinDependencies(draft: BulletinDraft | null): BulletinDependencyProof {
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
    enabled: draft != null,
    retry: false,
    staleTime: bulletinDependencyStaleTimeMs
  });
  const monitors = useQuery({
    queryKey: bulletinQueryKeys.monitors(app),
    queryFn: ({ signal }) => loadAllMonitors(app, signal),
    enabled: Boolean(draft && app),
    retry: false
  });
  const hierarchy = useQuery({
    queryKey: bulletinQueryKeys.hierarchy(app, locale),
    queryFn: ({ signal }) => loadBulletinMetricTree(app, locale, signal),
    enabled: Boolean(draft && app),
    retry: false
  });
  return { app, apps, hierarchy, monitors };
}

export function resolveBulletinDependencies(
  draft: BulletinDraft | null,
  resources: BulletinDependencyResources
): BulletinDependencyProof {
  const { app, apps, hierarchy, monitors } = resources;
  const kind = resolveDependencyKind(draft, resources);
  const appsData = apps.status === 'success' ? apps.data : undefined;
  const activeMonitors = kind === 'ready' && app ? monitors.data : undefined;
  const metricTree = kind === 'ready' && app ? hierarchy.data : undefined;
  const records = buildBulletinDependencyRecords(appsData, activeMonitors, metricTree);
  const monitorSelection = resolveSelection(kind, draft, current =>
    hasUnknownMonitorSelection(current, activeMonitors ?? [])
  );
  const fieldSelection = resolveSelection(kind, draft, current => hasUnknownFieldSelection(current, metricTree ?? []));
  return { kind, fieldSelection, monitorSelection, metricTree: metricTree ?? [], ...records };
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
    apps: (apps ?? []).flatMap(item => {
      const value = item.value;
      if (!value || value === 'prometheus' || value === '__system__') return [];
      return [{ value, label: item.label ?? null, hide: item.hide ?? null }];
    }),
    monitors: (monitors ?? []).map(item => ({
      id: item.id,
      name: item.name,
      app: item.app,
      labels: item.labels ?? {}
    })),
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

function resolveDependencyKind(
  draft: BulletinDraft | null,
  resources: BulletinDependencyResources
): BulletinDependencyKind {
  if (!draft) return 'idle' as const;
  const { app, apps, monitors, hierarchy } = resources;
  const states = [resolveResourceState(apps)];
  if (app) states.push(resolveResourceState(monitors), resolveResourceState(hierarchy));
  const failure = states.find(isFailure);
  if (failure) return failure;
  if (states.includes('loading')) return 'loading' as const;
  return 'ready' as const;
}

function resolveResourceState(resource: DependencyResource<unknown>): DependencyResourceState {
  if (resource.status === 'error') return classifyBulletinMonitorError(resource.error);
  if (resource.status === 'pending') return 'loading' as const;
  // An empty collection is authoritative; a successful query without data violates the query contract.
  if (resource.data === undefined) return 'invalid' as const;
  // Cached data cannot validate a saved selection while its authoritative refresh is still in flight.
  return resource.fetchStatus === 'idle' ? ('ready' as const) : ('loading' as const);
}

function isFailure(kind: DependencyResourceState): kind is Exclude<DependencyResourceState, 'loading' | 'ready'> {
  return kind === 'invalid' || kind === 'unavailable' || kind === 'error';
}

function resolveSelection(
  kind: BulletinDependencyKind,
  draft: BulletinDraft | null,
  hasUnknownSelection: (current: BulletinDraft) => boolean
): BulletinDependencySelection {
  // Pending or failed dependencies cannot prove that a persisted selection is valid or stale.
  if (kind !== 'ready' || !draft) return 'unverified';
  return hasUnknownSelection(draft) ? 'stale' : 'valid';
}

function hasUnknownMonitorSelection(draft: BulletinDraft, monitors: Monitor[]) {
  const knownIds = new Set(monitors.map(monitor => monitor.id));
  return draft.monitorIds.some(id => !knownIds.has(id));
}

function hasUnknownFieldSelection(draft: BulletinDraft, tree: BulletinMetricTreeMetricNode[]) {
  return Object.keys(resolveSavedMetricTreeSelection(tree, draft.fields).unknownFields).length > 0;
}

async function loadBulletinMetricTree(app: string, locale: string, signal: AbortSignal) {
  return buildBulletinMetricTree(await loadMonitorAppHierarchy(app, locale, signal));
}

async function loadAllMonitors(app: string, signal?: AbortSignal): Promise<Monitor[]> {
  if (!app) return [];
  const result: Monitor[] = [];
  let pageIndex = 0;
  let totalPages = 1;
  do {
    const page = await loadMonitors(
      {
        search: '',
        app,
        status: '9',
        labels: '',
        pageIndex,
        pageSize: monitorProofPageSize
      },
      signal
    );
    if (page.totalPages > maximumMonitorProofPages) {
      throw new Error('Monitor option safety bound exceeded');
    }
    result.push(...page.content);
    totalPages = page.totalPages;
    pageIndex += 1;
  } while (pageIndex < totalPages);
  return result;
}
