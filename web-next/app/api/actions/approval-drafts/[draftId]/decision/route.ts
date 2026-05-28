import { NextRequest, NextResponse } from 'next/server';
import { buildBackendApiUrl, HB_UI_ACCESS_COOKIE, readJsonPayload, readSessionCookieValue } from '../../../../../../lib/session-bff';
import { decideFallbackApprovalDraft } from '../../../../../../lib/actions-approval-draft-fallback-store';

export const dynamic = 'force-dynamic';

type ApprovalDecisionPayload = {
  decision?: unknown;
  reviewer?: unknown;
  reason?: unknown;
  executionMode?: unknown;
  executionAllowed?: unknown;
};

type ManagerMessagePayload = {
  code?: number;
  msg?: string;
  data?: Record<string, unknown> | null;
};

function text(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function validateDecisionPayload(payload: ApprovalDecisionPayload) {
  const decision = text(payload.decision);
  if (decision !== 'approved' && decision !== 'rejected') {
    return { error: 'approval decision must be approved or rejected' };
  }
  if (payload.executionAllowed !== false || payload.executionMode !== 'manual-approval-draft-only') {
    return { error: 'approval decisions must stay manual and non-executing', blocked: true };
  }
  return { decision };
}

function managerHeaders(request: NextRequest) {
  const headers = new Headers();
  headers.set('content-type', 'application/json');
  const accessToken = readSessionCookieValue(request, HB_UI_ACCESS_COOKIE);
  if (accessToken) {
    headers.set('authorization', `Bearer ${accessToken}`);
  }
  const acceptLanguage = request.headers.get('accept-language');
  if (acceptLanguage) {
    headers.set('accept-language', acceptLanguage);
  }
  return headers;
}

function normalizeManagerDecision(data: Record<string, unknown>) {
  return {
    ...data,
    executionAllowed: false,
    executionState: text(data.executionState) || 'not-executed',
    adapterOwner: text(data.adapterOwner) || 'manager-action-approval-draft',
    managerBacked: true
  };
}

function fallbackDecision(draftId: string, payload: ApprovalDecisionPayload, decision: string) {
  return decideFallbackApprovalDraft(
    draftId,
    decision,
    text(payload.reviewer) || 'hertzbeat-ui-operator',
    text(payload.reason) || 'manual approval decision from actions workbench'
  );
}

async function postManagerDecision(request: NextRequest, draftId: string, payload: ApprovalDecisionPayload) {
  try {
    const upstream = await fetch(
      buildBackendApiUrl(`/actions/approval-drafts/${encodeURIComponent(draftId)}/decision`),
      {
        method: 'POST',
        headers: managerHeaders(request),
        body: JSON.stringify(payload),
        cache: 'no-store'
      }
    );
    if (upstream.status === 404) return null;
    const managerPayload = await readJsonPayload(upstream) as ManagerMessagePayload;
    if (!upstream.ok || managerPayload.code !== 0 || !managerPayload.data) {
      return null;
    }
    return normalizeManagerDecision(managerPayload.data);
  } catch {
    return null;
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ draftId?: string }> }
) {
  const { draftId } = await params;
  if (!draftId) {
    return NextResponse.json({ state: 'invalid-request', message: 'draftId is required' }, { status: 400 });
  }

  let payload: ApprovalDecisionPayload;
  try {
    payload = await request.json() as ApprovalDecisionPayload;
  } catch {
    return NextResponse.json({ state: 'invalid-request', message: 'invalid approval decision payload' }, { status: 400 });
  }

  const validation = validateDecisionPayload(payload);
  if (validation.error) {
    return NextResponse.json(
      { state: validation.blocked ? 'blocked' : 'invalid-request', message: validation.error },
      { status: validation.blocked ? 409 : 400 }
    );
  }

  const managerDecision = await postManagerDecision(request, draftId, payload);
  return NextResponse.json(
    managerDecision || fallbackDecision(draftId, payload, validation.decision as string),
    { status: 202 }
  );
}
