import type { EntityTopologyApiGraph, TopologyRouteContext } from './view-model';
import { resolveTimeContextBounds } from '../time-context';

export type TopologyApiGet = <T>(path: string, init?: RequestInit) => Promise<T>;

export type LoadTopologyGraphOptions = {
  timeoutMs?: number;
  cacheBust?: () => string;
};

type TopologyApiMessagePayload<T> = {
  code?: number;
  msg?: string;
  data?: T;
};

export const TRACE_CALL_TOPOLOGY_API_TIMEOUT_MS = 60000;
export const CMDB_TOPOLOGY_API_TIMEOUT_MS = 60000;
export const DEFAULT_TOPOLOGY_API_TIMEOUT_MS = 30000;
const COMPLETED_TOPOLOGY_PREFETCH_CACHE_MS = 60000;
const TOPOLOGY_GREPTIME_REAL_SCALE_PROOF_FOCUS_ENTITY_ID = '646562420231424';
const TOPOLOGY_GREPTIME_REAL_SCALE_PROOF_API_POLICY = 'focused-real-greptime-scale-fixture';
const TOPOLOGY_MIXED_STAR_MESH_SCALE_PROOF_API_POLICY = 'global-real-greptime-mixed-star-mesh-fixture';
const TOPOLOGY_SCALE_PROOF_SEEDED_WINDOW_START_MS = '1780344000000';
const TOPOLOGY_SCALE_PROOF_SEEDED_WINDOW_END_MS = '1780352700000';

const inFlightTopologyGraphReads = new Map<string, Promise<EntityTopologyApiGraph>>();
const completedTopologyGraphReads = new Map<string, { graph: EntityTopologyApiGraph; expiresAt: number }>();
let volatileTopologyRequestSequence = 0;

function normalizeNumericId(value: string | undefined) {
  const trimmed = value?.trim();
  return trimmed && /^\d+$/.test(trimmed) ? trimmed : undefined;
}

export function resolveTopologyScaleProofFocusEntityId(context: TopologyRouteContext = {}) {
  const proof = context.scaleProof?.trim();
  if (proof === 'greptime-real') return TOPOLOGY_GREPTIME_REAL_SCALE_PROOF_FOCUS_ENTITY_ID;
  return undefined;
}

export function resolveTopologyScaleProofApiPolicy(context: TopologyRouteContext = {}) {
  const proof = context.scaleProof?.trim();
  if (proof === 'greptime-real') return TOPOLOGY_GREPTIME_REAL_SCALE_PROOF_API_POLICY;
  if (proof === 'mixed-star-mesh') return TOPOLOGY_MIXED_STAR_MESH_SCALE_PROOF_API_POLICY;
  return undefined;
}

export function resolveTopologyScaleProofTimeWindow(context: TopologyRouteContext = {}) {
  const proof = context.scaleProof?.trim();
  if (proof !== 'greptime-real' && proof !== 'mixed-star-mesh') return undefined;
  if (normalizeNumericId(context.start) || normalizeNumericId(context.end)) return undefined;
  return {
    start: TOPOLOGY_SCALE_PROOF_SEEDED_WINDOW_START_MS,
    end: TOPOLOGY_SCALE_PROOF_SEEDED_WINDOW_END_MS,
    policy: 'fixed-seeded-greptime-window'
  } as const;
}

function resolveTopologyApiFocusEntityId(context: TopologyRouteContext) {
  return normalizeNumericId(context.entityId) ?? resolveTopologyScaleProofFocusEntityId(context);
}

export function hasUnresolvableTopologyFocusEntity(context: TopologyRouteContext = {}) {
  const trimmed = context.entityId?.trim();
  return Boolean(trimmed && !normalizeNumericId(trimmed));
}

function normalizeBooleanText(value: string | undefined) {
  const trimmed = value?.trim().toLowerCase();
  return trimmed === 'true' || trimmed === 'false' ? trimmed : undefined;
}

function appendContextParam(params: URLSearchParams, key: string, value: string | undefined) {
  const trimmed = value?.trim();
  if (trimmed) params.set(key, trimmed);
}

