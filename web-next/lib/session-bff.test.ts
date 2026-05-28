import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  buildBackendApiUrl,
  proxyBackendApiRequest,
  sanitizeSessionPayload
} from './session-bff';

describe('session BFF helpers', () => {
  const previousBackendOrigin = process.env.BACKEND_ORIGIN;

  afterEach(() => {
    if (previousBackendOrigin === undefined) {
      delete process.env.BACKEND_ORIGIN;
    } else {
      process.env.BACKEND_ORIGIN = previousBackendOrigin;
    }
    vi.unstubAllGlobals();
  });

  it('builds backend API URLs from the configured private origin', () => {
    process.env.BACKEND_ORIGIN = 'http://backend.internal:1157';

    expect(buildBackendApiUrl('/config/system', '?locale=en-US')).toBe(
      'http://backend.internal:1157/api/config/system?locale=en-US'
    );
    expect(buildBackendApiUrl('alerts')).toBe('http://backend.internal:1157/api/alerts');
  });

  it('strips credential material from login and refresh payloads before returning them to browser code', () => {
    expect(
      sanitizeSessionPayload({
        code: 0,
        data: {
          token: 'access-token',
          refreshToken: 'refresh-token',
          user: 'admin'
        }
      })
    ).toEqual({
      code: 0,
      data: {
        user: 'admin',
        authenticated: true,
        tokenBoundary: 'bff-cookie'
      }
    });
  });

  it('forwards the BFF access cookie as backend authorization when the framework cookie reader misses it', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify({ code: 0, data: { ok: true } }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      })
    );
    vi.stubGlobal('fetch', fetchMock);

    const request = {
      url: 'http://127.0.0.1:4200/api/config/system?locale=zh-CN',
      method: 'GET',
      headers: new Headers({
        cookie: 'hb_ui_session=1; hb_ui_access=session-access-token; theme=dark',
        'accept-language': 'zh-CN'
      }),
      cookies: {
        get: () => undefined
      },
      arrayBuffer: vi.fn()
    };

    await proxyBackendApiRequest(request as any, '/config/system');

    expect(fetchMock).toHaveBeenCalledWith(
      'http://127.0.0.1:1157/api/config/system?locale=zh-CN',
      expect.objectContaining({
        method: 'GET',
        cache: 'no-store'
      })
    );
    const forwardedHeaders = fetchMock.mock.calls[0][1]?.headers as Headers;
    expect(forwardedHeaders.get('Authorization')).toBe('Bearer session-access-token');
    expect(forwardedHeaders.get('cookie')).toBeNull();
  });

  it('does not forward backend auth challenges to browser-facing API responses', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      new Response('token expired', {
        status: 401,
        headers: {
          'Content-Type': 'text/plain',
          'WWW-Authenticate': 'Digest realm=sureness_realm,nonce=abc,qop=auth'
        }
      })
    );
    vi.stubGlobal('fetch', fetchMock);

    const request = {
      url: 'http://127.0.0.1:4200/api/monitor',
      method: 'GET',
      headers: new Headers(),
      cookies: {
        get: () => undefined
      },
      arrayBuffer: vi.fn()
    };

    const response = await proxyBackendApiRequest(request as any, '/monitor');

    expect(response.status).toBe(401);
    expect(response.headers.get('WWW-Authenticate')).toBeNull();
    expect(response.headers.get('Content-Type')).toContain('text/plain');
  });

  it('refreshes the BFF access cookie and retries protected API calls when only refresh session remains', async () => {
    const fetchMock = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(
        new Response('token expired', {
          status: 401,
          headers: {
            'WWW-Authenticate': 'Digest realm=sureness_realm,nonce=abc,qop=auth'
          }
        })
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            code: 0,
            data: {
              token: 'new-access-token',
              refreshToken: 'new-refresh-token'
            }
          }),
          {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
          }
        )
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ code: 0, data: { ok: true } }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        })
      );
    vi.stubGlobal('fetch', fetchMock);

    const request = {
      url: 'http://127.0.0.1:4200/api/config/system',
      method: 'GET',
      headers: new Headers({
        cookie: 'hb_ui_session=1; hb_ui_refresh=session-refresh-token',
        'accept-language': 'zh-CN'
      }),
      cookies: {
        get: () => undefined
      },
      arrayBuffer: vi.fn()
    };

    const response = await proxyBackendApiRequest(request as any, '/config/system');

    expect(response.status).toBe(200);
    expect(await response.text()).toContain('"ok":true');
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(fetchMock.mock.calls[1][0]).toBe('http://127.0.0.1:1157/api/account/auth/refresh');
    expect(fetchMock.mock.calls[1][1]).toEqual(
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ token: 'session-refresh-token' })
      })
    );
    const retryHeaders = fetchMock.mock.calls[2][1]?.headers as Headers;
    expect(retryHeaders.get('Authorization')).toBe('Bearer new-access-token');
    expect(response.headers.get('set-cookie')).toContain('hb_ui_access=new-access-token');
    expect(response.headers.get('set-cookie')).toContain('hb_ui_refresh=new-refresh-token');
    expect(response.headers.get('WWW-Authenticate')).toBeNull();
  });
});
