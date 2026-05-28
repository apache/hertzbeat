import type { AlertDefine, PageResult } from '@/lib/types';
import { buildDefineListUrl, type AlertSettingAppEntry } from './query-state';

type ApiGetter = <T>(url: string) => Promise<T>;
type ApiMutator = <T>(url: string, payload?: unknown) => Promise<T>;
type AlertDefineReader = (id: number) => Promise<AlertDefine>;
type AlertDefineWriter = (payload: unknown) => Promise<unknown>;
type AlertDefineDeleter = (ids: number[]) => Promise<unknown>;
type AlertSettingReaders = {
  list: (search?: string, pageIndex?: number, pageSize?: number, appEntries?: AlertSettingAppEntry[]) => Promise<PageResult<AlertDefine>>;
  datasourceStatus: () => Promise<DatasourceStatusPayload>;
};

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
  search = '',
  pageIndex = 0,
  pageSize = 8,
  appEntries: AlertSettingAppEntry[] = []
): Promise<AlertSettingPageData> {
  const [list, datasourceStatus] = await Promise.all([
    apiMessageGet<PageResult<AlertDefine>>(buildDefineListUrl(search, pageIndex, pageSize, appEntries)),
    apiGet<DatasourceStatusPayload>('/alert/define/datasource/status')
  ]);

  return { list, datasourceStatus };
}

export async function loadAlertSettingDataFromFacade(
  readers: AlertSettingReaders,
  search = '',
  pageIndex = 0,
  pageSize = 8,
  appEntries: AlertSettingAppEntry[] = []
): Promise<AlertSettingPageData> {
  const [list, datasourceStatus] = await Promise.all([
    readers.list(search, pageIndex, pageSize, appEntries),
    readers.datasourceStatus()
  ]);

  return { list, datasourceStatus };
}

export async function loadAlertDefineDetail(apiMessageGet: ApiGetter, id: number) {
  return apiMessageGet<AlertDefine>(`/alert/define/${id}`);
}

export async function loadAlertDefineDetailFromFacade(readDetail: AlertDefineReader, id: number) {
  return readDetail(id);
}

export function buildAlertDefineDeleteUrl(ids: number | number[]) {
  const params = new URLSearchParams();
  const values = Array.isArray(ids) ? ids : [ids];
  values.forEach(id => params.append('ids', String(id)));
  return `/alert/defines?${params.toString()}`;
}

export function buildAlertDefineExportUrl(ids: number | number[], type: 'JSON' | 'EXCEL') {
  const params = new URLSearchParams();
  const values = Array.isArray(ids) ? ids : [ids];
  values.forEach(id => params.append('ids', String(id)));
  params.append('type', type);
  return `/alert/defines/export?${params.toString()}`;
}

export function buildAlertDefineImportUrl() {
  return '/alert/defines/import';
}

export async function deleteAlertDefine(apiDelete: ApiMutator, id: number) {
  return apiDelete<void>(buildAlertDefineDeleteUrl(id));
}

export async function deleteAlertDefines(apiDelete: ApiMutator, ids: number[]) {
  return apiDelete<void>(buildAlertDefineDeleteUrl(ids));
}

export async function deleteAlertDefineFromFacade(deleteDefines: AlertDefineDeleter, id: number) {
  return deleteDefines([id]);
}

export async function deleteAlertDefinesFromFacade(deleteDefines: AlertDefineDeleter, ids: number[]) {
  return deleteDefines(ids);
}

export async function createAlertDefineFromFacade(createDefine: AlertDefineWriter, payload: unknown) {
  return createDefine(payload);
}

export async function updateAlertDefineFromFacade(updateDefine: AlertDefineWriter, payload: unknown) {
  return updateDefine(payload);
}

export async function updateAlertDefineEnabled(apiPut: ApiMutator, define: AlertDefine, enabled: boolean) {
  return apiPut<void>('/alert/define', {
    ...define,
    enable: enabled
  });
}

export async function updateAlertDefineEnabledFromFacade(
  updateDefine: AlertDefineWriter,
  define: AlertDefine,
  enabled: boolean
) {
  return updateDefine({
    ...define,
    enable: enabled
  });
}
