export const LOG_MANAGE_SMOKE_ROUTE = '/log/manage';
export const LOG_STREAM_SMOKE_ALIAS_ROUTE = '/log/stream';
export const LOG_INTEGRATION_SMOKE_ALIAS_ROUTE = '/log/integration';
export const LOG_INTEGRATION_SOURCE_SMOKE_ALIAS_ROUTE = '/log/integration/webhook';

export const LOG_MANAGE_SMOKE_BOOKMARK_QUERY = {
  search: 'checkout timeout',
  traceId: 'trace-123',
  severityText: 'ERROR',
  start: '10',
  end: '20',
  returnTo: '/overview'
};

const signalDeskContext = {
  traceId: 'trace-123',
  spanId: 'span-456',
  start: '10',
  end: '20',
  entityId: '7',
  entityName: 'Checkout API',
  returnTo: '/overview',
  serviceName: 'checkout',
  serviceNamespace: 'payments',
  environment: 'prod'
};

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

export function buildLogManageProtectedRoute() {
  return buildRoutePath(LOG_MANAGE_SMOKE_ROUTE, LOG_MANAGE_SMOKE_BOOKMARK_QUERY);
}

export function buildLogManageResetExpectedQuery() {
  return {
    view: 'list',
    start: LOG_MANAGE_SMOKE_BOOKMARK_QUERY.start,
    end: LOG_MANAGE_SMOKE_BOOKMARK_QUERY.end,
    returnTo: LOG_MANAGE_SMOKE_BOOKMARK_QUERY.returnTo
  };
}

export async function runLogManageSmoke({ baseUrl, assertRouteLoads }) {
  const manageRoute = await assertRouteLoads(baseUrl, buildRoutePath(LOG_MANAGE_SMOKE_ROUTE, LOG_MANAGE_SMOKE_BOOKMARK_QUERY), {
    expectedPath: LOG_MANAGE_SMOKE_ROUTE,
    expectedQuery: LOG_MANAGE_SMOKE_BOOKMARK_QUERY
  });

  const streamAlias = await assertRouteLoads(
    baseUrl,
    buildRoutePath(LOG_STREAM_SMOKE_ALIAS_ROUTE, {
      content: 'checkout timeout',
      severityText: 'ERROR',
      ...signalDeskContext
    }),
    {
      expectedPath: LOG_MANAGE_SMOKE_ROUTE,
      expectedQuery: {
        search: 'checkout timeout',
        severityText: 'ERROR',
        view: 'stream',
        ...signalDeskContext
      }
    }
  );

  const integrationAlias = await assertRouteLoads(
    baseUrl,
    buildRoutePath(LOG_INTEGRATION_SMOKE_ALIAS_ROUTE, {
      content: 'webhook',
      ...signalDeskContext
    }),
    {
      expectedPath: LOG_MANAGE_SMOKE_ROUTE,
      expectedQuery: {
        search: 'webhook',
        ...signalDeskContext
      }
    }
  );

  const integrationSourceAlias = await assertRouteLoads(
    baseUrl,
    buildRoutePath(LOG_INTEGRATION_SOURCE_SMOKE_ALIAS_ROUTE, signalDeskContext),
    {
      expectedPath: LOG_MANAGE_SMOKE_ROUTE,
      expectedQuery: {
        search: 'webhook',
        ...signalDeskContext
      }
    }
  );

  return {
    baseUrl,
    manageRoute,
    streamAlias,
    integrationAlias,
    integrationSourceAlias
  };
}
