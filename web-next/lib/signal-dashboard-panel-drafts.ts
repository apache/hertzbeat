import type { SignalPanelEditContext } from './signal-route-context';

export type SignalDashboardPanelDraftSignal = 'logs' | 'traces' | 'metrics' | 'alerts';

export type SignalDashboardPanelVisualization = 'list' | 'trace' | 'time-series' | 'table' | 'graph';

const THREE_SIGNAL_PANEL_DRAFT_SIGNALS: SignalDashboardPanelDraftSignal[] = ['logs', 'traces', 'metrics'];

export type SignalDashboardPanelDraft = {
  id?: number;
  signal: SignalDashboardPanelDraftSignal;
  draftKey: string;
  title: string;
  description: string;
  visualization: SignalDashboardPanelVisualization;
  route: string;
  querySnapshot?: string;
  payload?: string;
  createTime?: string;
  updateTime?: string;
};

type ApiMessage<T> = {
  code: number;
  msg?: string;
  data?: T;
};

function hashDraftIdentity(value: string) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

export function buildSignalDashboardPanelDraftKey(
  signal: SignalDashboardPanelDraftSignal,
  route: string,
  visualization: SignalDashboardPanelVisualization
) {
  return `${signal}-panel-${hashDraftIdentity(`${visualization}:${route}`)}`;
}

export function createSignalDashboardPanelDraft(input: {
  signal: SignalDashboardPanelDraftSignal;
  title: string;
  description: string;
  visualization: SignalDashboardPanelVisualization;
  route: string;
  payload?: Record<string, unknown>;
}): SignalDashboardPanelDraft {
  return {
    signal: input.signal,
    draftKey: buildSignalDashboardPanelDraftKey(input.signal, input.route, input.visualization),
    title: input.title,
    description: input.description,
    visualization: input.visualization,
    route: input.route,
    querySnapshot: input.route,
    payload: JSON.stringify({
      createdAt: Date.now(),
      ...(input.payload || {})
    })
  };
}

function readDraftPayload(payload: string | undefined): Record<string, unknown> {
  if (!payload) return {};
  try {
    const parsed = JSON.parse(payload);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? parsed as Record<string, unknown>
      : {};
  } catch {
    return {};
  }
}

export function duplicateSignalDashboardPanelDraft(
  draft: SignalDashboardPanelDraft,
  options: {
    titleSuffix: string;
    draftKeySuffix?: string;
  }
): SignalDashboardPanelDraft {
  const duplicatedAt = Date.now();
  const sourcePayload = readDraftPayload(draft.payload);
  const draftKeySuffix = options.draftKeySuffix || `copy-${duplicatedAt.toString(36)}`;
  return {
    ...draft,
    id: undefined,
    createTime: undefined,
    updateTime: undefined,
    draftKey: `${draft.draftKey}-${draftKeySuffix}`,
    title: `${draft.title} ${options.titleSuffix}`.trim(),
    querySnapshot: draft.querySnapshot || draft.route,
    payload: JSON.stringify({
      ...sourcePayload,
      source: 'signal-dashboard-panel-duplicate',
      duplicatedFromSource: sourcePayload.source,
      duplicatedFromDraftKey: draft.draftKey,
      duplicatedAt
    })
  };
}

export function applySignalDashboardPanelEditContext(
  draft: SignalDashboardPanelDraft,
  editContext: SignalPanelEditContext | null | undefined
): SignalDashboardPanelDraft {
  if (!editContext) return draft;
  const payload = readDraftPayload(draft.payload);
  return {
    ...draft,
    draftKey: editContext.draftKey || draft.draftKey,
    payload: JSON.stringify({
      ...payload,
      dashboardPanelEdit: {
        intent: editContext.intent,
        dashboardKey: editContext.dashboardKey,
        panelId: editContext.panelId,
        draftKey: editContext.draftKey,
        returnTo: editContext.returnTo,
        returnLabel: editContext.returnLabel
      }
    })
  };
}

async function requestSignalDashboardPanelDraft<T>(path: string, init: RequestInit = {}): Promise<T> {
  if (typeof fetch === 'undefined') {
    throw new Error('Signal dashboard panel draft API is unavailable');
  }
  const response = await fetch(path.startsWith('/api') ? path : `/api${path}`, {
    ...init,
    headers: {
      ...(init.body ? { 'Content-Type': 'application/json' } : {}),
      ...(init.headers || {})
    },
    credentials: 'same-origin',
    cache: 'no-store'
  });
  if (!response.ok) {
    throw new Error(`Signal dashboard panel draft request failed with ${response.status}`);
  }
  const payload = await response.json() as ApiMessage<T>;
  if (payload.code !== 0) {
    throw new Error(payload.msg || 'Signal dashboard panel draft request failed');
  }
  return payload.data as T;
}

export async function saveSignalDashboardPanelDraft(
  draft: SignalDashboardPanelDraft
): Promise<SignalDashboardPanelDraft> {
  return requestSignalDashboardPanelDraft<SignalDashboardPanelDraft>('/signal/dashboard-panel-draft', {
    method: 'PUT',
    body: JSON.stringify(draft)
  });
}

export async function loadSignalDashboardPanelDrafts(
  signal: SignalDashboardPanelDraftSignal
): Promise<SignalDashboardPanelDraft[]> {
  return requestSignalDashboardPanelDraft<SignalDashboardPanelDraft[]>(
    `/signal/dashboard-panel-draft/${encodeURIComponent(signal)}`
  );
}

export async function loadAllSignalDashboardPanelDrafts(): Promise<SignalDashboardPanelDraft[]> {
  const drafts = await Promise.all(THREE_SIGNAL_PANEL_DRAFT_SIGNALS.map(signal => loadSignalDashboardPanelDrafts(signal)));
  return drafts.flat();
}

export async function deleteSignalDashboardPanelDraft(
  signal: SignalDashboardPanelDraftSignal,
  draftKey: string
): Promise<void> {
  await requestSignalDashboardPanelDraft<void>(
    `/signal/dashboard-panel-draft/${encodeURIComponent(signal)}/${encodeURIComponent(draftKey)}`,
    { method: 'DELETE' }
  );
}
