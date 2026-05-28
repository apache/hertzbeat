import { afterEach, describe, expect, it, vi } from 'vitest';

import { api } from './monitor-api-facade';

const fetchMock = vi.fn<typeof fetch>();

function mockApiMessagePayload(data: unknown) {
  fetchMock.mockResolvedValueOnce(
    new Response(JSON.stringify({ code: 0, data }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    })
  );
}

describe('monitor api facade', () => {
  afterEach(() => {
    fetchMock.mockReset();
    vi.unstubAllGlobals();
  });

  it('maps monitor list reads through the monitor domain URL builder', async () => {
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

  it('maps monitor editor draft reads through the monitor domain facade', async () => {
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

    expect(fetchMock).toHaveBeenNthCalledWith(1, '/api/monitor/42', expect.objectContaining({ credentials: 'same-origin' }));
    expect(fetchMock).toHaveBeenNthCalledWith(2, '/api/collector', expect.objectContaining({ credentials: 'same-origin' }));
    expect(fetchMock).toHaveBeenNthCalledWith(3, '/api/apps/mysql/params', expect.objectContaining({ credentials: 'same-origin' }));
  });

  it('maps monitor export downloads to response readers', async () => {
    vi.stubGlobal('fetch', fetchMock);
    fetchMock.mockResolvedValueOnce(new Response('zip', { status: 200 }));

    await expect(api.monitors.exportResponse([42, 43], 'JSON')).resolves.toBeInstanceOf(Response);

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/monitors/export?ids=42&ids=43&type=JSON',
      expect.objectContaining({ credentials: 'same-origin', cache: 'no-store' })
    );
  });
});
