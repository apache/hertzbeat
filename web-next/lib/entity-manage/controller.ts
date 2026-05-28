import type { EntitySummaryInfo, PageResult } from '@/lib/types';
import { buildEntityUrl, type EntityQueryState } from './query-state';

type ApiGetter = <T>(url: string) => Promise<T>;
type EntityListReader = <T = PageResult<EntitySummaryInfo>>(query: EntityQueryState) => Promise<T>;

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

async function loadEntityListWithFallback(readList: () => Promise<PageResult<EntitySummaryInfo>>) {
  try {
    return await readList();
  } catch (error) {
    if (isNotFoundError(error)) {
      return buildEmptyEntityListPage();
    }
    throw error;
  }
}

export async function loadEntityList(apiGet: ApiGetter, query: EntityQueryState) {
  return loadEntityListWithFallback(() => apiGet<PageResult<EntitySummaryInfo>>(buildEntityUrl(query)));
}

export async function loadEntityListFromFacade(readEntityList: EntityListReader, query: EntityQueryState) {
  return loadEntityListWithFallback(() => readEntityList<PageResult<EntitySummaryInfo>>(query));
}
