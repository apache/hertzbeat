import { afterEach, describe, expect, it, vi } from 'vitest';

import { apiDownload, apiGet, apiMessageDelete, apiMessageGet, apiMessagePost, apiMessagePut } from './api-client';

const fetchMock = vi.fn<typeof fetch>();

function mockApiMessagePayload(payload: unknown) {
  fetchMock.mockResolvedValueOnce(
    new Response(JSON.stringify(payload), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    })
  );
}

function mockHttpStatus(status: number) {
  fetchMock.mockResolvedValueOnce(new Response('unavailable', { status }));
}

describe('api client message helpers', () => {
  afterEach(() => {
    fetchMock.mockReset();
    vi.unstubAllGlobals();
  });

  it('uses runtime fallback copy when the backend omits a non-zero message', async () => {
    vi.stubGlobal('fetch', fetchMock);
    mockApiMessagePayload({ code: 500, data: null });

    await expect(apiMessageGet('/bad')).rejects.toThrow('API message returned non-zero code');
  });

  it('preserves backend-provided message text for non-zero payloads', async () => {
    vi.stubGlobal('fetch', fetchMock);
    mockApiMessagePayload({ code: 500, msg: 'Backend said no', data: null });

    await expect(apiMessagePost('/bad', {})).rejects.toThrow('Backend said no');
  });

  it('preserves backend-provided message text for write helpers used by monitor detect and save', async () => {
    vi.stubGlobal('fetch', fetchMock);
    mockApiMessagePayload({ code: 1, msg: 'Detect failed from backend', data: null });
    mockApiMessagePayload({ code: 2, msg: 'Save failed from backend', data: null });

    await expect(apiMessagePost('/monitor/detect', { monitor: { app: 'website' } })).rejects.toThrow(
      'Detect failed from backend'
    );
    await expect(apiMessagePut('/monitor/1001', { monitor: { app: 'website' } })).rejects.toThrow(
      'Save failed from backend'
    );
  });

  it('posts FormData bodies without forcing a JSON content type', async () => {
    vi.stubGlobal('fetch', fetchMock);
    mockApiMessagePayload({ code: 0, data: { ok: true } });

    const formData = new FormData();
    formData.append('name', 'smtp');
    await expect(apiMessagePost('/plugin', formData)).resolves.toEqual({ ok: true });

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/plugin',
      expect.objectContaining({
        method: 'POST',
        body: formData
      })
    );
    expect(JSON.stringify(fetchMock.mock.calls[0]?.[1]?.headers ?? {})).not.toContain('Content-Type');
  });

  it('attaches backend non-zero codes to thrown message errors', async () => {
    vi.stubGlobal('fetch', fetchMock);
    mockApiMessagePayload({ code: 3, msg: 'Monitor disappeared', data: null });

    await expect(apiMessageGet('/monitors/manage')).rejects.toMatchObject({ code: 3 });
  });

  it('shares the non-zero fallback across write helpers', async () => {
    vi.stubGlobal('fetch', fetchMock);
    mockApiMessagePayload({ code: 500, data: null });
    mockApiMessagePayload({ code: 500, data: null });

    await expect(apiMessagePut('/bad', {})).rejects.toThrow('API message returned non-zero code');
    await expect(apiMessageDelete('/bad')).rejects.toThrow('API message returned non-zero code');
  });

  it('uses runtime fallback copy for failed HTTP status responses', async () => {
    vi.stubGlobal('fetch', fetchMock);
    mockHttpStatus(503);

    await expect(apiGet('/offline')).rejects.toThrow('API request failed: 503');
  });

  it('attaches HTTP status codes to thrown request errors', async () => {
    vi.stubGlobal('fetch', fetchMock);
    mockHttpStatus(404);

    await expect(apiGet('/offline')).rejects.toMatchObject({ status: 404 });
  });

  it('forwards abort signals through message reads so topology timeouts can cancel fetch work', async () => {
    vi.stubGlobal('fetch', fetchMock);
    mockApiMessagePayload({ code: 0, data: { ok: true } });

    const controller = new AbortController();
    await expect(apiMessageGet('/topology', { signal: controller.signal })).resolves.toEqual({ ok: true });

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/topology',
      expect.objectContaining({
        signal: controller.signal
      })
    );
  });

  it('returns raw download responses so export handlers can inspect headers and JSON error bodies', async () => {
    vi.stubGlobal('fetch', fetchMock);
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ code: 1, msg: 'export denied' }), {
        status: 200,
        headers: {
          'Content-Disposition': 'attachment; filename=monitors.json',
          'Content-Type': 'application/json'
        }
      })
    );

    const response = await apiDownload('/monitors/export?ids=42&type=JSON');

    expect(response.headers.get('Content-Disposition')).toBe('attachment; filename=monitors.json');
    expect(response.headers.get('Content-Type')).toContain('application/json');
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/monitors/export?ids=42&type=JSON',
      expect.objectContaining({ credentials: 'same-origin', cache: 'no-store' })
    );
  });
});
