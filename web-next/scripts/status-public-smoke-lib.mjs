export const STATUS_PUBLIC_SMOKE_ROUTE = '/status';
export const STATUS_PUBLIC_SMOKE_ALIAS_ROUTE = '/status/public';

export function resolveStatusPublicSmokeApiBase(routeBaseUrl, apiBaseUrl = null, backendOrigin = null) {
  return apiBaseUrl || backendOrigin || routeBaseUrl || null;
}

export function buildStatusPublicDemoArgs(
  scriptPath,
  apiBaseUrl,
  identifier,
  credential,
  mode = 'seed-and-verify'
) {
  return [scriptPath, mode, apiBaseUrl, identifier, credential];
}
