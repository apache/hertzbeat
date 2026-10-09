/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import type { ExploreQuery } from './explore-model';

export function calculatedCatalogQuery(query: ExploreQuery): ExploreQuery {
  return query.signal === 'logs' && query.logCalculatedV2 !== undefined
    ? { ...query, query: '', searchSyntax: 'structured-v1', logCalculatedV2: undefined, logSort: undefined }
    : query;
}
