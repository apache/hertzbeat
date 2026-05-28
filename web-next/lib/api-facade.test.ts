import { afterEach, describe, expect, it, vi } from 'vitest';

import { api } from './api-facade';

const fetchMock = vi.fn<typeof fetch>();

function mockApiMessagePayload(data: unknown) {
  fetchMock.mockResolvedValueOnce(
    new Response(JSON.stringify({ code: 0, data }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    })
  );
}

describe('api facade', () => {
  afterEach(() => {
    fetchMock.mockReset();
    vi.unstubAllGlobals();
  });

  it('keeps monitor list reads behind the BFF message client', async () => {
    vi.stubGlobal('fetch', fetchMock);
    mockApiMessagePayload({ content: [] });

    await expect(api.monitors.list({ pageIndex: 0, pageSize: 8, status: '2' })).resolves.toEqual({ content: [] });

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/monitors/manage?pageIndex=0&pageSize=8&status=2',
      expect.objectContaining({ credentials: 'same-origin', cache: 'no-store' })
    );
  });

  it('maps monitor page reads through the domain facade', async () => {
    vi.stubGlobal('fetch', fetchMock);
    mockApiMessagePayload({ content: [{ id: 42 }], totalElements: 1 });

    await expect(
      api.monitors.page({
        search: ' mysql ',
        app: 'mysql',
        labels: '',
        status: '2',
        pageIndex: '0',
        pageSize: '8',
        entityId: '',
        entityName: '',
        returnTo: ''
      })
    ).resolves.toEqual({ content: [{ id: 42 }], totalElements: 1 });

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/monitors?pageIndex=0&pageSize=8&search=mysql&app=mysql&status=2',
      expect.objectContaining({ credentials: 'same-origin', cache: 'no-store' })
    );
  });

  it('maps monitor detail reads through the domain facade', async () => {
    vi.stubGlobal('fetch', fetchMock);
    mockApiMessagePayload({ id: 42, app: 'website' });

    await expect(api.monitors.detail(42)).resolves.toEqual({ id: 42, app: 'website' });

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/monitor/42',
      expect.objectContaining({ credentials: 'same-origin', cache: 'no-store' })
    );
  });

  it('maps monitor editor draft reads through the domain facade', async () => {
    vi.stubGlobal('fetch', fetchMock);
    mockApiMessagePayload({ monitor: { id: 42, app: 'mysql' }, params: [], collector: null });
    mockApiMessagePayload({ content: [{ collector: { name: 'edge-a' } }] });
    mockApiMessagePayload([{ field: 'host', type: 'text' }]);

    await expect(api.monitors.editorDetail(42)).resolves.toEqual({
      monitor: { id: 42, app: 'mysql' },
      params: [],
      collector: null
    });
    await expect(api.monitors.editorCollectors()).resolves.toEqual({ content: [{ collector: { name: 'edge-a' } }] });
    await expect(api.monitors.editorParamDefines('mysql')).resolves.toEqual([{ field: 'host', type: 'text' }]);

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      '/api/monitor/42',
      expect.objectContaining({ credentials: 'same-origin', cache: 'no-store' })
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      '/api/collector',
      expect.objectContaining({ credentials: 'same-origin', cache: 'no-store' })
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      3,
      '/api/apps/mysql/params',
      expect.objectContaining({ credentials: 'same-origin', cache: 'no-store' })
    );
  });

  it('maps monitor optional detail reads through the domain facade', async () => {
    vi.stubGlobal('fetch', fetchMock);
    mockApiMessagePayload(['cpu']);
    mockApiMessagePayload({ enabled: true, url: 'https://grafana.example/d/abc' });

    await expect(api.monitors.favoriteMetrics(42)).resolves.toEqual(['cpu']);
    await expect(api.monitors.grafanaDashboard(42)).resolves.toEqual({ enabled: true, url: 'https://grafana.example/d/abc' });

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      '/api/metrics/favorite/42',
      expect.objectContaining({ credentials: 'same-origin', cache: 'no-store' })
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      '/api/grafana/dashboard?monitorId=42',
      expect.objectContaining({ credentials: 'same-origin', cache: 'no-store' })
    );
  });

  it('maps monitor detail favorite and Grafana mutations through the domain facade', async () => {
    vi.stubGlobal('fetch', fetchMock);
    mockApiMessagePayload({ ok: true });
    mockApiMessagePayload({ ok: true });
    mockApiMessagePayload({ ok: true });

    await expect(api.monitors.addFavoriteMetric(42, 'cpu.usage')).resolves.toEqual({ ok: true });
    await expect(api.monitors.removeFavoriteMetric(42, 'cpu.usage')).resolves.toEqual({ ok: true });
    await expect(api.monitors.deleteGrafanaDashboard(42)).resolves.toEqual({ ok: true });

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      '/api/metrics/favorite/42/cpu.usage',
      expect.objectContaining({
        method: 'POST',
        credentials: 'same-origin',
        body: 'null'
      })
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      '/api/metrics/favorite/42/cpu.usage',
      expect.objectContaining({
        method: 'DELETE',
        credentials: 'same-origin'
      })
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      3,
      '/api/grafana/dashboard?monitorId=42',
      expect.objectContaining({
        method: 'DELETE',
        credentials: 'same-origin'
      })
    );
  });

  it('maps monitor realtime metric reads through the domain facade', async () => {
    vi.stubGlobal('fetch', fetchMock);
    mockApiMessagePayload({ values: [{ field: 'usage' }] });

    await expect(api.monitors.realtimeMetric(42, 'cpu')).resolves.toEqual({ values: [{ field: 'usage' }] });

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/monitor/42/metrics/cpu',
      expect.objectContaining({ credentials: 'same-origin', cache: 'no-store' })
    );
  });

  it('maps monitor history catalog reads through the domain facade', async () => {
    vi.stubGlobal('fetch', fetchMock);
    mockApiMessagePayload({ available: true });
    mockApiMessagePayload({ metrics: [{ name: 'cpu', fields: [{ type: 0, field: 'usage' }] }] });

    await expect(api.monitors.warehouseStorageStatus()).resolves.toEqual({ available: true });
    await expect(
      api.monitors.historyMetricCatalogDefine({ id: 42, app: 'prometheus', scrape: 'prometheus', name: 'node-exporter' } as any)
    ).resolves.toEqual({ metrics: [{ name: 'cpu', fields: [{ type: 0, field: 'usage' }] }] });

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      '/api/warehouse/storage/status',
      expect.objectContaining({ credentials: 'same-origin', cache: 'no-store' })
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      '/api/apps/42/define/dynamic',
      expect.objectContaining({ credentials: 'same-origin', cache: 'no-store' })
    );
  });

  it('maps monitor history metric reads through the domain facade', async () => {
    vi.stubGlobal('fetch', fetchMock);
    mockApiMessagePayload({ values: { usage: [{ origin: '72' }] } });

    await expect(
      api.monitors.historyMetric(
        { id: 42, instance: '127.0.0.1:8080', app: 'prometheus', name: 'node-exporter' } as any,
        { metrics: 'cpu', metric: 'usage' },
        { history: '1h', interval: true }
      )
    ).resolves.toEqual({ values: { usage: [{ origin: '72' }] } });

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/monitor/127.0.0.1%3A8080/metric/_prometheus_node-exporter.cpu.usage?history=1h&interval=true',
      expect.objectContaining({ credentials: 'same-origin', cache: 'no-store' })
    );
  });

  it('maps monitor editor mutations through the domain facade', async () => {
    vi.stubGlobal('fetch', fetchMock);
    mockApiMessagePayload({ id: 42 });
    mockApiMessagePayload({ id: 42 });
    mockApiMessagePayload({ available: true });

    const savePayload = { monitor: { app: 'website' }, params: [], grafanaDashboard: { enabled: false } };
    const detectPayload = { monitor: { app: 'website' }, params: [] };

    await expect(api.monitors.create(savePayload)).resolves.toEqual({ id: 42 });
    await expect(api.monitors.update(savePayload)).resolves.toEqual({ id: 42 });
    await expect(api.monitors.detect(detectPayload)).resolves.toEqual({ available: true });

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      '/api/monitor',
      expect.objectContaining({
        method: 'POST',
        credentials: 'same-origin',
        body: JSON.stringify(savePayload)
      })
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      '/api/monitor',
      expect.objectContaining({
        method: 'PUT',
        credentials: 'same-origin',
        body: JSON.stringify(savePayload)
      })
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      3,
      '/api/monitor/detect',
      expect.objectContaining({
        method: 'POST',
        credentials: 'same-origin',
        body: JSON.stringify(detectPayload)
      })
    );
  });

  it('maps monitor import uploads through the domain facade', async () => {
    vi.stubGlobal('fetch', fetchMock);
    mockApiMessagePayload({ imported: 1 });
    const body = new FormData();
    body.append('file', 'name: mysql');

    await expect(api.monitors.import(body)).resolves.toEqual({ imported: 1 });

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/monitors/import',
      expect.objectContaining({
        method: 'POST',
        credentials: 'same-origin',
        body
      })
    );
    expect((fetchMock.mock.calls[0]?.[1]?.headers as Record<string, string> | undefined)?.['Content-Type']).toBeUndefined();
  });

  it('maps monitor export downloads through the domain facade while preserving response headers', async () => {
    vi.stubGlobal('fetch', fetchMock);
    fetchMock
      .mockResolvedValueOnce(
        new Response(new Blob(['{}'], { type: 'application/json' }), {
          status: 200,
          headers: {
            'Content-Disposition': 'attachment; filename=monitors.json',
            'Content-Type': 'application/octet-stream'
          }
        })
      )
      .mockResolvedValueOnce(
        new Response(new Blob(['id,name'], { type: 'text/csv' }), {
          status: 200,
          headers: {
            'Content-Disposition': 'attachment; filename=monitors-all.xlsx',
            'Content-Type': 'application/octet-stream'
          }
        })
      );

    await expect(api.monitors.exportResponse([1, 2], 'JSON')).resolves.toBeInstanceOf(Response);
    await expect(api.monitors.exportAllResponse('EXCEL')).resolves.toBeInstanceOf(Response);

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      '/api/monitors/export?ids=1&ids=2&type=JSON',
      expect.objectContaining({ credentials: 'same-origin', cache: 'no-store' })
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      '/api/monitors/export/all?type=EXCEL',
      expect.objectContaining({ credentials: 'same-origin', cache: 'no-store' })
    );
  });

  it('maps topology graph reads through the domain facade', async () => {
    vi.stubGlobal('fetch', fetchMock);
    mockApiMessagePayload({ nodes: [], edges: [], apiBacked: true });

    await expect(api.topology.graph({ entityId: '501', sourceKind: 'otlp-trace-call' })).resolves.toMatchObject({
      apiBacked: true
    });

    expect(String(fetchMock.mock.calls[0]?.[0])).toContain('/api/topology?focusEntityId=501');
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain('sourceKind=otlp-trace-call');
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain('relationType=trace-call');
  });

  it('maps entity detail reads through the domain facade', async () => {
    vi.stubGlobal('fetch', fetchMock);
    mockApiMessagePayload({ entity: { entity: { id: 123 } } });
    mockApiMessagePayload({ content: [{ id: 9, labels: { service: 'checkout' } }], totalElements: 1 });

    await expect(api.entities.detail(123)).resolves.toEqual({ entity: { entity: { id: 123 } } });
    await expect(api.entities.alerts(123, { pageIndex: 0, pageSize: 20, status: 'firing' })).resolves.toEqual({
      content: [{ id: 9, labels: { service: 'checkout' } }],
      totalElements: 1
    });

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      '/api/entities/123/detail',
      expect.objectContaining({ credentials: 'same-origin', cache: 'no-store' })
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      '/api/entities/123/alerts?pageIndex=0&pageSize=20&status=firing',
      expect.objectContaining({ credentials: 'same-origin', cache: 'no-store' })
    );
  });

  it('maps entity editor draft reads through the domain facade', async () => {
    vi.stubGlobal('fetch', fetchMock);
    mockApiMessagePayload({ entity: { id: 123 } });

    await expect(api.entities.editorEntity(123)).resolves.toEqual({ entity: { id: 123 } });

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/entities/123',
      expect.objectContaining({ credentials: 'same-origin', cache: 'no-store' })
    );
  });

  it('maps entity list reads through the domain facade', async () => {
    vi.stubGlobal('fetch', fetchMock);
    mockApiMessagePayload({ content: [], totalElements: 0 });

    await expect(api.entities.list({ search: ' checkout ', type: 'service', status: 'healthy' })).resolves.toEqual({
      content: [],
      totalElements: 0
    });

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/entities?pageIndex=0&pageSize=8&sort=gmtUpdate&order=desc&search=checkout&type=service&status=healthy',
      expect.objectContaining({ credentials: 'same-origin', cache: 'no-store' })
    );
  });

  it('maps entity editor catalog suggestions through the domain facade', async () => {
    vi.stubGlobal('fetch', fetchMock);
    mockApiMessagePayload({ owners: ['platform'] });

    await expect(api.entities.catalogSuggestions()).resolves.toEqual({ owners: ['platform'] });

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/entities/catalog-suggestions?limit=120',
      expect.objectContaining({ credentials: 'same-origin', cache: 'no-store' })
    );
  });

  it('maps entity definition workspace reads through the domain facade', async () => {
    vi.stubGlobal('fetch', fetchMock);
    mockApiMessagePayload('kind: Entity');
    mockApiMessagePayload([{ id: 1, summary: 'updated definition' }]);
    mockApiMessagePayload([{ id: 'base-template', name: 'Base template' }]);

    await expect(api.entities.definition(42, 'yaml')).resolves.toBe('kind: Entity');
    await expect(api.entities.definitionActivities(42)).resolves.toEqual([{ id: 1, summary: 'updated definition' }]);
    await expect(api.entities.definitionTemplates()).resolves.toEqual([{ id: 'base-template', name: 'Base template' }]);

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      '/api/entities/42/definition?format=yaml',
      expect.objectContaining({ credentials: 'same-origin', cache: 'no-store' })
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      '/api/entities/definition-activities?entityId=42&limit=8',
      expect.objectContaining({ credentials: 'same-origin', cache: 'no-store' })
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      3,
      '/api/entities/definition/templates?limit=8',
      expect.objectContaining({ credentials: 'same-origin', cache: 'no-store' })
    );
  });

  it('maps entity import workspace reads through the domain facade', async () => {
    vi.stubGlobal('fetch', fetchMock);
    mockApiMessagePayload([{ id: 'base-template', name: 'Base template' }]);
    mockApiMessagePayload([{ id: 1, summary: 'imported service' }]);

    await expect(api.entities.importTemplates()).resolves.toEqual([{ id: 'base-template', name: 'Base template' }]);
    await expect(api.entities.importActivities()).resolves.toEqual([{ id: 1, summary: 'imported service' }]);

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      '/api/entities/definition/templates?limit=8',
      expect.objectContaining({ credentials: 'same-origin', cache: 'no-store' })
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      '/api/entities/definition-activities?limit=8',
      expect.objectContaining({ credentials: 'same-origin', cache: 'no-store' })
    );
  });

  it('maps entity discovery workspace reads through the domain facade', async () => {
    vi.stubGlobal('fetch', fetchMock);
    mockApiMessagePayload([{ id: 'preset-a', name: 'Default preset' }]);
    mockApiMessagePayload([{ id: 'activity-a', summary: 'synced preset' }]);

    await expect(api.entities.discoveryGovernancePresets()).resolves.toEqual([{ id: 'preset-a', name: 'Default preset' }]);
    await expect(api.entities.discoveryGovernanceActivities()).resolves.toEqual([{ id: 'activity-a', summary: 'synced preset' }]);

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      '/api/entities/discovery/governance-presets?limit=8',
      expect.objectContaining({ credentials: 'same-origin', cache: 'no-store' })
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      '/api/entities/discovery/governance-activities?limit=8',
      expect.objectContaining({ credentials: 'same-origin', cache: 'no-store' })
    );
  });

  it('maps overview console reads through the domain facade', async () => {
    vi.stubGlobal('fetch', fetchMock);
    mockApiMessagePayload({ apps: [{ app: 'website', size: 2 }] });
    mockApiMessagePayload({ content: [{ id: 1, content: 'latency spike' }] });

    await expect(api.overview.summary()).resolves.toEqual({ apps: [{ app: 'website', size: 2 }] });
    await expect(api.overview.alerts({ pageIndex: 0, pageSize: 6, sort: 'gmtUpdate', order: 'desc' })).resolves.toEqual({
      content: [{ id: 1, content: 'latency spike' }]
    });

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      '/api/summary',
      expect.objectContaining({ credentials: 'same-origin', cache: 'no-store' })
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      '/api/alerts?pageIndex=0&pageSize=6&sort=gmtUpdate&order=desc',
      expect.objectContaining({ credentials: 'same-origin', cache: 'no-store' })
    );
  });

  it('maps alert center group mutations through the domain facade', async () => {
    vi.stubGlobal('fetch', fetchMock);
    mockApiMessagePayload(undefined);
    mockApiMessagePayload(undefined);

    await expect(api.alerts.groupStatus('acknowledged', [7, 8])).resolves.toBeUndefined();
    await expect(api.alerts.groupClose(7)).resolves.toBeUndefined();

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      '/api/alerts/group/status/acknowledged?ids=7&ids=8',
      expect.objectContaining({
        method: 'PUT',
        credentials: 'same-origin',
        body: 'null'
      })
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      '/api/alerts/group?ids=7',
      expect.objectContaining({
        method: 'DELETE',
        credentials: 'same-origin'
      })
    );
  });

  it('maps alert center first-screen reads through the domain facade', async () => {
    vi.stubGlobal('fetch', fetchMock);
    mockApiMessagePayload({ total: 4, priorityCriticalNum: 1 });
    mockApiMessagePayload({ content: [{ id: 9, content: 'checkout down' }], totalElements: 1, pageIndex: 0, pageSize: 8 });

    await expect(api.alerts.summary()).resolves.toEqual({ total: 4, priorityCriticalNum: 1 });
    await expect(
      api.alerts.groupAlerts({
        search: ' checkout ',
        status: ' firing ',
        severity: ' critical ',
        pageIndex: 0,
        pageSize: 8,
        entityId: '',
        entityName: '',
        returnTo: ''
      })
    ).resolves.toEqual({
      content: [{ id: 9, content: 'checkout down' }],
      totalElements: 1,
      pageIndex: 0,
      pageSize: 8
    });

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      '/api/alerts/summary',
      expect.objectContaining({ credentials: 'same-origin', cache: 'no-store' })
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      '/api/alerts/group?pageIndex=0&pageSize=8&sort=gmtUpdate&order=desc&search=checkout&status=firing&severity=critical',
      expect.objectContaining({ credentials: 'same-origin', cache: 'no-store' })
    );
  });

  it('maps alert notice first-screen reads through the domain facade', async () => {
    vi.stubGlobal('fetch', fetchMock);
    mockApiMessagePayload({ content: [{ id: 7, name: 'Ops email' }], totalElements: 1 });
    mockApiMessagePayload({ content: [{ id: 8, name: 'All receiver' }], totalElements: 1 });
    mockApiMessagePayload({ content: [{ id: 5, name: 'Critical rule' }], totalElements: 1 });
    mockApiMessagePayload({ content: [{ id: 9, name: 'Email template', preset: false }], totalElements: 1 });
    mockApiMessagePayload({ content: [{ id: 10, name: 'Default template', preset: true }], totalElements: 1 });
    mockApiMessagePayload({ content: [{ id: 11, name: 'Custom template', preset: false }], totalElements: 1 });

    await expect(api.alertNotice.receivers.list({ search: 'ops', pageIndex: 0, pageSize: 8 })).resolves.toEqual({
      content: [{ id: 7, name: 'Ops email' }],
      totalElements: 1
    });
    await expect(api.alertNotice.receivers.options()).resolves.toEqual({
      content: [{ id: 8, name: 'All receiver' }],
      totalElements: 1
    });
    await expect(api.alertNotice.rules.list({ search: 'critical', pageIndex: 0, pageSize: 8 })).resolves.toEqual({
      content: [{ id: 5, name: 'Critical rule' }],
      totalElements: 1
    });
    await expect(api.alertNotice.templates.list({ search: 'email', preset: false, pageIndex: 0, pageSize: 8 })).resolves.toEqual({
      content: [{ id: 9, name: 'Email template', preset: false }],
      totalElements: 1
    });
    await expect(api.alertNotice.templates.options()).resolves.toEqual({
      content: [
        { id: 10, name: 'Default template', preset: true },
        { id: 11, name: 'Custom template', preset: false }
      ],
      totalElements: 2,
      pageIndex: 0,
      pageSize: 2
    });

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      '/api/notice/receivers?pageIndex=0&pageSize=8&name=ops',
      expect.objectContaining({ credentials: 'same-origin', cache: 'no-store' })
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      '/api/notice/receivers?pageIndex=0&pageSize=1000',
      expect.objectContaining({ credentials: 'same-origin', cache: 'no-store' })
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      3,
      '/api/notice/rules?pageIndex=0&pageSize=8&name=critical',
      expect.objectContaining({ credentials: 'same-origin', cache: 'no-store' })
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      4,
      '/api/notice/templates?pageIndex=0&pageSize=8&name=email&preset=false',
      expect.objectContaining({ credentials: 'same-origin', cache: 'no-store' })
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      5,
      '/api/notice/templates?pageIndex=0&pageSize=1000&preset=true',
      expect.objectContaining({ credentials: 'same-origin', cache: 'no-store' })
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      6,
      '/api/notice/templates?pageIndex=0&pageSize=1000&preset=false',
      expect.objectContaining({ credentials: 'same-origin', cache: 'no-store' })
    );
  });

  it('maps alert notice detail and mutations through the domain facade', async () => {
    vi.stubGlobal('fetch', fetchMock);
    mockApiMessagePayload({ id: 7, name: 'Ops email' });
    mockApiMessagePayload({ ok: true });
    mockApiMessagePayload(undefined);
    mockApiMessagePayload(undefined);
    mockApiMessagePayload(undefined);
    mockApiMessagePayload({ id: 5, name: 'Critical rule' });
    mockApiMessagePayload({ ok: true });
    mockApiMessagePayload(undefined);
    mockApiMessagePayload(undefined);
    mockApiMessagePayload({ id: 9, name: 'Email template' });
    mockApiMessagePayload({ ok: true });
    mockApiMessagePayload(undefined);
    mockApiMessagePayload(undefined);

    const receiverDraft = { id: 7, name: ' Ops email ', type: '1', email: ' ops@example.com ', hookAuthType: 'None' } as any;
    const ruleDraft = {
      id: 5,
      name: ' Critical rule ',
      receiverIdsText: '7',
      templateId: '9',
      enable: true,
      filterAll: true,
      labelsText: '',
      daysText: '1,2,3,4,5,6,7',
      periodStart: '09:00',
      periodEnd: '18:00'
    } as any;
    const templateDraft = { id: 9, name: ' Email template ', type: '1', preset: false, content: 'body' } as any;

    await expect(api.alertNotice.receivers.detail(7)).resolves.toEqual({ id: 7, name: 'Ops email' });
    await expect(api.alertNotice.receivers.create(receiverDraft)).resolves.toEqual({ ok: true });
    await expect(api.alertNotice.receivers.update(receiverDraft)).resolves.toBeUndefined();
    await expect(api.alertNotice.receivers.sendTest(receiverDraft)).resolves.toBeUndefined();
    await expect(api.alertNotice.receivers.delete(7)).resolves.toBeUndefined();
    await expect(api.alertNotice.rules.detail(5)).resolves.toEqual({ id: 5, name: 'Critical rule' });
    await expect(api.alertNotice.rules.create(ruleDraft, { receiverName: ['Ops email'], templateName: 'Email template' })).resolves.toEqual({ ok: true });
    await expect(api.alertNotice.rules.update(ruleDraft)).resolves.toBeUndefined();
    await expect(api.alertNotice.rules.delete(5)).resolves.toBeUndefined();
    await expect(api.alertNotice.templates.detail(9)).resolves.toEqual({ id: 9, name: 'Email template' });
    await expect(api.alertNotice.templates.create(templateDraft)).resolves.toEqual({ ok: true });
    await expect(api.alertNotice.templates.update(templateDraft)).resolves.toBeUndefined();
    await expect(api.alertNotice.templates.delete(9)).resolves.toBeUndefined();

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      '/api/notice/receiver/7',
      expect.objectContaining({ credentials: 'same-origin', cache: 'no-store' })
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      '/api/notice/receiver',
      expect.objectContaining({
        method: 'POST',
        credentials: 'same-origin',
        body: expect.stringContaining('"email":"ops@example.com"')
      })
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      3,
      '/api/notice/receiver',
      expect.objectContaining({ method: 'PUT', credentials: 'same-origin' })
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      4,
      '/api/notice/receiver/send-test-msg',
      expect.objectContaining({ method: 'POST', credentials: 'same-origin' })
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      5,
      '/api/notice/receiver/7',
      expect.objectContaining({ method: 'DELETE', credentials: 'same-origin' })
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      6,
      '/api/notice/rule/5',
      expect.objectContaining({ credentials: 'same-origin', cache: 'no-store' })
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      7,
      '/api/notice/rule',
      expect.objectContaining({
        method: 'POST',
        credentials: 'same-origin',
        body: expect.stringContaining('"receiverName":["Ops email"]')
      })
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      8,
      '/api/notice/rule',
      expect.objectContaining({ method: 'PUT', credentials: 'same-origin' })
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      9,
      '/api/notice/rule/5',
      expect.objectContaining({ method: 'DELETE', credentials: 'same-origin' })
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      10,
      '/api/notice/template/9',
      expect.objectContaining({ credentials: 'same-origin', cache: 'no-store' })
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      11,
      '/api/notice/template',
      expect.objectContaining({
        method: 'POST',
        credentials: 'same-origin',
        body: expect.stringContaining('"preset":false')
      })
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      12,
      '/api/notice/template',
      expect.objectContaining({ method: 'PUT', credentials: 'same-origin' })
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      13,
      '/api/notice/template/9',
      expect.objectContaining({ method: 'DELETE', credentials: 'same-origin' })
    );
  });

  it('maps alert setting first-screen reads through the domain facade', async () => {
    vi.stubGlobal('fetch', fetchMock);
    mockApiMessagePayload({ mysql: 'MySQL数据库' });
    mockApiMessagePayload({ content: [{ id: 7, name: 'cpu threshold' }], totalElements: 1 });
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ code: 0, data: { promql: true } }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      })
    );

    await expect(api.alertSettings.appDefines('zh_CN')).resolves.toEqual({ mysql: 'MySQL数据库' });
    await expect(api.alertSettings.list('数据库', 2, 15, [{ key: 'mysql', value: 'MySQL数据库' }])).resolves.toEqual({
      content: [{ id: 7, name: 'cpu threshold' }],
      totalElements: 1
    });
    await expect(api.alertSettings.datasourceStatus()).resolves.toEqual({ code: 0, data: { promql: true } });

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      '/api/apps/defines?lang=zh_CN',
      expect.objectContaining({ credentials: 'same-origin', cache: 'no-store' })
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      '/api/alert/defines?pageIndex=2&pageSize=15&sort=id&order=desc&search=%5B%22mysql%22%5D',
      expect.objectContaining({ credentials: 'same-origin', cache: 'no-store' })
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      3,
      '/api/alert/define/datasource/status',
      expect.objectContaining({ credentials: 'same-origin', cache: 'no-store' })
    );
  });

  it('maps alert setting detail and mutations through the domain facade', async () => {
    vi.stubGlobal('fetch', fetchMock);
    mockApiMessagePayload({ id: 7, name: 'cpu threshold' });
    mockApiMessagePayload({ id: 8 });
    mockApiMessagePayload(undefined);
    mockApiMessagePayload(undefined);

    await expect(api.alertSettings.detail(7)).resolves.toEqual({ id: 7, name: 'cpu threshold' });
    await expect(api.alertSettings.create({ name: 'memory threshold' })).resolves.toEqual({ id: 8 });
    await expect(api.alertSettings.update({ id: 7, enable: false })).resolves.toBeUndefined();
    await expect(api.alertSettings.delete([7, 8])).resolves.toBeUndefined();

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      '/api/alert/define/7',
      expect.objectContaining({ credentials: 'same-origin', cache: 'no-store' })
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      '/api/alert/define',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ name: 'memory threshold' })
      })
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      3,
      '/api/alert/define',
      expect.objectContaining({
        method: 'PUT',
        body: JSON.stringify({ id: 7, enable: false })
      })
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      4,
      '/api/alert/defines?ids=7&ids=8',
      expect.objectContaining({ method: 'DELETE' })
    );
  });

  it('maps alert group first-screen reads through the domain facade', async () => {
    vi.stubGlobal('fetch', fetchMock);
    mockApiMessagePayload({ content: [{ id: 7, name: 'ops group' }], totalElements: 1 });
    mockApiMessagePayload({ content: [{ id: 3, name: 'severity', tagValue: 'critical' }], totalElements: 1 });

    await expect(api.alertGroups.list({ search: 'ops', pageIndex: 0, pageSize: 8 })).resolves.toEqual({
      content: [{ id: 7, name: 'ops group' }],
      totalElements: 1
    });
    await expect(api.alertLabels.list()).resolves.toEqual({
      content: [{ id: 3, name: 'severity', tagValue: 'critical' }],
      totalElements: 1
    });

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      '/api/alert/groups?pageIndex=0&pageSize=8&sort=id&order=desc&search=ops',
      expect.objectContaining({ credentials: 'same-origin', cache: 'no-store' })
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      '/api/label?pageIndex=0&pageSize=9999',
      expect.objectContaining({ credentials: 'same-origin', cache: 'no-store' })
    );
  });

  it('maps alert group detail and mutations through the domain facade', async () => {
    vi.stubGlobal('fetch', fetchMock);
    mockApiMessagePayload({ id: 7, name: 'ops group' });
    mockApiMessagePayload({ id: 8 });
    mockApiMessagePayload(undefined);
    mockApiMessagePayload(undefined);

    await expect(api.alertGroups.detail(7)).resolves.toEqual({ id: 7, name: 'ops group' });
    await expect(api.alertGroups.create({ name: 'new group' })).resolves.toEqual({ id: 8 });
    await expect(api.alertGroups.update({ id: 7, enable: false })).resolves.toBeUndefined();
    await expect(api.alertGroups.delete([7, 8])).resolves.toBeUndefined();

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      '/api/alert/group/7',
      expect.objectContaining({ credentials: 'same-origin', cache: 'no-store' })
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      '/api/alert/group',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ name: 'new group' })
      })
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      3,
      '/api/alert/group',
      expect.objectContaining({
        method: 'PUT',
        body: JSON.stringify({ id: 7, enable: false })
      })
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      4,
      '/api/alert/groups?ids=7&ids=8',
      expect.objectContaining({ method: 'DELETE' })
    );
  });

  it('maps alert inhibit first-screen and matched-detail reads through the domain facade', async () => {
    vi.stubGlobal('fetch', fetchMock);
    mockApiMessagePayload({ content: [{ id: 7, name: 'db inhibit' }], totalElements: 1 });
    mockApiMessagePayload({ id: 7, name: 'db inhibit' });

    await expect(api.alertInhibits.list({ search: 'db', pageIndex: 0, pageSize: 8 })).resolves.toEqual({
      content: [{ id: 7, name: 'db inhibit' }],
      totalElements: 1
    });
    await expect(api.alertInhibits.detail(7)).resolves.toEqual({ id: 7, name: 'db inhibit' });

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      '/api/alert/inhibits?pageIndex=0&pageSize=8&sort=id&order=desc&search=db',
      expect.objectContaining({ credentials: 'same-origin', cache: 'no-store' })
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      '/api/alert/inhibit/7',
      expect.objectContaining({ credentials: 'same-origin', cache: 'no-store' })
    );
  });

  it('maps alert inhibit mutations through the domain facade', async () => {
    vi.stubGlobal('fetch', fetchMock);
    mockApiMessagePayload({ id: 8 });
    mockApiMessagePayload(undefined);
    mockApiMessagePayload(undefined);

    await expect(api.alertInhibits.create({ name: 'new inhibit' })).resolves.toEqual({ id: 8 });
    await expect(api.alertInhibits.update({ id: 7, enable: false })).resolves.toBeUndefined();
    await expect(api.alertInhibits.delete([7, 8])).resolves.toBeUndefined();

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      '/api/alert/inhibit',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ name: 'new inhibit' })
      })
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      '/api/alert/inhibit',
      expect.objectContaining({
        method: 'PUT',
        body: JSON.stringify({ id: 7, enable: false })
      })
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      3,
      '/api/alert/inhibits?ids=7&ids=8',
      expect.objectContaining({ method: 'DELETE' })
    );
  });

  it('maps alert silence first-screen and matched-detail reads through the domain facade', async () => {
    vi.stubGlobal('fetch', fetchMock);
    mockApiMessagePayload({ content: [{ id: 7, name: 'weekday silence' }], totalElements: 1 });
    mockApiMessagePayload({ id: 7, name: 'weekday silence' });

    await expect(api.alertSilences.list({ search: 'weekday', pageIndex: 0, pageSize: 8 })).resolves.toEqual({
      content: [{ id: 7, name: 'weekday silence' }],
      totalElements: 1
    });
    await expect(api.alertSilences.detail(7)).resolves.toEqual({ id: 7, name: 'weekday silence' });

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      '/api/alert/silences?pageIndex=0&pageSize=8&sort=id&order=desc&search=weekday',
      expect.objectContaining({ credentials: 'same-origin', cache: 'no-store' })
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      '/api/alert/silence/7',
      expect.objectContaining({ credentials: 'same-origin', cache: 'no-store' })
    );
  });

  it('maps alert silence mutations through the domain facade', async () => {
    vi.stubGlobal('fetch', fetchMock);
    mockApiMessagePayload({ id: 8 });
    mockApiMessagePayload(undefined);
    mockApiMessagePayload(undefined);

    await expect(api.alertSilences.create({ name: 'new silence' })).resolves.toEqual({ id: 8 });
    await expect(api.alertSilences.update({ id: 7, enable: false })).resolves.toBeUndefined();
    await expect(api.alertSilences.delete([7, 8])).resolves.toBeUndefined();

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      '/api/alert/silence',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ name: 'new silence' })
      })
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      '/api/alert/silence',
      expect.objectContaining({
        method: 'PUT',
        body: JSON.stringify({ id: 7, enable: false })
      })
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      3,
      '/api/alert/silences?ids=7&ids=8',
      expect.objectContaining({ method: 'DELETE' })
    );
  });

  it('keeps legacy write semantics available through scoped operations', async () => {
    vi.stubGlobal('fetch', fetchMock);
    mockApiMessagePayload({ ok: true });

    await expect(api.monitors.copy(42)).resolves.toEqual({ ok: true });

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/monitor/copy/42',
      expect.objectContaining({
        method: 'POST',
        body: 'null'
      })
    );
  });
});
