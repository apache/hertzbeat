import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  buildMonitorSignalHandoffLinks,
  resolveActiveFavoriteRow,
  resolveFavoriteSurfaceMode,
  buildMonitorDetailSections,
  readMonitorDetailNavigationContext,
  resolveFavoriteJumpTarget,
  resolveMonitorDetailRefreshTarget,
  shouldFallbackFromGrafanaTab
} from './detail-route-state';

describe('monitor detail route state', () => {
  it('keeps monitor detail and workspace navigation machine-only without display-label fields', () => {
    const routeStateSource = readFileSync(resolve(process.cwd(), 'lib/monitor-detail/detail-route-state.ts'), 'utf8');
    const consoleSource = readFileSync(resolve(process.cwd(), 'components/monitor-detail/monitor-detail-console.tsx'), 'utf8');
    const workspaceNavigationSource = readFileSync(resolve(process.cwd(), 'lib/workspace-navigation.ts'), 'utf8');

    expect(routeStateSource).not.toContain('returnLabel: string | null');
    expect(routeStateSource).not.toContain('returnLabel: null');
    expect(consoleSource).not.toContain('returnLabel?: string | null');
    expect(workspaceNavigationSource).not.toContain('returnLabel?: string | null');
    expect(workspaceNavigationSource).not.toContain('void returnLabel');
  });

  it('reads the monitor detail navigation context from search params', () => {
    const params = new URLSearchParams(
      'app=website&labels=team%3Dplatform&pageIndex=1&pageSize=20&entityId=42&entityName=checkout&returnTo=%2Fmonitors%3FreturnLabel%3DBack&returnLabel=Back&timeRange=last-1h&start=1712730000000&end=1712733600000&refresh=30&live=true&tz=Asia%2FShanghai'
    );

    expect(readMonitorDetailNavigationContext(params)).toEqual({
      app: 'website',
      labels: 'team=platform',
      pageIndex: '1',
      pageSize: '20',
      entityId: '42',
      entityName: 'checkout',
      returnTo: '/monitors',
      timeRange: 'last-1h',
      start: '1712730000000',
      end: '1712733600000',
      refresh: '30',
      live: 'true',
      tz: 'Asia/Shanghai'
    });
  });

  it('builds traditional-monitor signal handoff links with time and monitor context only', () => {
    const links = buildMonitorSignalHandoffLinks(
      {
        id: 632051474676992,
        name: 'website-check',
        app: 'website',
        instance: 'example.com:443'
      } as any,
      {
        app: 'website',
        entityId: 'checkout-entity',
        entityName: 'Checkout Service',
        timeRange: 'last-1h',
        start: '1712730000000',
        end: '1712733600000',
        refresh: '30',
        live: 'true',
        tz: 'Asia/Shanghai'
      },
      '/monitors/632051474676992?app=website&returnLabel=Monitor'
    );

    expect(Object.keys(links)).toEqual(['metricsHref', 'logsHref', 'tracesHref']);
    expect(links.metricsHref.startsWith('/ingestion/otlp/metrics?')).toBe(true);
    expect(links.logsHref.startsWith('/log/manage?')).toBe(true);
    expect(links.tracesHref.startsWith('/trace/manage?')).toBe(true);

    const metricsUrl = new URL(links.metricsHref, 'http://hertzbeat.local');
    expect(metricsUrl.searchParams.get('timeRange')).toBe('last-1h');
    expect(metricsUrl.searchParams.get('start')).toBe('1712730000000');
    expect(metricsUrl.searchParams.get('end')).toBe('1712733600000');
    expect(metricsUrl.searchParams.get('refresh')).toBe('30');
    expect(metricsUrl.searchParams.get('live')).toBe('true');
    expect(metricsUrl.searchParams.get('tz')).toBe('Asia/Shanghai');
    expect(metricsUrl.searchParams.get('entityId')).toBe('checkout-entity');
    expect(metricsUrl.searchParams.get('entityName')).toBe('Checkout Service');
    expect(metricsUrl.searchParams.get('monitorId')).toBe('632051474676992');
    expect(metricsUrl.searchParams.get('monitorName')).toBe('website-check');
    expect(metricsUrl.searchParams.get('monitorApp')).toBe('website');
    expect(metricsUrl.searchParams.get('monitorInstance')).toBe('example.com:443');
    expect(metricsUrl.searchParams.get('source')).toBe('monitor');
    expect(metricsUrl.searchParams.get('returnTo')).toBe('/monitors/632051474676992?app=website');
    expect(metricsUrl.searchParams.has('count')).toBe(false);
    expect(metricsUrl.searchParams.has('status')).toBe(false);
  });

  it('resolves tab-scoped refresh targets', () => {
    expect(resolveMonitorDetailRefreshTarget('realtime')).toBe('realtime');
    expect(resolveMonitorDetailRefreshTarget('history')).toBe('history');
    expect(resolveMonitorDetailRefreshTarget('favorites')).toBe('favorites');
    expect(resolveMonitorDetailRefreshTarget('grafana')).toBe('grafana');
  });

  it('resolves favorite jump targets from the favorite row kind', () => {
    expect(
      resolveFavoriteJumpTarget({
        key: 'realtime:cpu',
        title: 'cpu',
        copy: 'Favorite realtime metric',
        meta: 'realtime',
        targetKey: 'cpu',
        targetKind: 'realtime',
        favoriteToken: 'cpu'
      })
    ).toEqual({ tab: 'realtime', targetKey: 'cpu' });

    expect(
      resolveFavoriteJumpTarget({
        key: 'history:cpu.usage',
        title: 'cpu.usage',
        copy: 'Favorite history metric',
        meta: 'history',
        targetKey: 'cpu:usage',
        targetKind: 'history',
        favoriteToken: 'cpu.usage'
      })
    ).toEqual({ tab: 'history', targetKey: 'cpu:usage' });
  });

  it('keeps the favorites surface aligned to the active favorite row', () => {
    const favoriteRows = [
      {
        key: 'realtime:summary',
        title: 'summary',
        copy: 'Favorite realtime metric',
        meta: 'realtime',
        targetKey: 'summary',
        targetKind: 'realtime',
        favoriteToken: 'summary'
      },
      {
        key: 'history:latency',
        title: 'latency',
        copy: 'Favorite history metric',
        meta: 'history',
        targetKey: 'website:latency',
        targetKind: 'history',
        favoriteToken: 'website.latency'
      }
    ] as const;

    expect(resolveActiveFavoriteRow(favoriteRows as any, 'history:latency')?.key).toBe('history:latency');
    expect(resolveActiveFavoriteRow(favoriteRows as any, null)?.key).toBe('realtime:summary');
    expect(resolveFavoriteSurfaceMode('realtime', favoriteRows as any, 'history:latency')).toBe('history');
    expect(resolveFavoriteSurfaceMode('history', favoriteRows as any, 'realtime:summary')).toBe('realtime');
  });

  it('falls back from grafana tab only when grafana is disabled', () => {
    expect(shouldFallbackFromGrafanaTab(false, 'grafana')).toBe(true);
    expect(shouldFallbackFromGrafanaTab(true, 'grafana')).toBe(false);
    expect(shouldFallbackFromGrafanaTab(false, 'history')).toBe(false);
  });

  it('builds the exact monitor detail section contract', () => {
    expect(
      buildMonitorDetailSections({
        contextNode: 'context',
        realtimeNode: 'realtime',
        historyNode: 'history',
        favoritesNode: 'favorites',
        grafanaNode: 'grafana'
      })
    ).toEqual({
      contextContent: 'context',
      realtimeContent: 'realtime',
      historyContent: 'history',
      favoritesContent: 'favorites',
      grafanaContent: 'grafana'
    });
  });
});
