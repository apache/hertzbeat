import { NextRequest } from 'next/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { POST } from './route';
import { resetFallbackApprovalDraftsForTest } from '../../../../../../lib/actions-approval-draft-fallback-store';

function decisionRequest(body: unknown) {
  return new NextRequest('http://localhost/api/actions/approval-drafts/draft-1/decision', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: {
      'content-type': 'application/json',
      cookie: 'hb_ui_access=session-token'
    }
  });
}

function params(draftId = 'draft-1') {
  return { params: Promise.resolve({ draftId }) };
}

afterEach(() => {
  vi.restoreAllMocks();
  resetFallbackApprovalDraftsForTest();
});

describe('actions approval draft decision API', () => {
  it('records a manager-backed non-executing approval decision when the manager contract is live', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({
      code: 0,
      data: {
        draftId: 'draft-1',
        decision: 'approved',
        reviewer: 'ops-lead',
        state: 'approval-draft-approved',
        executionState: 'not-executed',
        executionAllowed: false,
        adapterOwner: 'manager-action-approval-draft'
      }
    }), { status: 200, headers: { 'content-type': 'application/json' } }));

    const response = await POST(decisionRequest({
      decision: 'approved',
      reviewer: 'ops-lead',
      reason: 'reviewed rollback evidence',
      executionMode: 'manual-approval-draft-only',
      executionAllowed: false
    }), params());
    const payload = await response.json();

    expect(response.status).toBe(202);
    expect(payload).toMatchObject({
      draftId: 'draft-1',
      decision: 'approved',
      state: 'approval-draft-approved',
      executionState: 'not-executed',
      executionAllowed: false,
      adapterOwner: 'manager-action-approval-draft',
      managerBacked: true
    });
    expect(globalThis.fetch).toHaveBeenCalledWith(
      'http://127.0.0.1:1157/api/actions/approval-drafts/draft-1/decision',
      expect.objectContaining({ method: 'POST', cache: 'no-store' })
    );
  });

  it('falls back to a local non-executing rejected decision when the manager route is unavailable', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('missing', { status: 404 }));

    const response = await POST(decisionRequest({
      decision: 'rejected',
      reviewer: 'ops-lead',
      reason: 'risk too high',
      executionMode: 'manual-approval-draft-only',
      executionAllowed: false
    }), params());
    const payload = await response.json();

    expect(response.status).toBe(202);
    expect(payload).toMatchObject({
      draftId: 'draft-1',
      decision: 'rejected',
      reviewer: 'ops-lead',
      reason: 'risk too high',
      state: 'approval-draft-rejected',
      executionState: 'not-executed',
      executionAllowed: false,
      adapterOwner: 'next-actions-approval-decision-bff',
      managerBacked: false
    });
  });

  it('rejects decisions that try to execute an action', async () => {
    const response = await POST(decisionRequest({
      decision: 'approved',
      executionMode: 'manual-approval-draft-only',
      executionAllowed: true
    }), params());
    const payload = await response.json();

    expect(response.status).toBe(409);
    expect(payload).toEqual({
      state: 'blocked',
      message: 'approval decisions must stay manual and non-executing'
    });
  });
});
