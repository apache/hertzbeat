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
  start?: string;
  end?: string;
  refresh?: string;
  live?: string;
  tz?: string;
};

export type MonitorSignalHandoffLinks = {
  metricsHref: string;
  logsHref: string;
  tracesHref: string;
};

export type MonitorDetailRefreshTarget = 'realtime' | 'history' | 'favorites' | 'grafana';

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
    ...(signalContext.start ? { start: signalContext.start } : {}),
    ...(signalContext.end ? { end: signalContext.end } : {}),
    ...(signalContext.refresh ? { refresh: signalContext.refresh } : {}),
    ...(signalContext.live ? { live: signalContext.live } : {}),
    ...(signalContext.tz ? { tz: signalContext.tz } : {})
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
    start: context.start,
    end: context.end,
    refresh: context.refresh,
    live: context.live,
    tz: context.tz,
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

export function resolveMonitorDetailRefreshTarget(currentTab: MonitorDetailConsoleTabKey): MonitorDetailRefreshTarget {
  if (currentTab === 'history') return 'history';
  if (currentTab === 'favorites') return 'favorites';
  if (currentTab === 'grafana') return 'grafana';
  return 'realtime';
}

export function resolveFavoriteJumpTarget(row: MonitorFavoriteJumpRow): { tab: 'realtime' | 'history'; targetKey: string } {
  return row.targetKind === 'history'
    ? { tab: 'history', targetKey: row.targetKey }
    : { tab: 'realtime', targetKey: row.targetKey };
}

export function resolveActiveFavoriteRow(
  favoriteRows: MonitorFavoriteJumpRow[],
  selectedFavoriteKey: string | null
): MonitorFavoriteJumpRow | null {
  return favoriteRows.find(row => row.key === selectedFavoriteKey) ?? favoriteRows[0] ?? null;
}

export function resolveFavoriteSurfaceMode(
  currentMode: 'realtime' | 'history',
  favoriteRows: MonitorFavoriteJumpRow[],
  selectedFavoriteKey: string | null
): 'realtime' | 'history' {
  const activeRow = resolveActiveFavoriteRow(favoriteRows, selectedFavoriteKey);
  if (activeRow) {
    return activeRow.targetKind;
  }

  const hasRealtimeFavorites = favoriteRows.some(row => row.targetKind === 'realtime');
  const hasHistoryFavorites = favoriteRows.some(row => row.targetKind === 'history');

  if (currentMode === 'realtime' && hasRealtimeFavorites) return currentMode;
  if (currentMode === 'history' && hasHistoryFavorites) return currentMode;
  if (hasRealtimeFavorites) return 'realtime';
  if (hasHistoryFavorites) return 'history';
  return 'realtime';
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
