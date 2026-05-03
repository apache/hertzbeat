import type { CollectorSummary, PageResult } from '@/lib/types';
import { buildCollectorUrl, type CollectorQueryState } from './query-state';

type ApiGetter = <T>(url: string) => Promise<T>;

export async function loadCollectorData(apiGet: ApiGetter, query: CollectorQueryState) {
  const list = await apiGet<PageResult<CollectorSummary>>(buildCollectorUrl(query));
  return { list };
}
