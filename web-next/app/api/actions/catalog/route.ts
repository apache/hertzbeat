import { NextRequest, NextResponse } from 'next/server';
import { buildBackendApiUrl, HB_UI_ACCESS_COOKIE, readJsonPayload, readSessionCookieValue } from '../../../../lib/session-bff';

export const dynamic = 'force-dynamic';

type ActionCatalogPayload = {
  catalogId?: unknown;
  name?: unknown;
  category?: unknown;
  scope?: unknown;
  owner?: unknown;
  risk?: unknown;
  executionMode?: unknown;
  executionAllowed?: unknown;
  metadata?: unknown;
};

type ManagerMessagePayload = {
  code?: number;
  msg?: string;
  data?: Record<string, unknown> | Record<string, unknown>[] | null;
};

function text(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function validatePayload(payload: ActionCatalogPayload) {
  const catalogId = text(payload.catalogId);
  const name = text(payload.name);
  const risk = text(payload.risk);
  if (!catalogId || !name || !risk) {
    return { error: 'catalogId, name and risk are required' };
  }

  const executionMode = text(payload.executionMode);
  if ((executionMode && executionMode !== 'manual-approval-draft-only') || payload.executionAllowed === true) {
    return { error: 'action catalog items must stay manual and non-executing', blocked: true };
  }

  return { catalogId, name, risk };
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

function normalizeManagerCatalogItem(data: Record<string, unknown>) {
  return {
    ...data,
    executionAllowed: false,
    executionMode: text(data.executionMode) || 'manual-approval-draft-only',
    adapterOwner: text(data.adapterOwner) || 'manager-action-catalog',
    status: text(data.status) || 'catalog-item-ready',
    managerBacked: true
  };
}

function fallbackCatalogItem(payload: ActionCatalogPayload, catalogId: string, name: string, risk: string) {
  const metadata = payload.metadata && typeof payload.metadata === 'object' ? payload.metadata : {};
  return {
    catalogId,
    name,
    risk,
    category: text(payload.category),
    scope: text(payload.scope),
    owner: text(payload.owner),
    executionMode: 'manual-approval-draft-only',
    executionAllowed: false,
    adapterOwner: 'next-actions-catalog-bff',
    status: 'catalog-item-fallback-not-persisted',
    managerBacked: false,
    metadata
  };
}

async function postManagerCatalogItem(request: NextRequest, payload: ActionCatalogPayload) {
  try {
    const upstream = await fetch(buildBackendApiUrl('/actions/catalog'), {
      method: 'POST',
      headers: managerHeaders(request),
      body: JSON.stringify({
        ...payload,
        executionMode: 'manual-approval-draft-only',
        executionAllowed: false
      }),
      cache: 'no-store'
    });
    if (upstream.status === 404) return null;
    const managerPayload = await readJsonPayload(upstream) as ManagerMessagePayload;
    if (!upstream.ok || managerPayload.code !== 0 || !managerPayload.data || Array.isArray(managerPayload.data)) {
      return null;
    }
    return normalizeManagerCatalogItem(managerPayload.data);
  } catch {
    return null;
  }
}

async function getManagerCatalogItems(request: NextRequest) {
  const requestUrl = new URL(request.url);
  try {
    const upstream = await fetch(buildBackendApiUrl('/actions/catalog', requestUrl.search), {
      method: 'GET',
      headers: managerHeaders(request),
      cache: 'no-store'
    });
    if (upstream.status === 404) return null;
    const managerPayload = await readJsonPayload(upstream) as ManagerMessagePayload;
    if (!upstream.ok || managerPayload.code !== 0 || !Array.isArray(managerPayload.data)) {
      return null;
    }
    return managerPayload.data.map(item => normalizeManagerCatalogItem(item));
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  let payload: ActionCatalogPayload;
  try {
    payload = await request.json() as ActionCatalogPayload;
  } catch {
    return NextResponse.json({ state: 'invalid-request', message: 'invalid action catalog payload' }, { status: 400 });
  }

  const validation = validatePayload(payload);
  if (validation.error) {
    return NextResponse.json(
      { state: validation.blocked ? 'blocked' : 'invalid-request', message: validation.error },
      { status: validation.blocked ? 409 : 400 }
    );
  }

  const managerItem = await postManagerCatalogItem(request, payload);
  return NextResponse.json(
    managerItem || fallbackCatalogItem(
      payload,
      validation.catalogId as string,
      validation.name as string,
      validation.risk as string
    ),
    { status: managerItem ? 200 : 202 }
  );
}

export async function GET(request: NextRequest) {
  const managerItems = await getManagerCatalogItems(request);
  return NextResponse.json({
    state: managerItems ? 'manager-action-catalog' : 'fallback-empty',
    adapterOwner: managerItems ? 'manager-action-catalog' : 'next-actions-catalog-bff',
    managerBacked: Boolean(managerItems),
    items: managerItems || []
  });
}
