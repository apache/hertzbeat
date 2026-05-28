import type { EntityTopologyApiGraph, TopologyRouteContext } from './view-model';

export type TopologyApiGet = <T>(path: string, init?: RequestInit) => Promise<T>;

export type LoadTopologyGraphOptions = {
  timeoutMs?: number;
};

const inFlightTopologyGraphReads = new Map<string, Promise<EntityTopologyApiGraph>>();

function normalizeNumericId(value: string | undefined) {
  const trimmed = value?.trim();
  return trimmed && /^\d+$/.test(trimmed) ? trimmed : undefined;
}

function normalizeBooleanText(value: string | undefined) {
  const trimmed = value?.trim().toLowerCase();
  return trimmed === 'true' || trimmed === 'false' ? trimmed : undefined;
}

function appendContextParam(params: URLSearchParams, key: string, value: string | undefined) {
  const trimmed = value?.trim();
  if (trimmed) params.set(key, trimmed);
}

export function resolveTopologyRelationType(context: TopologyRouteContext) {
  const explicitRelationType = context.relationType?.trim();
  if (explicitRelationType) return explicitRelationType;
  if (context.sourceKind === 'otlp-trace-call' || context.viewMode === 'service-call') return 'trace-call';
  return undefined;
}

export function buildTopologyApiUrl(context: TopologyRouteContext = {}) {
  const params = new URLSearchParams();
  const focusEntityId = normalizeNumericId(context.entityId);
  if (focusEntityId) params.set('focusEntityId', focusEntityId);
  params.set('depth', normalizeNumericId(context.depth) ?? '2');
  appendContextParam(params, 'environment', context.environment);
  appendContextParam(params, 'sourceKind', context.sourceKind);
  appendContextParam(params, 'relationType', resolveTopologyRelationType(context));
  appendContextParam(params, 'hideInternal', normalizeBooleanText(context.hideInternal));
  appendContextParam(params, 'pageIndex', normalizeNumericId(context.pageIndex));
  appendContextParam(params, 'pageSize', normalizeNumericId(context.pageSize));
  appendContextParam(params, 'start', normalizeNumericId(context.start));
  appendContextParam(params, 'end', normalizeNumericId(context.end));
  return `/topology?${params.toString()}`;
}

export async function loadTopologyGraph(
  apiGet: TopologyApiGet,
  context: TopologyRouteContext = {},
  options: LoadTopologyGraphOptions = {}
) {
  const url = buildTopologyApiUrl(context);
  const timeoutMs = options.timeoutMs && options.timeoutMs > 0 ? options.timeoutMs : 0;
  const inFlightKey = `${url}::${timeoutMs}`;
  const inFlight = inFlightTopologyGraphReads.get(inFlightKey);
  if (inFlight) return inFlight;

  const request = (async () => {
    if (!timeoutMs) return apiGet<EntityTopologyApiGraph>(url);

    const controller = new AbortController();
    const apiRequest = apiGet<EntityTopologyApiGraph>(url, { signal: controller.signal });
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    const timeout = new Promise<never>((_, reject) => {
      timeoutId = setTimeout(() => {
        controller.abort();
        reject(new Error(`Topology API request timed out after ${timeoutMs}ms`));
      }, timeoutMs);
    });

    try {
      return await Promise.race([apiRequest, timeout]);
    } finally {
      if (timeoutId) clearTimeout(timeoutId);
    }
  })().finally(() => {
    inFlightTopologyGraphReads.delete(inFlightKey);
  });

  inFlightTopologyGraphReads.set(inFlightKey, request);
  return request;
}
