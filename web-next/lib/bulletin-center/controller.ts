import type { Bulletin, BulletinMetricsData, PageResult } from '@/lib/types';
import { buildBulletinListUrl } from './query-state';

type ApiGetter = <T>(url: string) => Promise<T>;
type ApiMutator = <T>(url: string, payload?: unknown) => Promise<T>;
type BulletinPayload = Omit<Bulletin, 'id'> & { id?: number };

export type BulletinFormDraft = {
  id?: number;
  name: string;
  app: string;
  monitorIdsText: string;
  fieldsJson: string;
};

export async function loadBulletinData(apiGet: ApiGetter, search: string) {
  const list = await apiGet<PageResult<Bulletin>>(buildBulletinListUrl(search));
  return { list };
}

export function buildBulletinMetricsUrl(id: number) {
  return `/bulletin/metrics?id=${id}`;
}

export async function loadBulletinMetrics(apiGet: ApiGetter, id: number) {
  return apiGet<BulletinMetricsData>(buildBulletinMetricsUrl(id));
}

function parseMonitorIds(text: string) {
  return text
    .split(',')
    .map(item => Number.parseInt(item.trim(), 10))
    .filter(id => Number.isFinite(id));
}

export function buildBulletinPayload(draft: BulletinFormDraft): BulletinPayload {
  return {
    ...(draft.id ? { id: draft.id } : {}),
    name: draft.name.trim(),
    app: draft.app.trim(),
    monitorIds: parseMonitorIds(draft.monitorIdsText),
    fields: draft.fieldsJson.trim() ? JSON.parse(draft.fieldsJson) : {},
  };
}

export async function createBulletin(apiPost: ApiMutator, draft: BulletinFormDraft) {
  return apiPost<void>('/bulletin', buildBulletinPayload(draft));
}

export async function updateBulletin(apiPut: ApiMutator, draft: BulletinFormDraft) {
  return apiPut<void>('/bulletin', buildBulletinPayload(draft));
}

export async function deleteBulletins(apiDelete: ApiMutator, ids: number[]) {
  const params = new URLSearchParams();
  ids.forEach(id => params.append('ids', String(id)));
  return apiDelete<void>(`/bulletin?${params.toString()}`);
}

export async function deleteBulletin(apiDelete: ApiMutator, id: number) {
  return deleteBulletins(apiDelete, [id]);
}
