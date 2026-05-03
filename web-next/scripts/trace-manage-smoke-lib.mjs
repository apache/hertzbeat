export const TRACE_MANAGE_SMOKE_ROUTE = '/trace/manage';
export const TRACE_MANAGE_SMOKE_SERVICE_NAME = 'checkout-service';
const TRACE_MANAGE_SMOKE_WINDOW_MS = 10 * 60 * 1000;
const TRACE_MANAGE_SMOKE_TRACE_OFFSET_MS = 3 * 60 * 1000;

export function buildTraceManageSmokeWindow(nowMs = Date.now()) {
  const numericNow = Number.isFinite(nowMs) ? nowMs : Date.now();
  const endMs = Math.floor(numericNow / 60000) * 60000;
  const startMs = Math.max(0, endMs - TRACE_MANAGE_SMOKE_WINDOW_MS);
  const traceStartMs = startMs + TRACE_MANAGE_SMOKE_TRACE_OFFSET_MS;
  return {
    start: String(startMs),
    end: String(endMs),
    traceStart: String(traceStartMs)
  };
}

export function buildTraceManageSmokeQuery(nowMs = Date.now()) {
  const window = buildTraceManageSmokeWindow(nowMs);
  return {
    traceId: `trace-ui-rich-demo-${window.end}`,
    serviceName: TRACE_MANAGE_SMOKE_SERVICE_NAME,
    errorOnly: 'true',
    start: window.start,
    end: window.end,
    returnTo: '/overview',
    serviceNamespace: 'storefront',
    environment: 'dev'
  };
}

const TRACE_MANAGE_SMOKE_RUNTIME_NOW_MS = Number(process.env.TRACE_MANAGE_SMOKE_NOW_MS ?? Date.now());
const TRACE_MANAGE_SMOKE_WINDOW = buildTraceManageSmokeWindow(TRACE_MANAGE_SMOKE_RUNTIME_NOW_MS);

export const TRACE_MANAGE_SMOKE_TRACE_ID = buildTraceManageSmokeQuery(TRACE_MANAGE_SMOKE_RUNTIME_NOW_MS).traceId;
export const TRACE_MANAGE_SMOKE_TRACE_START_MS = TRACE_MANAGE_SMOKE_WINDOW.traceStart;
export const TRACE_MANAGE_SMOKE_DEEP_LINK_QUERY = buildTraceManageSmokeQuery(TRACE_MANAGE_SMOKE_RUNTIME_NOW_MS);

function buildRoutePath(routePath, query) {
  const params = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      params.set(key, String(value));
    }
  });
  const queryString = params.toString();
  return queryString ? `${routePath}?${queryString}` : routePath;
}

export const TRACE_MANAGE_SMOKE_DEEP_LINK_ROUTE = buildRoutePath(TRACE_MANAGE_SMOKE_ROUTE, TRACE_MANAGE_SMOKE_DEEP_LINK_QUERY);

export function buildTraceManageProtectedRoute() {
  return TRACE_MANAGE_SMOKE_DEEP_LINK_ROUTE;
}

export function buildTraceManageResetExpectedQuery() {
  return {
    start: TRACE_MANAGE_SMOKE_DEEP_LINK_QUERY.start,
    end: TRACE_MANAGE_SMOKE_DEEP_LINK_QUERY.end,
    returnTo: TRACE_MANAGE_SMOKE_DEEP_LINK_QUERY.returnTo,
    serviceName: TRACE_MANAGE_SMOKE_DEEP_LINK_QUERY.serviceName,
    serviceNamespace: TRACE_MANAGE_SMOKE_DEEP_LINK_QUERY.serviceNamespace,
    environment: TRACE_MANAGE_SMOKE_DEEP_LINK_QUERY.environment
  };
}

export async function runTraceManageSmoke({ baseUrl, assertRouteLoads }) {
  const routeShell = await assertRouteLoads(baseUrl, TRACE_MANAGE_SMOKE_ROUTE, {
    expectedPath: TRACE_MANAGE_SMOKE_ROUTE
  });

  const deepLink = await assertRouteLoads(baseUrl, TRACE_MANAGE_SMOKE_DEEP_LINK_ROUTE, {
    expectedPath: TRACE_MANAGE_SMOKE_ROUTE,
    expectedQuery: TRACE_MANAGE_SMOKE_DEEP_LINK_QUERY
  });

  return {
    baseUrl,
    routeShell,
    deepLink
  };
}
