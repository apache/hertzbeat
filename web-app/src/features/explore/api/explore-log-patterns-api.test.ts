/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import { expect, it } from 'vitest';
import { buildLogPatternSamplePath } from './explore-log-patterns-api';
import type { LogExploreQuery } from '../model/explore-query';

const query: LogExploreQuery = {
  signal: 'logs',
  timeRange: 'last-30m',
  serviceName: 'checkout',
  environment: 'demo',
  query: 'payment',
  searchSyntax: 'structured-v1',
  severityCategory: 'ERROR',
  logAggregation: 'patterns'
};

it('samples the applied search with exact scope, window and newest ordering', () => {
  const path = buildLogPatternSamplePath(query, { from: 1000, to: 2000 });
  const url = new URL(path, 'http://local');
  expect(url.pathname).toBe('/api/logs/list');
  expect(Object.fromEntries(url.searchParams)).toMatchObject({
    serviceName: 'checkout',
    environment: 'demo',
    search: 'payment',
    searchSyntax: 'structured-v1',
    severityCategory: 'ERROR',
    start: '1000',
    end: '2000',
    sort: 'newest',
    pageIndex: '0',
    pageSize: '1000'
  });
});
