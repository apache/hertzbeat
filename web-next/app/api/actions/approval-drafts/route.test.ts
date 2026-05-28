import { NextRequest } from 'next/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { GET, POST } from './route';
import { POST as POST_DECISION } from './[draftId]/decision/route';
import { resetFallbackApprovalDraftsForTest } from '../../../../lib/actions-approval-draft-fallback-store';

function approvalDraftRequest(body: unknown) {
  return new NextRequest('http://localhost/api/actions/approval-drafts', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'content-type': 'application/json' }
  });
}

function approvalDraftListRequest() {
  return new NextRequest('http://localhost/api/actions/approval-drafts?limit=8', {
    method: 'GET',
    headers: { cookie: 'hb_ui_access=session-token' }
  });
}

function approvalDraftDecisionRequest(draftId: string) {
  return new NextRequest(`http://localhost/api/actions/approval-drafts/${draftId}/decision`, {
    method: 'POST',
    body: JSON.stringify({
      decision: 'approved',
      reviewer: 'ops-lead',
      reason: 'reviewed fallback lifecycle evidence',
      executionMode: 'manual-approval-draft-only',
      executionAllowed: false
    }),
    headers: {
      'content-type': 'application/json',
      cookie: 'hb_ui_access=session-token'
    }
  });
}

function approvalDraftDecisionParams(draftId: string) {
  return { params: Promise.resolve({ draftId }) };
}

afterEach(() => {
  vi.restoreAllMocks();
  resetFallbackApprovalDraftsForTest();
});

