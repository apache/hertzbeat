/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import { expect, it } from 'vitest';
import type { ExploreQuery } from './explore-model';
import { calculatedCatalogQuery } from './explore-calculated-source-catalog';

it('reads the raw field catalog in the same hard scope without projecting calculated search text', () => {
  const query = {
    signal: 'logs',
    logCalculatedV2: '{"version":2}',
    query: 'service:api OR #token:GET',
    searchSyntax: 'structured-v2',
    logSort: '{"field":"calculated:token"}',
    serviceName: 'api',
    start: 120001,
    end: 240000
  } as ExploreQuery;
  expect(calculatedCatalogQuery(query)).toMatchObject({
    query: '',
    searchSyntax: 'structured-v1',
    logCalculatedV2: undefined,
    logSort: undefined,
    serviceName: 'api',
    start: 120001,
    end: 240000
  });
});
