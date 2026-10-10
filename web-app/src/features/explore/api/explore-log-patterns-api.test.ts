/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License.  You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

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