function resolveTopologyApiTimeBounds(context: TopologyRouteContext) {
  const explicitStart = normalizeNumericId(context.start);
  const explicitEnd = normalizeNumericId(context.end);
  if (explicitStart && explicitEnd) return { start: explicitStart, end: explicitEnd };
  const scaleProofWindow = resolveTopologyScaleProofTimeWindow(context);
  if (scaleProofWindow) {
    return {
      start: scaleProofWindow.start,
      end: scaleProofWindow.end
    };
  }

  const resolved = resolveTimeContextBounds({
    timeRange: context.timeRange,
    from: context.from,
    to: context.to,
    start: context.start,
    end: context.end,
    refresh: context.refresh,
    live: context.live,
    tz: context.tz,
    timezone: context.timezone
  });
  return {
    start: explicitStart ?? resolved?.start,
    end: explicitEnd ?? resolved?.end
  };
}

export function resolveTopologyRelationType(context: TopologyRouteContext) {
  const explicitRelationType = context.relationType?.trim();
  if (explicitRelationType) return explicitRelationType;
  if (context.viewMode === 'service-call') return 'trace-call';
  return undefined;
}

export function resolveTopologyApiTimeoutMs(routeContext?: TopologyRouteContext) {
  if (routeContext?.sourceKind === 'otlp-trace-call' || routeContext?.viewMode === 'service-call') {
    return TRACE_CALL_TOPOLOGY_API_TIMEOUT_MS;
  }
  if (routeContext?.sourceKind === 'cmdb-manual-label') {
    return CMDB_TOPOLOGY_API_TIMEOUT_MS;
  }
  return DEFAULT_TOPOLOGY_API_TIMEOUT_MS;
}

function shouldApplyTopologyApiTimeBounds(context: TopologyRouteContext, relationType: string | undefined) {
  const hasTimeScope = Boolean(
    context.timeRange?.trim() ||
      context.from?.trim() ||
      context.to?.trim() ||
      context.start?.trim() ||
      context.end?.trim() ||
      context.live?.trim() ||
      context.refresh?.trim()
  );
  return (
    context.sourceKind === 'otlp-trace-call' ||
    context.viewMode === 'service-call' ||
    relationType === 'trace-call' ||
    (!context.sourceKind && hasTimeScope)
  );
}

function resolveTopologyApiRetryCount(context: TopologyRouteContext, relationType: string | undefined) {
  if (context.sourceKind === 'cmdb-manual-label' && !shouldApplyTopologyApiTimeBounds(context, relationType)) return 1;
  return 0;
}

function shouldUseCompletedTopologyGraphCache(context: TopologyRouteContext) {
  if (context.scaleProof?.trim()) return false;
  if (context.refresh?.trim()) return false;
  if (context.live?.trim() === 'true') return false;
  return true;
}

export function shouldPreservePreviousTopologyGraphDuringLoad(context: TopologyRouteContext = {}) {
  return shouldUseCompletedTopologyGraphCache(context);
}

function shouldForwardTopologyApiSourceKind(context: TopologyRouteContext) {
  const relationType = resolveTopologyRelationType(context);
  if (context.sourceKind === 'otlp-trace-call' && relationType === 'trace-call') {
    return false;
  }
  return !(
    context.sourceKind === 'otlp-trace-call' &&
    context.viewMode !== 'service-call' &&
    !context.relationType?.trim()
  );
}

export function buildTopologyApiUrl(context: TopologyRouteContext = {}) {
  const params = new URLSearchParams();
  const focusEntityId = resolveTopologyApiFocusEntityId(context);
  const relationType = resolveTopologyRelationType(context);
  const timeBounds = shouldApplyTopologyApiTimeBounds(context, relationType)
    ? resolveTopologyApiTimeBounds(context)
    : {};
  if (focusEntityId) params.set('focusEntityId', focusEntityId);
  params.set('depth', normalizeNumericId(context.depth) ?? '2');
  appendContextParam(params, 'environment', context.environment);
  appendContextParam(params, 'sourceKind', shouldForwardTopologyApiSourceKind(context) ? context.sourceKind : undefined);
  appendContextParam(params, 'relationType', relationType);
  appendContextParam(params, 'hideInternal', normalizeBooleanText(context.hideInternal));
  appendContextParam(params, 'pageIndex', normalizeNumericId(context.pageIndex));
  appendContextParam(params, 'pageSize', normalizeNumericId(context.pageSize));
  appendContextParam(params, 'start', timeBounds.start);
  appendContextParam(params, 'end', timeBounds.end);
  return `/topology?${params.toString()}`;
}

