import type { PageResult, Plugin } from '@/lib/types';
import { buildPluginUrl, type PluginQueryState } from './query-state';

type ApiGetter = <T>(url: string) => Promise<T>;
type ApiWriter = <T>(url: string, payload: unknown) => Promise<T>;
type ApiDelete = <T>(url: string) => Promise<T>;

export type PluginUploadDraft = {
  name: string;
  jarFileName: string;
  enableStatus: boolean;
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
    enableStatus: true
  };
}

function normalizePluginDraft(draft: PluginUploadDraft): PluginUploadDraft {
  return {
    name: draft.name.trim(),
    jarFileName: draft.jarFileName.trim(),
    enableStatus: draft.enableStatus
  };
}

export async function savePlugin(apiPost: ApiWriter, draft: PluginUploadDraft) {
  return apiPost('/plugin', normalizePluginDraft(draft));
}

export async function togglePluginStatus(apiPut: ApiWriter, plugin: Plugin) {
  return apiPut('/plugin', {
    ...plugin,
    enableStatus: !plugin.enableStatus
  });
}

export async function deletePlugin(apiDelete: ApiDelete, pluginId: number) {
  return apiDelete(`/plugin?ids=${pluginId}`);
}
