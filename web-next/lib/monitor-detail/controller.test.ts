import { describe, expect, it, vi } from 'vitest';
import {
  addMonitorFavorite,
  addMonitorFavoriteFromFacade,
  buildMonitorDetailUrl,
  buildMonitorFavoriteUrl,
  buildMonitorGrafanaUrl,
  buildMonitorHistoryCatalogUrl,
  buildMonitorHistoryMetricDataUrl,
  buildMonitorRealtimeMetricUrl,
  deleteMonitorGrafanaDashboard,
  deleteMonitorGrafanaDashboardFromFacade,
  loadMonitorDetail,
  loadMonitorDetailBundle,
  loadMonitorDetailBundleFromFacade,
  loadMonitorFavoriteMetrics,
  loadMonitorHistoryMetricCatalog,
  loadMonitorHistoryMetricCatalogFromFacade,
  loadMonitorHistoryMetricData,
  loadMonitorHistoryMetricDataFromFacade,
  loadMonitorRealtimeMetricData,
  loadMonitorRealtimeMetricDataFromFacade,
  removeMonitorFavorite,
  removeMonitorFavoriteFromFacade
} from './controller';

describe('monitor detail controller', () => {
  it('builds detail url from monitor id', () => {
    expect(buildMonitorDetailUrl('42')).toBe('/monitor/42');
  });

  it('loads monitor detail by resolved id', async () => {
    const apiGet = vi.fn().mockResolvedValue({ id: 42, name: 'mysql-prod' });
    const result = await loadMonitorDetail(apiGet as any, '42');
    expect(apiGet).toHaveBeenCalledWith('/monitor/42');
    expect(result).toEqual({ id: 42, name: 'mysql-prod' });
  });

  it('builds grafana url and loads monitor + grafana in parallel', async () => {
    const apiGet = vi.fn()
      .mockResolvedValueOnce({ monitor: { id: 42, name: 'mysql-prod' }, params: [{ field: 'host', paramValue: '10.0.0.1' }], metrics: [{ name: 'cpu' }] })
      .mockResolvedValueOnce({ enabled: true, url: 'https://grafana.example/dashboard' })
      .mockResolvedValueOnce(['cpu']);

    expect(buildMonitorGrafanaUrl('42')).toBe('/grafana/dashboard?monitorId=42');
    expect(buildMonitorFavoriteUrl('42')).toBe('/metrics/favorite/42');
    expect(buildMonitorFavoriteUrl('42', 'cpu.usage')).toBe('/metrics/favorite/42/cpu.usage');

    await expect(loadMonitorDetailBundle(apiGet as any, '42')).resolves.toEqual({
      monitor: { id: 42, name: 'mysql-prod' },
      params: [{ field: 'host', paramValue: '10.0.0.1' }],
      metrics: [{ name: 'cpu' }],
      favoriteMetrics: ['cpu'],
      grafana: { enabled: true, url: 'https://grafana.example/dashboard' }
    });
  });

  it('degrades optional grafana and favorites failures instead of blocking detail load', async () => {
    const apiGet = vi.fn()
      .mockResolvedValueOnce({ monitor: { id: 42, name: 'mysql-prod' }, params: [], metrics: [{ name: 'cpu' }] })
      .mockRejectedValueOnce(new Error('grafana bad params'))
      .mockRejectedValueOnce(new Error('favorites unavailable'));

    await expect(loadMonitorDetailBundle(apiGet as any, '42')).resolves.toEqual({
      monitor: { id: 42, name: 'mysql-prod' },
      params: [],
      metrics: [{ name: 'cpu' }],
      favoriteMetrics: [],
      grafana: { enabled: false }
    });
  });

  it('normalizes null grafana payloads into disabled dashboards', async () => {
    const apiGet = vi.fn()
      .mockResolvedValueOnce({ monitor: { id: 42, name: 'mysql-prod' }, params: [], metrics: [{ name: 'cpu' }] })
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce([]);

    await expect(loadMonitorDetailBundle(apiGet as any, '42')).resolves.toEqual({
      monitor: { id: 42, name: 'mysql-prod' },
      params: [],
      metrics: [{ name: 'cpu' }],
      favoriteMetrics: [],
      grafana: { enabled: false }
    });
  });

  it('loads monitor detail bundle through domain facade readers', async () => {
    const readMonitorDetail = vi.fn().mockResolvedValue({
      monitor: { id: 42, name: 'mysql-prod' },
      params: [{ field: 'host', paramValue: '10.0.0.1' }],
      metrics: [{ name: 'cpu' }]
    });
    const readGrafanaDashboard = vi.fn().mockResolvedValue(null);
    const readFavoriteMetrics = vi.fn().mockResolvedValue(['cpu']);

    await expect(
      loadMonitorDetailBundleFromFacade(readMonitorDetail as any, readGrafanaDashboard as any, readFavoriteMetrics as any, 42)
    ).resolves.toEqual({
      monitor: { id: 42, name: 'mysql-prod' },
      params: [{ field: 'host', paramValue: '10.0.0.1' }],
      metrics: [{ name: 'cpu' }],
      favoriteMetrics: ['cpu'],
      grafana: { enabled: false }
    });

    expect(readMonitorDetail).toHaveBeenCalledWith(42);
    expect(readGrafanaDashboard).toHaveBeenCalledWith(42);
    expect(readFavoriteMetrics).toHaveBeenCalledWith(42);
  });

  it('degrades optional facade grafana and favorites failures instead of blocking detail bundle', async () => {
    const readMonitorDetail = vi.fn().mockResolvedValue({ monitor: { id: 42 }, params: [], metrics: [] });
    const readGrafanaDashboard = vi.fn().mockRejectedValue(new Error('grafana unavailable'));
    const readFavoriteMetrics = vi.fn().mockRejectedValue(new Error('favorites unavailable'));

    await expect(
      loadMonitorDetailBundleFromFacade(readMonitorDetail as any, readGrafanaDashboard as any, readFavoriteMetrics as any, 42)
    ).resolves.toEqual({
      monitor: { id: 42 },
      params: [],
      metrics: [],
      favoriteMetrics: [],
      grafana: { enabled: false }
    });
  });

  it('deletes grafana dashboard by monitor id', async () => {
    const apiDelete = vi.fn().mockResolvedValue(undefined);
    await deleteMonitorGrafanaDashboard(apiDelete as any, '42');
    expect(apiDelete).toHaveBeenCalledWith('/grafana/dashboard?monitorId=42');
  });

  it('loads, adds, and removes favorite metrics', async () => {
    const apiGet = vi.fn().mockResolvedValue(['cpu']);
    const apiPost = vi.fn().mockResolvedValue(undefined);
    const apiDelete = vi.fn().mockResolvedValue(undefined);

    await expect(loadMonitorFavoriteMetrics(apiGet as any, '42')).resolves.toEqual(['cpu']);
    await addMonitorFavorite(apiPost as any, '42', 'cpu.usage');
    await removeMonitorFavorite(apiDelete as any, '42', 'cpu.usage');

    expect(apiGet).toHaveBeenCalledWith('/metrics/favorite/42');
    expect(apiPost).toHaveBeenCalledWith('/metrics/favorite/42/cpu.usage', null);
    expect(apiDelete).toHaveBeenCalledWith('/metrics/favorite/42/cpu.usage');
  });

  it('runs favorite and grafana mutations through facade writers', async () => {
    const addFavorite = vi.fn().mockResolvedValue(undefined);
    const removeFavorite = vi.fn().mockResolvedValue(undefined);
    const deleteGrafanaDashboard = vi.fn().mockResolvedValue(undefined);

    await addMonitorFavoriteFromFacade(addFavorite, 42, 'cpu.usage');
    await removeMonitorFavoriteFromFacade(removeFavorite, 42, 'cpu.usage');
    await deleteMonitorGrafanaDashboardFromFacade(deleteGrafanaDashboard, 42);

    expect(addFavorite).toHaveBeenCalledWith(42, 'cpu.usage');
    expect(removeFavorite).toHaveBeenCalledWith(42, 'cpu.usage');
    expect(deleteGrafanaDashboard).toHaveBeenCalledWith(42);
  });

  it('builds history catalog urls and extracts visible numeric fields', async () => {
    const apiGet = vi.fn()
      .mockResolvedValueOnce({ ok: true })
      .mockResolvedValueOnce({
        metrics: [
          {
            name: 'cpu',
            visible: true,
            fields: [
              { type: 0, field: 'usage', unit: '%' },
              { type: 1, field: 'host' }
            ]
          },
          { name: 'hidden', visible: false, fields: [{ type: 0, field: 'dropped' }] }
        ]
      });
    const monitor = { id: 42, app: 'prometheus', scrape: 'prometheus', name: 'node-exporter' } as any;

    expect(buildMonitorHistoryCatalogUrl({ id: 1, app: 'push', scrape: 'push' } as any)).toBe('/apps/1/pushdefine');
    expect(buildMonitorHistoryCatalogUrl(monitor)).toBe('/apps/42/define/dynamic');
    expect(buildMonitorHistoryCatalogUrl({ id: 2, app: 'mysql', scrape: 'static' } as any)).toBe('/apps/mysql/define');

    await expect(loadMonitorHistoryMetricCatalog(apiGet as any, monitor)).resolves.toEqual([
      { metrics: 'cpu', metric: 'usage', unit: '%' }
    ]);

    expect(apiGet).toHaveBeenNthCalledWith(1, '/warehouse/storage/status');
    expect(apiGet).toHaveBeenNthCalledWith(2, '/apps/42/define/dynamic');
  });

  it('loads history catalog definitions through domain facade readers', async () => {
    const readWarehouseStorageStatus = vi.fn().mockResolvedValue({ available: true });
    const readHistoryCatalogDefine = vi.fn().mockResolvedValue({
      metrics: [{ name: 'availability', fields: [{ type: 0, field: 'responseTime', unit: 'ms' }] }]
    });
    const monitor = { id: 42, app: 'website', scrape: 'static' } as any;

    await expect(
      loadMonitorHistoryMetricCatalogFromFacade(readWarehouseStorageStatus as any, readHistoryCatalogDefine as any, monitor)
    ).resolves.toEqual([{ metrics: 'availability', metric: 'responseTime', unit: 'ms' }]);

    expect(readWarehouseStorageStatus).toHaveBeenCalledWith();
    expect(readHistoryCatalogDefine).toHaveBeenCalledWith(monitor);
  });

  it('builds realtime metric url and loads metric payload', async () => {
    const apiGet = vi.fn().mockResolvedValue({ status: 'ok' });
    expect(buildMonitorRealtimeMetricUrl('42', 'cpu')).toBe('/monitor/42/metrics/cpu');
    await expect(loadMonitorRealtimeMetricData(apiGet as any, '42', 'cpu')).resolves.toEqual({ status: 'ok' });
    expect(apiGet).toHaveBeenCalledWith('/monitor/42/metrics/cpu');
  });

  it('loads realtime metric payloads through the domain facade reader', async () => {
    const readRealtimeMetric = vi.fn().mockResolvedValue({ rows: [{ key: 'usage' }] });

    await expect(loadMonitorRealtimeMetricDataFromFacade(readRealtimeMetric as any, 42, 'cpu')).resolves.toEqual({
      rows: [{ key: 'usage' }]
    });

    expect(readRealtimeMetric).toHaveBeenCalledWith(42, 'cpu');
  });

  it('builds history metric url and loads history payload', async () => {
    const monitor = { id: 42, instance: '127.0.0.1:8080', app: 'prometheus', name: 'node-exporter' } as any;
    const item = { metrics: 'cpu', metric: 'usage' };
    const apiGet = vi.fn().mockResolvedValue({ values: { default: [{ origin: '72', time: 1712730000000 }] } });

    expect(buildMonitorHistoryMetricDataUrl(monitor, item)).toBe(
      '/monitor/127.0.0.1%3A8080/metric/_prometheus_node-exporter.cpu.usage?history=30m&interval=false'
    );

    await expect(loadMonitorHistoryMetricData(apiGet as any, monitor, item)).resolves.toEqual({
      values: { default: [{ origin: '72', time: 1712730000000 }] }
    });

    expect(apiGet).toHaveBeenCalledWith(
      '/monitor/127.0.0.1%3A8080/metric/_prometheus_node-exporter.cpu.usage?history=30m&interval=false'
    );
  });

  it('loads history metric payloads through the domain facade reader', async () => {
    const monitor = { id: 42, instance: '127.0.0.1:8080', app: 'website', name: 'site' } as any;
    const item = { metrics: 'availability', metric: 'responseTime' };
    const query = { history: '1h', interval: true };
    const readHistoryMetric = vi.fn().mockResolvedValue({ values: { responseTime: [{ origin: '120' }] } });

    await expect(loadMonitorHistoryMetricDataFromFacade(readHistoryMetric as any, monitor, item, query)).resolves.toEqual({
      values: { responseTime: [{ origin: '120' }] }
    });

    expect(readHistoryMetric).toHaveBeenCalledWith(monitor, item, query);
  });

  it('supports custom history query when building history url', () => {
    const monitor = { id: 7, instance: 'db.internal:5432', app: 'postgresql', name: 'pg-prod' } as any;
    const item = { metrics: 'performance', metric: 'qps' };

    expect(buildMonitorHistoryMetricDataUrl(monitor, item, { history: '6h', interval: true })).toBe(
      '/monitor/db.internal%3A5432/metric/postgresql.performance.qps?history=6h&interval=true'
    );
  });

  it('keeps history compatibility while accepting unified absolute query bounds', () => {
    const monitor = { id: 7, instance: 'db.internal:5432', app: 'postgresql', name: 'pg-prod' } as any;
    const item = { metrics: 'performance', metric: 'qps' };

    expect(
      buildMonitorHistoryMetricDataUrl(monitor, item, {
        history: '1h',
        interval: true,
        start: '1712730000000',
        end: '1712733600000',
        step: '60s'
      })
    ).toBe(
      '/monitor/db.internal%3A5432/metric/postgresql.performance.qps?history=1h&interval=true&start=1712730000000&end=1712733600000&step=60s'
    );

    expect(
      buildMonitorHistoryMetricDataUrl(monitor, item, {
        history: '1h',
        interval: true,
        start: '1712730000000.1',
        end: 'now',
        step: '../bad'
      })
    ).toBe('/monitor/db.internal%3A5432/metric/postgresql.performance.qps?history=1h&interval=true');
  });
});