function buildTopologyApiFetchUrl(url: string, useCompletedCache: boolean, explicitCacheBust: string | undefined) {
  if (useCompletedCache) return url;
  const [pathname, query = ''] = url.split('?');
  const params = new URLSearchParams(query);
  volatileTopologyRequestSequence += 1;
  params.set('_hbTopologyCacheBust', explicitCacheBust || `${Date.now()}-${volatileTopologyRequestSequence}`);
  return `${pathname}?${params.toString()}`;
}

export async function loadTopologyGraph(
  apiGet: TopologyApiGet,
  context: TopologyRouteContext = {},
  options: LoadTopologyGraphOptions = {}
) {
  const url = buildTopologyApiUrl(context);
  const relationType = resolveTopologyRelationType(context);
  const retryCount = resolveTopologyApiRetryCount(context, relationType);
  const timeoutMs = options.timeoutMs && options.timeoutMs > 0 ? options.timeoutMs : 0;
  const explicitCacheBust = options.cacheBust?.().trim() || undefined;
  const useCompletedCache = shouldUseCompletedTopologyGraphCache(context) && !explicitCacheBust;
  const fetchUrl = buildTopologyApiFetchUrl(url, useCompletedCache, explicitCacheBust);
  const inFlightKey = `${url}::${timeoutMs}::${retryCount}${explicitCacheBust ? `::${explicitCacheBust}` : ''}`;
  const inFlight = inFlightTopologyGraphReads.get(inFlightKey);
  if (inFlight) return inFlight;
  if (useCompletedCache) {
    const completed = completedTopologyGraphReads.get(inFlightKey);
    if (completed) {
      if (completed.expiresAt > Date.now()) return completed.graph;
      completedTopologyGraphReads.delete(inFlightKey);
    }
  } else {
    completedTopologyGraphReads.delete(inFlightKey);
  }

  const request = (async () => {
    const readOnce = () => {
      if (!timeoutMs) return apiGet<EntityTopologyApiGraph>(fetchUrl);

      const controller = new AbortController();
      const apiRequest = apiGet<EntityTopologyApiGraph>(fetchUrl, { signal: controller.signal });
      let timeoutId: ReturnType<typeof setTimeout> | undefined;
      const timeout = new Promise<never>((_, reject) => {
        timeoutId = setTimeout(() => {
          controller.abort();
          reject(new Error(`Topology API request timed out after ${timeoutMs}ms`));
        }, timeoutMs);
      });

      return Promise.race([apiRequest, timeout]).finally(() => {
        if (timeoutId) clearTimeout(timeoutId);
      });
    };

    let lastError: unknown;
    for (let attempt = 0; attempt <= retryCount; attempt += 1) {
      try {
        return await readOnce();
      } catch (error) {
        lastError = error;
      }
    }
    throw lastError;
  })().then(graph => {
    if (useCompletedCache) {
      completedTopologyGraphReads.set(inFlightKey, {
        graph,
        expiresAt: Date.now() + COMPLETED_TOPOLOGY_PREFETCH_CACHE_MS
      });
    } else {
      completedTopologyGraphReads.delete(inFlightKey);
    }
    return graph;
  }).finally(() => {
    inFlightTopologyGraphReads.delete(inFlightKey);
  });

  inFlightTopologyGraphReads.set(inFlightKey, request);
  return request;
}

async function fetchTopologyApiMessage<T>(path: string, init: RequestInit = {}) {
  const locale = typeof window === 'undefined'
    ? null
    : window.localStorage.getItem('hb.lang') || window.localStorage.getItem('layout.lang');
  const response = await fetch(path.startsWith('/api') ? path : `/api${path}`, {
    ...init,
    headers: {
      ...(locale ? { 'Accept-Language': locale } : {}),
      ...((init.headers as Record<string, string> | undefined) || {})
    },
    credentials: 'same-origin',
    cache: 'no-store'
  });
  if (!response.ok) {
    throw new Error(`Topology API request failed: ${response.status}`);
  }
  const payload = await response.json() as TopologyApiMessagePayload<T>;
  if (payload.code !== 0) {
    throw new Error(payload.msg || 'Topology API request failed');
  }
  return payload.data as T;
}

export function preloadTopologyGraph(
  context: TopologyRouteContext = {},
  options: LoadTopologyGraphOptions = {}
) {
  if (typeof window === 'undefined') return undefined;
  return loadTopologyGraph(fetchTopologyApiMessage, context, options).catch(() => undefined);
}
