import type { PageResult, ParamDefine, Plugin } from '@/lib/types';
import { buildPluginUrl, type PluginQueryState } from './query-state';

type ApiGetter = <T>(url: string) => Promise<T>;
type ApiWriter = <T>(url: string, payload: unknown) => Promise<T>;
type ApiDelete = <T>(url: string) => Promise<T>;

export type PluginUploadDraft = {
  name: string;
  jarFileName: string;
  jarFile?: Blob | null;
  enableStatus: boolean;
};

export type PluginUploadValidation = {
  name: boolean;
  jarFile: boolean;
};

export type PluginParamValue = {
  pluginMetadataId: number;
  type: 0 | 1 | 2 | 3;
  field: string;
  paramValue: unknown;
};

export type PluginParamDraft = {
  plugin: Plugin;
  paramDefines: ParamDefine[];
  params: Record<string, PluginParamValue>;
};

export type PluginParamDefineResponse = {
  paramDefines?: ParamDefine[];
  pluginParams?: Array<{
    field?: string;
    paramValue?: unknown;
  }>;
};

export async function loadPluginData(apiGet: ApiGetter, query: PluginQueryState) {
  const list = await apiGet<PageResult<Plugin>>(buildPluginUrl(query));
  return { list };
}

export type PluginManagePageData = Awaited<ReturnType<typeof loadPluginData>>;

export function createEmptyPluginDraft(): PluginUploadDraft {
  return {
    name: '',
    jarFileName: '',
    jarFile: null,
    enableStatus: true
  };
}

export function validatePluginUploadDraft(draft: PluginUploadDraft): PluginUploadValidation {
  return {
    name: draft.name.length > 0,
    jarFile: Boolean(draft.jarFile)
  };
}

export function buildPluginUploadFormData(draft: PluginUploadDraft): FormData {
  const formData = new FormData();
  formData.append('name', draft.name);
  if (draft.jarFile) formData.append('jarFile', draft.jarFile, draft.jarFileName || 'plugin.jar');
  formData.append('enableStatus', String(draft.enableStatus));
  return formData;
}

export async function savePlugin(apiPost: ApiWriter, draft: PluginUploadDraft) {
  return apiPost('/plugin', buildPluginUploadFormData(draft));
}

export function buildPluginParamDefineUrl(pluginId: number) {
  return `/plugin/params/define?pluginMetadataId=${pluginId}`;
}

export function resolvePluginParamTypeCode(type?: string): PluginParamValue['type'] {
  if (type === 'number') return 0;
  if (type === 'text' || type === 'string') return 1;
  if (type === 'json') return 3;
  return 2;
}

export function resolvePluginParamLabel(define: ParamDefine, locale: string): string {
  if (typeof define.name === 'string') return define.name;
  if (define.name && typeof define.name === 'object') {
    return define.name[locale] ?? define.name['zh-CN'] ?? define.name['en-US'] ?? define.field;
  }
  return define.field;
}

export function buildPluginParamDraft(plugin: Plugin, data: PluginParamDefineResponse, locale: string): PluginParamDraft {
  const pluginParams = new Map((data.pluginParams ?? []).map(param => [param.field, param.paramValue]));
  const paramDefines = (data.paramDefines ?? []).map(define => ({
    ...define,
    name: resolvePluginParamLabel(define, locale)
  }));
  const params = Object.fromEntries(
    paramDefines.map(define => [
      define.field,
      {
        pluginMetadataId: plugin.id,
        type: resolvePluginParamTypeCode(define.type),
        field: define.field,
        paramValue: pluginParams.has(define.field) ? pluginParams.get(define.field) : null
      }
    ])
  );
  return {
    plugin,
    paramDefines,
    params
  };
}

export async function loadPluginParamDraft(apiGet: ApiGetter, plugin: Plugin, locale: string) {
  const data = await apiGet<PluginParamDefineResponse>(buildPluginParamDefineUrl(plugin.id));
  return buildPluginParamDraft(plugin, data, locale);
}

export function updatePluginParamDraft(draft: PluginParamDraft, field: string, paramValue: unknown): PluginParamDraft {
  const current = draft.params[field];
  if (!current) return draft;
  return {
    ...draft,
    params: {
      ...draft.params,
      [field]: {
        ...current,
        paramValue
      }
    }
  };
}

export async function savePluginParams(apiPost: ApiWriter, params: Record<string, PluginParamValue>) {
  return apiPost('/plugin/params', Object.values(params));
}

export async function togglePluginStatus(apiPut: ApiWriter, plugin: Plugin) {
  return apiPut('/plugin', {
    ...plugin,
    enableStatus: !plugin.enableStatus
  });
}

export async function deletePlugin(apiDelete: ApiDelete, pluginId: number) {
  return deletePlugins(apiDelete, [pluginId]);
}

export async function deletePlugins(apiDelete: ApiDelete, pluginIds: number[]) {
  const params = new URLSearchParams();
  pluginIds.forEach(id => {
    params.append('ids', String(id));
  });
  return apiDelete(`/plugin?${params.toString()}`);
}

export function clampPluginPageIndexAfterDelete({
  pageIndex,
  pageSize,
  totalElements,
  deleteCount
}: {
  pageIndex: number;
  pageSize: number;
  totalElements: number;
  deleteCount: number;
}): number {
  const safePageSize = Math.max(1, pageSize);
  const lastPage = Math.max(1, Math.ceil((Math.max(0, totalElements) - Math.max(0, deleteCount)) / safePageSize));
  return Math.min(Math.max(1, pageIndex), lastPage) - 1;
}
