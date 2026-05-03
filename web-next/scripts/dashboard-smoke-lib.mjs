export const DASHBOARD_SMOKE_ROUTE = '/dashboard';
export const OVERVIEW_SMOKE_ROUTE = '/overview';
export const DASHBOARD_SMOKE_QUERY = {
  start: '10',
  end: '20',
  entityId: '7',
  entityName: 'checkout',
  returnTo: '/monitors',
  serviceName: 'checkout',
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

export function buildDashboardProtectedRoute() {
  return buildRoutePath(DASHBOARD_SMOKE_ROUTE, DASHBOARD_SMOKE_QUERY);
}

export async function runDashboardSmoke({ baseUrl, assertRouteLoads }) {
  const dashboardAlias = await assertRouteLoads(baseUrl, buildDashboardProtectedRoute(), {
    expectedPath: OVERVIEW_SMOKE_ROUTE,
    expectedQuery: DASHBOARD_SMOKE_QUERY
  });

  return {
    baseUrl,
    dashboardAlias
  };
}
