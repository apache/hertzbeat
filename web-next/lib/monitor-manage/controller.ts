type ApiPost = <T>(url: string, payload: unknown) => Promise<T>;
type ApiGet = <T>(url: string) => Promise<T>;
type ApiDelete = <T>(url: string) => Promise<T>;

export function buildCopyMonitorUrl(monitorId: number | string) {
  return `/monitor/copy/${monitorId}`;
}

export async function copyMonitor(apiPost: ApiPost, monitorId: number | string) {
  return apiPost<unknown>(buildCopyMonitorUrl(monitorId), null);
}

export function buildEnableMonitorUrl(monitorId: number | string) {
  return `/monitors/manage?ids=${monitorId}`;
}

export function buildPauseMonitorUrl(monitorId: number | string) {
  return `/monitors/manage?ids=${monitorId}&type=JSON`;
}

export function buildEnableMonitorsUrl(ids: Array<number | string>) {
  const params = new URLSearchParams();
  ids.forEach(id => params.append('ids', String(id)));
  return `/monitors/manage?${params.toString()}`;
}

export function buildPauseMonitorsUrl(ids: Array<number | string>) {
  const params = new URLSearchParams();
  ids.forEach(id => params.append('ids', String(id)));
  params.append('type', 'JSON');
  return `/monitors/manage?${params.toString()}`;
}

export async function enableMonitor(apiGet: ApiGet, monitorId: number | string) {
  return apiGet<unknown>(buildEnableMonitorUrl(monitorId));
}

export async function pauseMonitor(apiDelete: ApiDelete, monitorId: number | string) {
  return apiDelete<unknown>(buildPauseMonitorUrl(monitorId));
}

export async function enableMonitors(apiGet: ApiGet, ids: Array<number | string>) {
  return apiGet<unknown>(buildEnableMonitorsUrl(ids));
}

export async function pauseMonitors(apiDelete: ApiDelete, ids: Array<number | string>) {
  return apiDelete<unknown>(buildPauseMonitorsUrl(ids));
}

export function buildDeleteMonitorsUrl(ids: Array<number | string>) {
  const params = new URLSearchParams();
  ids.forEach(id => params.append('ids', String(id)));
  return `/monitors?${params.toString()}`;
}

export async function deleteMonitors(apiDelete: ApiDelete, ids: Array<number | string>) {
  return apiDelete<unknown>(buildDeleteMonitorsUrl(ids));
}

export function buildDeleteGrafanaDashboardUrl(monitorId: number | string) {
  return `/grafana/dashboard?monitorId=${monitorId}`;
}

export async function deleteGrafanaDashboard(apiDelete: ApiDelete, monitorId: number | string) {
  return apiDelete<unknown>(buildDeleteGrafanaDashboardUrl(monitorId));
}

export function buildImportMonitorsUrl() {
  return '/monitors/import';
}

export function buildExportMonitorsUrl(ids: Array<number | string>, type: 'JSON' | 'EXCEL') {
  const params = new URLSearchParams();
  ids.forEach(id => params.append('ids', String(id)));
  params.append('type', type);
  return `/monitors/export?${params.toString()}`;
}

export function buildExportAllMonitorsUrl(type: 'JSON' | 'EXCEL') {
  return `/monitors/export/all?type=${type}`;
}

export function resolveDownloadFilename(contentDisposition: string | null | undefined, fallback: string) {
  if (!contentDisposition) return fallback;
  const match = contentDisposition.match(/filename="?([^";]+)"?/i);
  return match?.[1] || fallback;
}
