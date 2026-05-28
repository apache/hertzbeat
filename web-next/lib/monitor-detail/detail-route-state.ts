import type { ReactNode } from 'react';
import type { MonitorFavoriteJumpRow } from './view-model';
import type { MonitorDetailConsoleTabKey } from '@/components/monitor-detail/monitor-detail-console';
import type { Monitor } from '../types';
import {
  appendSignalRouteContext,
  readSignalRouteContext,
  stripReturnLabelFromHref,
  type SignalRouteContext
} from '../signal-route-context';

export type MonitorDetailNavigationContext = {
  app: string | null;
  labels: string | null;
  pageIndex: string | null;
  pageSize: string | null;
  entityId: string | null;
  entityName: string | null;
  returnTo: string | null;
  timeRange?: string;
  from?: string;
  to?: string;
  start?: string;
  end?: string;
  refresh?: string;
  live?: string;
  tz?: string;
  timezone?: string;
};

export type MonitorSignalHandoffLinks = {
  metricsHref: string;
  logsHref: string;
  tracesHref: string;
};

export type MonitorDetailRefreshTarget = 'realtime' | 'history' | 'favorites' | 'grafana';
export type MonitorDetailRefreshableTab = Exclude<MonitorDetailConsoleTabKey, 'grafana'>;

export type MonitorDetailSectionsInput = {
  contextNode: ReactNode;
  realtimeNode: ReactNode;
  historyNode: ReactNode;
  favoritesNode: ReactNode;
  grafanaNode: ReactNode;
};

export type MonitorDetailSectionsOutput = {
  contextContent: ReactNode;
  realtimeContent: ReactNode;
  historyContent: ReactNode;
  favoritesContent: ReactNode;
  grafanaContent: ReactNode;
};

export function readMonitorDetailNavigationContext(searchParams: URLSearchParams): MonitorDetailNavigationContext {
  const signalContext = readSignalRouteContext(searchParams);

  return {
    app: searchParams.get('app'),
    labels: searchParams.get('labels'),
    pageIndex: searchParams.get('pageIndex'),
    pageSize: searchParams.get('pageSize'),
    entityId: searchParams.get('entityId'),
    entityName: searchParams.get('entityName'),
    returnTo: stripReturnLabelFromHref(searchParams.get('returnTo')) || null,
    ...(signalContext.timeRange ? { timeRange: signalContext.timeRange } : {}),
    ...(signalContext.from ? { from: signalContext.from } : {}),
    ...(signalContext.to ? { to: signalContext.to } : {}),
    ...(signalContext.start ? { start: signalContext.start } : {}),
    ...(signalContext.end ? { end: signalContext.end } : {}),
    ...(signalContext.refresh ? { refresh: signalContext.refresh } : {}),
    ...(signalContext.live ? { live: signalContext.live } : {}),
    ...(signalContext.tz ? { tz: signalContext.tz } : {}),
    ...(signalContext.timezone ? { timezone: signalContext.timezone } : {})
  };
}

function buildSignalHref(path: string, context: SignalRouteContext) {
  const params = new URLSearchParams();
  appendSignalRouteContext(params, context);
  const query = params.toString();
  return query ? `${path}?${query}` : path;
}

export function buildMonitorSignalHandoffLinks(
  monitor: Pick<Monitor, 'id' | 'name' | 'app' | 'instance'>,
  context: MonitorDetailNavigationContext,
  currentHref?: string
): MonitorSignalHandoffLinks {
  const monitorId = monitor.id != null ? String(monitor.id) : undefined;
  const returnTo = stripReturnLabelFromHref(currentHref || (monitorId ? `/monitors/${monitorId}` : '/monitors'));
  const signalContext: SignalRouteContext = {
    timeRange: context.timeRange,
    from: context.from,
    to: context.to,
    start: context.start,
    end: context.end,
    refresh: context.refresh,
    live: context.live,
    tz: context.tz,
    timezone: context.timezone,
    entityId: context.entityId || undefined,
    entityName: context.entityName || undefined,
    returnTo,
    monitorId,
    monitorName: monitor.name || undefined,
    monitorApp: context.app || monitor.app || undefined,
    monitorInstance: monitor.instance || undefined,
    source: 'monitor'
  };

  return {
    metricsHref: buildSignalHref('/ingestion/otlp/metrics', signalContext),
    logsHref: buildSignalHref('/log/manage', signalContext),
    tracesHref: buildSignalHref('/trace/manage', signalContext)
  };
}

export function resolveMonitorDetailRefreshTarget(
  currentTab: MonitorDetailConsoleTabKey,
  previousDataTab: MonitorDetailRefreshableTab = 'realtime'
): MonitorDetailRefreshTarget {
  if (currentTab === 'history') return 'history';
  if (currentTab === 'favorites') return 'favorites';
  if (currentTab === 'grafana') return previousDataTab;
  return 'realtime';
}

export function resolveFavoriteJumpTarget(row: MonitorFavoriteJumpRow): { tab: 'realtime' | 'history'; targetKey: string } {
  return row.targetKind === 'history'
    ? { tab: 'history', targetKey: row.targetKey }
    : { tab: 'realtime', targetKey: row.targetKey };
}

export function resolveActiveFavoriteRow(
  favoriteRows: MonitorFavoriteJumpRow[],
  selectedFavoriteKey: string | null,
  preferredMode?: 'realtime' | 'history'
): MonitorFavoriteJumpRow | null {
  const selectedRow = favoriteRows.find(row => row.key === selectedFavoriteKey);
  if (selectedRow) return selectedRow;
  if (preferredMode) {
    return favoriteRows.find(row => row.targetKind === preferredMode) ?? null;
  }
  return favoriteRows[0] ?? null;
}

export function resolveFavoriteSurfaceMode(
  currentMode: 'realtime' | 'history',
  favoriteRows: MonitorFavoriteJumpRow[],
  selectedFavoriteKey: string | null
): 'realtime' | 'history' {
  const activeRow = favoriteRows.find(row => row.key === selectedFavoriteKey);
  if (activeRow) {
    return activeRow.targetKind;
  }

  return currentMode;
}

export function shouldFallbackFromGrafanaTab(grafanaEnabled: boolean, currentTab: MonitorDetailConsoleTabKey): boolean {
  return !grafanaEnabled && currentTab === 'grafana';
}

export function buildMonitorDetailSections(input: MonitorDetailSectionsInput): MonitorDetailSectionsOutput {
  return {
    contextContent: input.contextNode,
    realtimeContent: input.realtimeNode,
    historyContent: input.historyNode,
    favoritesContent: input.favoritesNode,
    grafanaContent: input.grafanaNode
  };
}
