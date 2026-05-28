import { NextRequest } from 'next/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { GET, POST } from './route';

function catalogPostRequest(body: unknown) {
  return new NextRequest('http://localhost/api/actions/catalog', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: {
      'content-type': 'application/json',
      cookie: 'hb_ui_access=session-token'
    }
  });
}

function catalogListRequest() {
  return new NextRequest('http://localhost/api/actions/catalog?limit=8', {
    method: 'GET',
    headers: { cookie: 'hb_ui_access=session-token' }
  });
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('actions catalog API', () => {
  it('saves a manager-backed manual-only catalog item when the manager contract is live', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({
      code: 0,
      data: {
        catalogId: 'restart-checkout',
        name: 'Restart checkout service',
        risk: 'high',
        executionMode: 'manual-approval-draft-only',
        executionAllowed: false,
        adapterOwner: 'manager-action-catalog',
        status: 'catalog-item-ready'
      }
    }), { status: 200, headers: { 'content-type': 'application/json' } }));

    const response = await POST(catalogPostRequest({
      catalogId: 'restart-checkout',
      name: 'Restart checkout service',
      risk: 'high',
      executionMode: 'manual-approval-draft-only',
      executionAllowed: false,
      metadata: { playbook: 'checkout-restart' }
    }));
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toMatchObject({
      catalogId: 'restart-checkout',
      name: 'Restart checkout service',
      risk: 'high',
      executionMode: 'manual-approval-draft-only',
      executionAllowed: false,
      adapterOwner: 'manager-action-catalog',
      status: 'catalog-item-ready',
      managerBacked: true
    });
    expect(globalThis.fetch).toHaveBeenCalledWith(
      'http://127.0.0.1:1157/api/actions/catalog',
      expect.objectContaining({ method: 'POST', cache: 'no-store' })
    );
  });

  it('falls back to a local non-executing non-persisted catalog item when manager is unavailable', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('missing', { status: 404 }));

    const response = await POST(catalogPostRequest({
      catalogId: 'restart-checkout',
      name: 'Restart checkout service',
      risk: 'high',
      category: 'remediation',
      scope: 'service:commerce/checkout',
      owner: 'sre',
      executionAllowed: false,
      metadata: { playbook: 'checkout-restart' }
    }));
    const payload = await response.json();

    expect(response.status).toBe(202);
    expect(payload).toMatchObject({
      catalogId: 'restart-checkout',
      name: 'Restart checkout service',
      risk: 'high',
      category: 'remediation',
      scope: 'service:commerce/checkout',
      owner: 'sre',
      executionMode: 'manual-approval-draft-only',
      executionAllowed: false,
      adapterOwner: 'next-actions-catalog-bff',
      status: 'catalog-item-fallback-not-persisted',
      managerBacked: false,
      metadata: { playbook: 'checkout-restart' }
    });
  });

  it('rejects catalog payloads that try to enable direct execution', async () => {
    const response = await POST(catalogPostRequest({
      catalogId: 'restart-checkout',
      name: 'Restart checkout service',
      risk: 'high',
      executionMode: 'execute-now',
      executionAllowed: true
    }));
    const payload = await response.json();

    expect(response.status).toBe(409);
    expect(payload).toEqual({
      state: 'blocked',
      message: 'action catalog items must stay manual and non-executing'
    });
  });

  it('lists manager-backed catalog items when the manager read contract is live', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({
      code: 0,
      data: [
        {
          catalogId: 'restart-checkout',
          name: 'Restart checkout service',
          risk: 'high',
          executionMode: 'manual-approval-draft-only',
          executionAllowed: false,
          adapterOwner: 'manager-action-catalog',
          status: 'catalog-item-ready'
        }
      ]
    }), { status: 200, headers: { 'content-type': 'application/json' } }));

    const response = await GET(catalogListRequest());
    const payload = await response.json();

    expect(payload).toMatchObject({
      state: 'manager-action-catalog',
      adapterOwner: 'manager-action-catalog',
      managerBacked: true,
      items: [
        {
          catalogId: 'restart-checkout',
          executionMode: 'manual-approval-draft-only',
          executionAllowed: false,
          managerBacked: true
        }
      ]
    });
    expect(globalThis.fetch).toHaveBeenCalledWith(
      'http://127.0.0.1:1157/api/actions/catalog?limit=8',
      expect.objectContaining({ method: 'GET', cache: 'no-store' })
    );
  });
});
