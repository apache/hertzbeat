import type { EntitySummaryInfo, PageResult } from '@/lib/types';
import { buildEntityUrl, normalizeEntityListPageSize, type EntityQueryState } from './query-state';

type ApiGetter = <T>(url: string) => Promise<T>;
type EntityListReader = <T = PageResult<EntitySummaryInfo>>(query: EntityQueryState) => Promise<T>;

export type EntityListPageTrim = {
  received: number;
  rendered: number;
};

export type BoundedEntityListPage = PageResult<EntitySummaryInfo> & {
  contentTrim?: EntityListPageTrim;
};

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

function normalizeEntityListPageResult(
  page: PageResult<EntitySummaryInfo>,
  query: EntityQueryState
): BoundedEntityListPage {
  const content = Array.isArray(page.content) ? page.content : [];
  const normalizedPageSize = Number.parseInt(normalizeEntityListPageSize(query.pageSize ?? page.pageSize), 10);
  if (content.length <= normalizedPageSize) {
    return page;
  }

  return {
    ...page,
    content: content.slice(0, normalizedPageSize),
    pageSize: normalizedPageSize,
    contentTrim: {
      received: content.length,
      rendered: normalizedPageSize
    }
  };
}

async function loadEntityListWithFallback(readList: () => Promise<PageResult<EntitySummaryInfo>>, query: EntityQueryState) {
  try {
    return normalizeEntityListPageResult(await readList(), query);
  } catch (error) {
    if (isNotFoundError(error)) {
      return buildEmptyEntityListPage();
    }
    throw error;
  }
}

export async function loadEntityList(apiGet: ApiGetter, query: EntityQueryState) {
  return loadEntityListWithFallback(() => apiGet<PageResult<EntitySummaryInfo>>(buildEntityUrl(query)), query);
}

export async function loadEntityListFromFacade(readEntityList: EntityListReader, query: EntityQueryState) {
  return loadEntityListWithFallback(() => readEntityList<PageResult<EntitySummaryInfo>>(query), query);
}
