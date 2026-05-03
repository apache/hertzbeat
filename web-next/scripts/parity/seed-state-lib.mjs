import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { loginWithPassword, requestMessage, requireMessageData } from '../release-shell-smoke.mjs';
import { TRACE_MANAGE_SMOKE_ROUTE, buildTraceManageSmokeQuery } from '../trace-manage-smoke-lib.mjs';

const TRACE_RICH_DEMO_SCRIPT_PATH = fileURLToPath(new URL('../../../script/dev/seed-trace-rich-demo.sh', import.meta.url));
const TRACE_RICH_DEMO_SCRIPT_CWD = fileURLToPath(new URL('../../../', import.meta.url));

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

function applyReferenceRouteMode(route, referenceRouteMode) {
  if (!route || referenceRouteMode !== 'drop-trace-selection') {
    return route;
  }

  const url = new URL(route, 'http://127.0.0.1');
  url.searchParams.delete('traceId');
  url.searchParams.delete('spanId');
  const queryString = url.searchParams.toString();
  return queryString ? `${url.pathname}?${queryString}` : url.pathname;
}

export async function runTraceRichDemoSeed({ traceWindowEndMs, execFileSyncImpl = execFileSync }) {
  execFileSyncImpl('bash', [TRACE_RICH_DEMO_SCRIPT_PATH], {
    cwd: TRACE_RICH_DEMO_SCRIPT_CWD,
    env: {
      ...process.env,
      GREPTIME_HTTP: process.env.GREPTIME_HTTP || 'http://127.0.0.1:14000',
      TRACE_WINDOW_END_MS: String(traceWindowEndMs)
    },
    encoding: 'utf8',
    stdio: 'pipe'
  });
}

const SEED_STATE_CONFIG = {
  'monitor-fixture': {
    requestPath: '/api/monitors?pageIndex=0&pageSize=1',
    contextKey: 'monitorId',
    routePattern: /\/monitors\/1(?=\/|$)/,
    extractId(data) {
      return data?.content?.[0]?.id;
    }
  },
  'entity-fixture': {
    requestPath: '/api/entities?pageIndex=0&pageSize=1',
    contextKey: 'entityId',
    routePattern: /\/entities\/1(?=\/|$)/,
    fallbackId: '1',
    extractId(data) {
      return data?.content?.[0]?.id;
    }
  },
  'trace-rich-demo': {
    alwaysNeedsSeedContext: true,
    applyRoute(route, seedContext) {
      if (!route?.startsWith(TRACE_MANAGE_SMOKE_ROUTE)) {
        return route;
      }

      return seedContext.traceManageDeepLinkRoute || route;
    },
    async resolveContext({
      nowMs = Date.now(),
      skipExternalSeed = false,
      runTraceRichDemoSeedImpl = runTraceRichDemoSeed,
      buildTraceManageSmokeQueryImpl = buildTraceManageSmokeQuery
    }) {
      const traceQuery = buildTraceManageSmokeQueryImpl(nowMs);
      if (!skipExternalSeed) {
        await runTraceRichDemoSeedImpl({
          traceWindowEndMs: traceQuery.end
        });
      }

      return {
        traceManageDeepLinkRoute: buildRoutePath(TRACE_MANAGE_SMOKE_ROUTE, traceQuery)
      };
    }
  }
};

export function applySeedContextToRoute(route, seedState, seedContext = {}) {
  if (!route) {
    return route;
  }

  const config = SEED_STATE_CONFIG[seedState];
  if (!config) {
    return route;
  }

  if (typeof config.applyRoute === 'function') {
    return config.applyRoute(route, seedContext);
  }

  const resolvedId = seedContext[config.contextKey];
  if (!resolvedId) {
    return route;
  }

  return route.replace(config.routePattern, match => match.replace('/1', `/${resolvedId}`));
}

export function applySeedContextToRoutePair(routePair, seedContext = {}) {
  return {
    ...routePair,
    nextRoute: applySeedContextToRoute(routePair.nextRoute, routePair.seedState, seedContext),
    referenceRoute: applyReferenceRouteMode(
      applySeedContextToRoute(routePair.referenceRoute, routePair.seedState, seedContext),
      routePair.referenceRouteMode
    )
  };
}

export function routePairNeedsSeedContext(routePair) {
  const config = SEED_STATE_CONFIG[routePair.seedState];
  if (!config) {
    return false;
  }

  if (config.alwaysNeedsSeedContext) {
    return true;
  }

  return config.routePattern.test(routePair.nextRoute || '') || config.routePattern.test(routePair.referenceRoute || '');
}

export async function resolveSeedContext({
  seedState,
  authState,
  baseUrl,
  identifier,
  credential,
  skipExternalSeed = false,
  nowMs = Date.now(),
  loginWithPasswordImpl = loginWithPassword,
  requestMessageImpl = requestMessage,
  requireMessageDataImpl = requireMessageData,
  runTraceRichDemoSeedImpl = runTraceRichDemoSeed,
  buildTraceManageSmokeQueryImpl = buildTraceManageSmokeQuery
}) {
  const config = SEED_STATE_CONFIG[seedState];
  if (!config) {
    return {};
  }

  if (typeof config.resolveContext === 'function') {
    return config.resolveContext({
      seedState,
      authState,
      baseUrl,
      identifier,
      credential,
      skipExternalSeed,
      nowMs,
      loginWithPasswordImpl,
      requestMessageImpl,
      requireMessageDataImpl,
      runTraceRichDemoSeedImpl,
      buildTraceManageSmokeQueryImpl
    });
  }

  if (authState !== 'session') {
    return {};
  }

  const { token } = await loginWithPasswordImpl(baseUrl, identifier, credential, 0);
  let resolvedId = null;

  try {
    const payload = await requestMessageImpl(baseUrl, config.requestPath, { token });
    const data = requireMessageDataImpl(payload, `Resolve ${seedState}`);
    resolvedId = config.extractId(data);
  } catch (error) {
    if (!(error instanceof Error) || !error.message.includes('404') || !config.fallbackId) {
      throw error;
    }
  }

  if (!resolvedId) {
    if (!config.fallbackId) {
      throw new Error(`Seed state ${seedState} could not resolve a live fixture id.`);
    }
    resolvedId = config.fallbackId;
  }

  return {
    [config.contextKey]: String(resolvedId)
  };
}
