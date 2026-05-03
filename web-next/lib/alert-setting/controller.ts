import type { AlertDefine, PageResult } from '@/lib/types';
import { buildDefineListUrl } from '../setting-define/query-state';

type ApiGetter = <T>(url: string) => Promise<T>;
type ApiMutator = <T>(url: string, payload?: unknown) => Promise<T>;

export type DatasourceStatusPayload = {
  code: number;
  msg?: string;
  data?: Record<string, unknown>;
};

export type AlertSettingPageData = {
  list: PageResult<AlertDefine>;
  datasourceStatus: DatasourceStatusPayload;
};

export async function loadAlertSettingData(
  apiGet: ApiGetter,
  apiMessageGet: ApiGetter,
  search = ''
): Promise<AlertSettingPageData> {
  const [list, datasourceStatus] = await Promise.all([
    apiMessageGet<PageResult<AlertDefine>>(buildDefineListUrl(search)),
    apiGet<DatasourceStatusPayload>('/alert/define/datasource/status')
  ]);

  return { list, datasourceStatus };
}

export async function loadAlertDefineDetail(apiMessageGet: ApiGetter, id: number) {
  return apiMessageGet<AlertDefine>(`/alert/define/${id}`);
}

export function buildAlertDefineDeleteUrl(ids: number | number[]) {
  const params = new URLSearchParams();
  const values = Array.isArray(ids) ? ids : [ids];
  values.forEach(id => params.append('ids', String(id)));
  return `/alert/defines?${params.toString()}`;
}

export async function deleteAlertDefine(apiDelete: ApiMutator, id: number) {
  return apiDelete<void>(buildAlertDefineDeleteUrl(id));
}

export async function deleteAlertDefines(apiDelete: ApiMutator, ids: number[]) {
  return apiDelete<void>(buildAlertDefineDeleteUrl(ids));
}

export async function updateAlertDefineEnabled(apiPut: ApiMutator, define: AlertDefine, enabled: boolean) {
  return apiPut<void>('/alert/define', {
    ...define,
    enable: enabled
  });
}
