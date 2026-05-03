import type { EntitySummaryInfo, PageResult } from '@/lib/types';
import { buildEntityUrl, type EntityQueryState } from './query-state';

type ApiGetter = <T>(url: string) => Promise<T>;

export function buildEmptyEntityListPage(pageIndex = 0, pageSize = 8): PageResult<EntitySummaryInfo> {
  return {
    content: [],
    totalElements: 0,
    pageIndex,
    pageSize
  };
}

function isNotFoundError(error: unknown) {
  return error instanceof Error && error.message.includes('404');
}

export async function loadEntityList(apiGet: ApiGetter, query: EntityQueryState) {
  try {
    return await apiGet<PageResult<EntitySummaryInfo>>(buildEntityUrl(query));
  } catch (error) {
    if (isNotFoundError(error)) {
      return buildEmptyEntityListPage();
    }
    throw error;
  }
}
