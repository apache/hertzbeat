import type { ObjectStoreConfig } from '@/lib/types';

type ApiGetter = <T>(url: string) => Promise<T>;
type ApiPoster = <T>(url: string, payload: unknown) => Promise<T>;

export async function loadObjectStoreConfig(apiGet: ApiGetter) {
  const config = await apiGet<ObjectStoreConfig>('/config/oss');
  return { config };
}

export async function saveObjectStoreConfig(apiPost: ApiPoster, config: ObjectStoreConfig) {
  return apiPost<string>('/config/oss', config);
}
