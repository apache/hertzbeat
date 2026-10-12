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
import type { LogExploreQuery } from '../model/explore-query';
import {
  buildSubqueryPageRequest,
  buildSubqueryTrendRequest,
  buildSubqueryFacetRequest,
  buildSubqueryAnalysisRequest,
  parseSubqueryPageResponse,
  parseSubqueryTrendResponse,
  parseSubqueryFacetResponse,
  parseSubqueryAnalysisResponse
} from './explore-log-subquery-api';

const subquery = JSON.stringify({
  version: 1,
  mainField: 'builtin:serviceName',
  operator: 'in',
  child: { field: 'builtin:serviceName', searchSyntax: 'structured-v1', search: 'service:node_repl' },
  rank: { direction: 'top', limit: 10, measure: { function: 'count_all' } }
});

it('uses the same filtered domain for facet values and grouped analysis', () => {
  const facet = buildSubqueryFacetRequest(query, 'attribute:host.name');
  expect(facet.parameters).toEqual(buildSubqueryPageRequest(query).parameters);
  expect(facet.operation).toEqual({ kind: 'facet', field: 'attribute:host.name', limit: 20 });
  const facetResponse = {
    version: 1,
    window: { start: 120_001, end: 240_000 },
    executed: { parameters: facet.parameters, subquery: facet.subquery, operation: facet.operation },
    result: {
      kind: 'facet',
      field: 'attribute:host.name',
      matchingTotal: 3,
      missingOrNullCount: 0,
      values: [{ value: 'codex-app-server', count: 3 }],
      truncated: false
    }
  };
  expect(parseSubqueryFacetResponse(facetResponse, facet).result.matchingTotal).toBe(3);
  expect(() =>
    parseSubqueryFacetResponse({ ...facetResponse, result: { ...facetResponse.result, matchingTotal: 2 } }, facet)
  ).toThrow();
  const analysisQuery = {
    ...query,
    logAnalysis: JSON.stringify({
      version: 1,
      representation: 'timeseries',
      field: 'builtin:serviceName',
      limit: 20,
      order: 'count-desc',
      minCount: 1
    })
  };
  const analysis = buildSubqueryAnalysisRequest(analysisQuery);
  expect(analysis.parameters).toEqual(facet.parameters);
  const analysisResponse = {
    version: 1,
    window: { start: 120_001, end: 240_000 },
    executed: { parameters: analysis.parameters, subquery: analysis.subquery, operation: analysis.operation },
    result: {
      kind: 'analysis',
      view: 'timeseries',
      matchingTotal: 3,
      truncated: false,
      intervalMs: analysis.operation.intervalMs,
      groups: [
        {
          keys: [{ field: 'builtin:serviceName', kind: 'value', value: 'codex-app-server' }],
          count: 3,
          measurement: null,
          buckets: [
            { start: 120_000, count: 1, measurement: null },
            { start: 180_000, count: 1, measurement: null },
            { start: 240_000, count: 1, measurement: null }
          ]
        }
      ]
    }
  };
  expect(parseSubqueryAnalysisResponse(analysisResponse, analysis).result.groups[0]?.count).toBe(3);
});
it('omits only a simple selected facet clause while retaining the child set filter', () => {
  const facet = buildSubqueryFacetRequest(query, 'builtin:serviceName');
  expect(facet.parameters.search).toBeUndefined();
  expect(facet.subquery.child.search).toBe('service:node_repl');
});
const query: LogExploreQuery = {
  signal: 'logs',
  timeRange: 'last-1h',
  start: 120_001,
  end: 240_000,
  timeZone: 'UTC',
  serviceName: 'trusted',
  query: 'service:codex-app-server',
  searchSyntax: 'structured-v1',
  logSubquery: subquery
};

it('keeps main and child searches independent under the same hard scope', () => {
  const request = buildSubqueryPageRequest(query);
  expect(request.parameters).toMatchObject({
    start: '120001',
    end: '240000',
    serviceName: 'trusted',
    search: 'service:codex-app-server',
    searchSyntax: 'structured-v1'
  });
  expect(request.subquery.child).toEqual({
    field: 'builtin:serviceName',
    searchSyntax: 'structured-v1',
    search: 'service:node_repl'
  });
  expect(request.subquery).not.toHaveProperty('serviceName');
  expect(request.parameters).not.toHaveProperty('logSort');
});