describe('actions approval draft API', () => {
  it('creates a manager-backed non-executing approval draft when the manager contract is live', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({
      code: 0,
      data: {
        draftId: 'manager-draft-1',
        state: 'approval-draft-created',
        executionState: 'not-executed',
        executionAllowed: false,
        adapterOwner: 'manager-action-approval-draft',
        actionId: 'suggest-restart-checkout',
        catalogId: 'restart-checkout'
      }
    }), { status: 200, headers: { 'content-type': 'application/json' } }));

    const response = await POST(approvalDraftRequest({
      actionId: 'suggest-restart-checkout',
      catalogId: 'restart-checkout',
      confirmation: 'manual-required',
      executionMode: 'manual-approval-draft-only',
      executionAllowed: false,
      context: {
        source: 'alert',
        entityId: 'service:commerce/checkout',
        traceId: 'trace-123'
      },
      evidenceHref: '/alert?status=firing'
    }));
    const payload = await response.json();

    expect(response.status).toBe(202);
    expect(payload).toMatchObject({
      draftId: 'manager-draft-1',
      state: 'approval-draft-created',
      executionState: 'not-executed',
      executionAllowed: false,
      adapterOwner: 'manager-action-approval-draft',
      managerBacked: true,
      actionId: 'suggest-restart-checkout',
      catalogId: 'restart-checkout'
    });
    expect(globalThis.fetch).toHaveBeenCalledWith(
      'http://127.0.0.1:1157/api/actions/approval-drafts',
      expect.objectContaining({ method: 'POST', cache: 'no-store' })
    );
  });

  it('falls back to a local non-executing approval draft when the manager route is unavailable', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('missing', { status: 404 }));

    const response = await POST(approvalDraftRequest({
      actionId: 'suggest-restart-checkout',
      catalogId: 'restart-checkout',
      confirmation: 'manual-required',
      executionMode: 'manual-approval-draft-only',
      executionAllowed: false,
      context: {
        source: 'alert',
        entityId: 'service:commerce/checkout',
        traceId: 'trace-123'
      },
      evidenceHref: '/alert?status=firing'
    }));
    const payload = await response.json();

    expect(response.status).toBe(202);
    expect(payload).toMatchObject({
      state: 'approval-draft-created',
      executionState: 'not-executed',
      executionAllowed: false,
      adapterOwner: 'next-actions-approval-draft-bff',
      managerBacked: false,
      actionId: 'suggest-restart-checkout',
      catalogId: 'restart-checkout'
    });
    expect(payload.draftId).toMatch(/^approval-draft-suggest-restart-checkout-/);
  });

  it('lists locally created fallback approval drafts until the manager read contract is live', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('missing', { status: 404 }));

    const createResponse = await POST(approvalDraftRequest({
      actionId: 'suggest-restart-checkout',
      catalogId: 'restart-checkout',
      confirmation: 'manual-required',
      executionMode: 'manual-approval-draft-only',
      executionAllowed: false,
      context: {
        source: 'alert',
        entityId: 'service:commerce/checkout',
        traceId: 'trace-123'
      },
      evidenceHref: '/alert?status=firing'
    }));
    const created = await createResponse.json();
    const listResponse = await GET(approvalDraftListRequest());
    const listed = await listResponse.json();

    expect(listed).toMatchObject({
      state: 'fallback-local-drafts',
      adapterOwner: 'next-actions-approval-draft-bff',
      managerBacked: false,
      drafts: [
        {
          draftId: created.draftId,
          state: 'approval-draft-created',
          executionState: 'not-executed',
          executionAllowed: false,
          actionId: 'suggest-restart-checkout',
          catalogId: 'restart-checkout'
        }
      ]
    });
  });

  it('lists locally approved fallback approval drafts from the shared runtime store', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('missing', { status: 404 }));

    const createResponse = await POST(approvalDraftRequest({
      actionId: 'suggest-restart-checkout',
      catalogId: 'restart-checkout',
      confirmation: 'manual-required',
      executionMode: 'manual-approval-draft-only',
      executionAllowed: false,
      context: {
        source: 'alert',
        entityId: 'service:commerce/checkout',
        traceId: 'trace-123'
      },
      evidenceHref: '/alert?status=firing'
    }));
    const created = await createResponse.json();
    await POST_DECISION(
      approvalDraftDecisionRequest(created.draftId),
      approvalDraftDecisionParams(created.draftId)
    );

    const listResponse = await GET(approvalDraftListRequest());
    const listed = await listResponse.json();

    expect(listed).toMatchObject({
      state: 'fallback-local-drafts',
      adapterOwner: 'next-actions-approval-draft-bff',
      managerBacked: false,
      drafts: [
        {
          draftId: created.draftId,
          state: 'approval-draft-approved',
          executionState: 'not-executed',
          executionAllowed: false,
          adapterOwner: 'next-actions-approval-decision-bff',
          actionId: 'suggest-restart-checkout',
          catalogId: 'restart-checkout'
        }
      ]
    });
  });

  it('rejects payloads that try to bypass manual non-execution guardrails', async () => {
    const response = await POST(approvalDraftRequest({
      actionId: 'suggest-restart-checkout',
      catalogId: 'restart-checkout',
      confirmation: 'manual-required',
      executionMode: 'execute-now',
      executionAllowed: true
    }));
    const payload = await response.json();

    expect(response.status).toBe(409);
    expect(payload).toEqual({
      state: 'blocked',
      message: 'approval drafts must stay manual and non-executing'
    });
  });

  it('lists manager-backed approval drafts when the manager read contract is live', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({
      code: 0,
      data: [
        {
          draftId: 'manager-draft-1',
          state: 'approval-draft-created',
          executionState: 'not-executed',
          executionAllowed: false,
          adapterOwner: 'manager-action-approval-draft'
        }
      ]
    }), { status: 200, headers: { 'content-type': 'application/json' } }));

    const response = await GET(approvalDraftListRequest());
    const payload = await response.json();

    expect(payload).toMatchObject({
      state: 'manager-approval-drafts',
      adapterOwner: 'manager-action-approval-draft',
      managerBacked: true,
      drafts: [
        {
          draftId: 'manager-draft-1',
          executionState: 'not-executed',
          executionAllowed: false,
          managerBacked: true
        }
      ]
    });
    expect(globalThis.fetch).toHaveBeenCalledWith(
      'http://127.0.0.1:1157/api/actions/approval-drafts?limit=8',
      expect.objectContaining({ method: 'GET', cache: 'no-store' })
    );
  });
});
