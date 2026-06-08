import { describe, expect, it, vi } from 'vitest';

const proxyBackendApiRequest = vi.hoisted(() => vi.fn());

vi.mock('@/lib/session-bff', () => ({
  proxyBackendApiRequest
}));

import { DELETE, GET } from './route';

describe('catch-all API proxy route', () => {
  it('preserves encoded reserved characters in backend paths', async () => {
    proxyBackendApiRequest.mockResolvedValue(new Response(null, { status: 204 }));
    const request = {
      url: 'http://127.0.0.1:4200/api/signal/dashboard/signals%3Akey%2Fwith%3Freserved'
    };

    await DELETE(request as any, {
      params: Promise.resolve({
        path: ['signal', 'dashboard', 'signals:key/with?reserved']
      })
    });

    expect(proxyBackendApiRequest).toHaveBeenCalledWith(
      request,
      '/signal/dashboard/signals%3Akey%2Fwith%3Freserved'
    );
  });

  it('keeps query strings out of the proxied backend path', async () => {
    proxyBackendApiRequest.mockResolvedValue(new Response(null, { status: 200 }));
    const request = {
      url: 'http://127.0.0.1:4200/api/logs/list?traceId=trace-1'
    };

    await GET(request as any, {
      params: Promise.resolve({
        path: ['logs', 'list']
      })
    });

    expect(proxyBackendApiRequest).toHaveBeenCalledWith(request, '/logs/list');
  });
});
