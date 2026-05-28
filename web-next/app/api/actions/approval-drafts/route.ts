import { NextRequest, NextResponse } from 'next/server';
import { buildBackendApiUrl, HB_UI_ACCESS_COOKIE, readJsonPayload, readSessionCookieValue } from '../../../../lib/session-bff';
import { listFallbackApprovalDrafts, saveFallbackApprovalDraft } from '../../../../lib/actions-approval-draft-fallback-store';

export const dynamic = 'force-dynamic';

type ApprovalDraftPayload = {
  draftId?: unknown;
  actionId?: unknown;
  catalogId?: unknown;
  confirmation?: unknown;
  executionMode?: unknown;
  executionAllowed?: unknown;
  context?: unknown;
  evidenceHref?: unknown;
};

type ManagerMessagePayload = {
  code?: number;
  msg?: string;
  data?: Record<string, unknown> | Record<string, unknown>[] | null;
};

function stableDraftSuffix(value: string) {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) % 100000;
  }
  return String(hash).padStart(5, '0');
}

function text(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function validatePayload(payload: ApprovalDraftPayload) {
  const actionId = text(payload.actionId);
  const catalogId = text(payload.catalogId);
  if (!actionId || !catalogId) {
    return { error: 'actionId and catalogId are required' };
  }

  if (payload.confirmation !== 'manual-required' || payload.executionMode !== 'manual-approval-draft-only' || payload.executionAllowed !== false) {
    return { error: 'approval drafts must stay manual and non-executing', blocked: true };
  }

  return { actionId, catalogId };
}

function fallbackDraft(payload: ApprovalDraftPayload, actionId: string, catalogId: string) {
  const context = payload.context && typeof payload.context === 'object' ? payload.context : {};
  const fingerprint = stableDraftSuffix(JSON.stringify({ actionId, catalogId, context, evidenceHref: payload.evidenceHref }));

  return saveFallbackApprovalDraft({
    draftId: text(payload.draftId) || `approval-draft-${actionId}-${fingerprint}`,
    state: 'approval-draft-created',
    executionState: 'not-executed',
    executionAllowed: false,
    adapterOwner: 'next-actions-approval-draft-bff',
    managerBacked: false,
    actionId,
    catalogId
  });
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

function normalizeManagerDraft(data: Record<string, unknown>) {
  return {
    ...data,
    executionAllowed: false,
    executionState: text(data.executionState) || 'not-executed',
    adapterOwner: text(data.adapterOwner) || 'manager-action-approval-draft',
    managerBacked: true
  };
}

async function postManagerApprovalDraft(request: NextRequest, payload: ApprovalDraftPayload) {
  try {
    const upstream = await fetch(buildBackendApiUrl('/actions/approval-drafts'), {
      method: 'POST',
      headers: managerHeaders(request),
      body: JSON.stringify(payload),
      cache: 'no-store'
    });
    if (upstream.status === 404) return null;
    const managerPayload = await readJsonPayload(upstream) as ManagerMessagePayload;
    if (!upstream.ok || managerPayload.code !== 0 || !managerPayload.data || Array.isArray(managerPayload.data)) {
      return null;
    }
    return normalizeManagerDraft(managerPayload.data);
  } catch {
    return null;
  }
}

async function getManagerApprovalDrafts(request: NextRequest) {
  const requestUrl = new URL(request.url);
  try {
    const upstream = await fetch(buildBackendApiUrl('/actions/approval-drafts', requestUrl.search), {
      method: 'GET',
      headers: managerHeaders(request),
      cache: 'no-store'
    });
    if (upstream.status === 404) return null;
    const managerPayload = await readJsonPayload(upstream) as ManagerMessagePayload;
    if (!upstream.ok || managerPayload.code !== 0 || !Array.isArray(managerPayload.data)) {
      return null;
    }
    return managerPayload.data.map(item => normalizeManagerDraft(item));
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  let payload: ApprovalDraftPayload;
  try {
    payload = await request.json() as ApprovalDraftPayload;
  } catch {
    return NextResponse.json({ state: 'invalid-request', message: 'invalid approval draft payload' }, { status: 400 });
  }

  const validation = validatePayload(payload);
  if (validation.error) {
    return NextResponse.json(
      { state: validation.blocked ? 'blocked' : 'invalid-request', message: validation.error },
      { status: validation.blocked ? 409 : 400 }
    );
  }

  const managerDraft = await postManagerApprovalDraft(request, payload);
  return NextResponse.json(
    managerDraft || fallbackDraft(payload, validation.actionId as string, validation.catalogId as string),
    { status: 202 }
  );
}

export async function GET(request: NextRequest) {
  const managerDrafts = await getManagerApprovalDrafts(request);
  const requestUrl = new URL(request.url);
  const limit = Number(requestUrl.searchParams.get('limit') || '8');
  const fallbackDrafts = managerDrafts ? [] : listFallbackApprovalDrafts(Number.isFinite(limit) ? limit : 8);
  return NextResponse.json({
    state: managerDrafts ? 'manager-approval-drafts' : fallbackDrafts.length > 0 ? 'fallback-local-drafts' : 'fallback-empty',
    adapterOwner: managerDrafts ? 'manager-action-approval-draft' : 'next-actions-approval-draft-bff',
    managerBacked: Boolean(managerDrafts),
    drafts: managerDrafts || fallbackDrafts
  });
}