it('sends a distinct-count metric field through every subquery request', () => {
  const distinctQuery = {
    ...query,
    logSubquery: JSON.stringify({
      version: 1,
      mainField: 'builtin:serviceName',
      operator: 'in',
      child: { field: 'builtin:serviceName', searchSyntax: 'structured-v1', search: 'service:api' },
      rank: { direction: 'top', limit: 5, measure: { function: 'count_distinct', field: 'resource:host.name' } }
    })
  };
  const request = buildSubqueryPageRequest(distinctQuery);
  expect(request.subquery.rank.measure).toEqual({ function: 'count_distinct', field: 'resource:host.name' });
  const response = {
    version: 1,
    window: { start: 120_001, end: 240_000 },
    executed: { parameters: request.parameters, subquery: request.subquery, operation: request.operation },
    result: { kind: 'page', totalElements: 0, rows: [] }
  };
  expect(parseSubqueryPageResponse(response, request).executed.subquery.rank.measure).toEqual(
    request.subquery.rank.measure
  );
});

it('checks the page and trend against the exact executed set filter and full population', () => {
  const page = buildSubqueryPageRequest(query);
  const executed = { parameters: page.parameters, subquery: page.subquery, operation: page.operation };
  const response = {
    version: 1,
    window: { start: 120_001, end: 240_000 },
    executed,
    result: { kind: 'page', totalElements: 0, rows: [] }
  };
  expect(parseSubqueryPageResponse(response, page).result.totalElements).toBe(0);
  expect(() =>
    parseSubqueryPageResponse(
      { ...response, executed: { ...executed, subquery: { ...page.subquery, operator: 'not_in' } } },
      page
    )
  ).toThrow();
  const trend = buildSubqueryTrendRequest(query);
  expect(trend.parameters).toEqual(page.parameters);
  expect(
    parseSubqueryTrendResponse(
      {
        ...response,
        executed: { ...executed, operation: trend.operation },
        result: {
          kind: 'trend',
          intervalMs: trend.operation.intervalMs,
          matchingTotal: 0,
          buckets: [
            { start: 120_000, count: 0 },
            { start: 180_000, count: 0 },
            { start: 240_000, count: 0 }
          ]
        }
      },
      trend
    ).result.matchingTotal
  ).toBe(0);
});

it('binds severity set complements across page, trend and facet responses, including empty sets', () => {
  const log = {
    logRecordUid: 'event-1',
    timeUnixNano: '1750000000000000000',
    observedTimeUnixNano: null,
    severityNumber: 17,
    severityText: 'ERROR',
    body: 'sample',
    attributes: {},
    droppedAttributesCount: 0,
    traceId: null,
    spanId: null,
    traceFlags: null,
    resource: {},
    resourceSchemaUrl: null,
    instrumentationScope: null,
    scopeSchemaUrl: null
  };
  for (const operator of ['in', 'not_in'] as const) {
    const severityQuery = {
      ...query,
      logSubquery: JSON.stringify({
        version: 1,
        mainField: 'builtin:severityCategory',
        operator,
        child: { field: 'builtin:severityCategory', searchSyntax: 'structured-v1', search: 'status:ERROR' },
        rank: { direction: 'top', limit: 10, measure: { function: 'count_all' } }
      })
    };
    const page = buildSubqueryPageRequest(severityQuery);
    const trend = buildSubqueryTrendRequest(severityQuery);
    const facet = buildSubqueryFacetRequest(severityQuery, 'builtin:severityCategory');
    for (const total of [2, 0]) {
      const window = { start: 120_001, end: 240_000 };
      const rows = Array.from({ length: total }, (_, index) => ({
        log: { ...log, logRecordUid: `event-${index + 1}` },
        derived: {}
      }));
      const cases = [
        {
          request: page,
          parse: parseSubqueryPageResponse,
          result: { kind: 'page', totalElements: total, rows }
        },
        {
          request: trend,
          parse: parseSubqueryTrendResponse,
          result: {
            kind: 'trend',
            intervalMs: trend.operation.intervalMs,
            matchingTotal: total,
            buckets: [120_000, 180_000, 240_000].map((start, index) => ({ start, count: index === 0 ? total : 0 }))
          }
        },
        {
          request: facet,
          parse: parseSubqueryFacetResponse,
          result: {
            kind: 'facet',
            field: facet.operation.field,
            matchingTotal: total,
            missingOrNullCount: 0,
            values: total ? [{ value: operator === 'in' ? 'ERROR' : 'INFO', count: total }] : [],
            truncated: false
          }
        }
      ] as const;
      for (const { request, parse, result } of cases) {
        const response = {
          version: 1,
          window,
          executed: { parameters: request.parameters, subquery: request.subquery, operation: request.operation },
          result
        };
        expect(() => parse(response, request as never)).not.toThrow();
        expect(() =>
          parse(
            {
              ...response,
              executed: {
                ...response.executed,
                subquery: { ...request.subquery, operator: operator === 'in' ? 'not_in' : 'in' }
              }
            },
            request as never
          )
        ).toThrow();
      }
    }
  }
});
