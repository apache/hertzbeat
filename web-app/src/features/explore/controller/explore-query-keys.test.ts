/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { describe, expect, it } from 'vitest';

import type { QueryContext } from '@/shared/query-context';

import type { ExploreQuery } from '../model/explore-model';
import controllerSource from './use-explore-page-controller.ts?raw';
import traceDetailControllerSource from './use-trace-detail-controller.ts?raw';
import { exploreQueryKeys } from './explore-query-keys';

const context: QueryContext = {
  collectorId: 'collector-east',
  serviceName: 'checkout',
  serviceNamespace: 'commerce',
  environment: 'prod',
  instance: 'checkout-1',
  endpoint: '/checkout'
};
const window = { from: 1_000, to: 2_000 };
const sharedQuery = {
  timeRange: 'last-30m',
  ...context,
  query: 'checkout',
  start: window.from,
  end: window.to
} as const;
const metricQuery: ExploreQuery = {
  ...sharedQuery,
  signal: 'metrics',
  query: 'rate(requests_total[5m])',
  metricFilter: 'status=500',
  groupBy: 'service.name',
  aggregation: 'sum',
  step: '30s'
};

describe('Explore Query Key factory', () => {
  it('builds trace detail identity from both evidence scope and trace id', () => {
    expect(exploreQueryKeys.detail('scope-a', undefined)).toEqual(['trace-detail', 'scope-a', undefined]);
    expect(exploreQueryKeys.detail('scope-a', 'trace-1')).toEqual(['trace-detail', 'scope-a', 'trace-1']);
    expect(exploreQueryKeys.detail('scope-a', 'trace-2')).not.toEqual(exploreQueryKeys.detail('scope-a', 'trace-1'));
    expect(exploreQueryKeys.detail('scope-b', 'trace-1')).not.toEqual(exploreQueryKeys.detail('scope-a', 'trace-1'));
  });

  it('builds one explicit metrics history identity', () => {
    expect(exploreQueryKeys.history(metricQuery, window, 3)).toEqual([
      'explore-history',
      {
        context: 'collector-east\u001fcheckout\u001fcommerce\u001fprod\u001fcheckout-1\u001f/checkout',
        window: '1000:2000',
        refreshRevision: 3
      },
      'metrics',
      {
        relativeTimeRange: undefined,
        query: 'rate(requests_total[5m])',
        metricFilter: 'status=500',
        groupBy: 'service.name',
        aggregation: 'sum',
        step: '30s'
      }
    ]);
    expect(exploreQueryKeys.history({ ...metricQuery }, { ...window }, 3)).toEqual(
      exploreQueryKeys.history(metricQuery, window, 3)
    );
  });

  it('excludes route-only state and keeps a relative range only without an exact window', () => {
    expect(exploreQueryKeys.history({ ...metricQuery, timeRange: 'last-1h' }, window, 3)).toEqual(
      exploreQueryKeys.history(metricQuery, window, 3)
    );

    const logs: ExploreQuery = { ...sharedQuery, signal: 'logs' };
    expect(exploreQueryKeys.history({ ...logs, live: true }, window, 3)).toEqual(
      exploreQueryKeys.history(logs, window, 3)
    );
    expect(exploreQueryKeys.history({ ...metricQuery, timeRange: 'last-1h' }, undefined, 3)).not.toEqual(
      exploreQueryKeys.history(metricQuery, undefined, 3)
    );
  });

  it('separates scope, time window, and manual refresh inputs', () => {
    const current = exploreQueryKeys.history(metricQuery, window, 3);
    for (const [field, value] of [
      ['collectorId', 'collector-west'],
      ['serviceName', 'payments'],
      ['serviceNamespace', 'finance'],
      ['environment', 'staging'],
      ['instance', 'checkout-2'],
      ['endpoint', '/payments']
    ] as const) {
      expect(exploreQueryKeys.history({ ...metricQuery, [field]: value }, window, 3)).not.toEqual(current);
    }
    expect(exploreQueryKeys.history(metricQuery, { ...window, from: 999 }, 3)).not.toEqual(current);
    expect(exploreQueryKeys.history(metricQuery, { ...window, to: 2_001 }, 3)).not.toEqual(current);
    expect(exploreQueryKeys.history(metricQuery, window, 4)).not.toEqual(current);
  });

  it('includes every signal-specific backend query input', () => {
    const metrics = exploreQueryKeys.history(metricQuery, window, 3);
    for (const [field, value] of [
      ['query', 'sum(memory_bytes)'],
      ['metricFilter', 'region=west'],
      ['groupBy', 'service.namespace'],
      ['aggregation', 'max'],
      ['step', '1m']
    ] as const) {
      expect(exploreQueryKeys.history({ ...metricQuery, [field]: value }, window, 3)).not.toEqual(metrics);
    }

    const logs: ExploreQuery = {
      ...sharedQuery,
      signal: 'logs',
      traceId: 'trace-1',
      spanId: 'span-1',
      severityText: 'ERROR',
      resourceFilter: 'service.version=1',
      attributeFilter: 'http.status_code=500',
      pageIndex: 2
    };
    const logKey = exploreQueryKeys.history(logs, window, 3);
    for (const [field, value] of [
      ['query', 'timeout'],
      ['traceId', 'trace-2'],
      ['spanId', 'span-2'],
      ['severityText', 'WARN'],
      ['resourceFilter', 'service.version=2'],
      ['attributeFilter', 'http.status_code=503'],
      ['pageIndex', 3]
    ] as const) {
      expect(exploreQueryKeys.history({ ...logs, [field]: value }, window, 3)).not.toEqual(logKey);
    }

    const traces: ExploreQuery = {
      ...sharedQuery,
      signal: 'traces',
      traceId: 'trace-1',
      errorOnly: true,
      resourceFilter: 'service.version=1',
      minDurationMs: 100,
      maxDurationMs: 2_000,
      pageIndex: 2
    };
    const traceKey = exploreQueryKeys.history(traces, window, 3);
    for (const [field, value] of [
      ['query', 'POST /checkout'],
      ['traceId', 'trace-2'],
      ['errorOnly', false],
      ['resourceFilter', 'service.version=2'],
      ['minDurationMs', 200],
      ['maxDurationMs', 3_000],
      ['pageIndex', 3]
    ] as const) {
      expect(exploreQueryKeys.history({ ...traces, [field]: value }, window, 3)).not.toEqual(traceKey);
    }
  });

  it('keeps the controller on the feature-owned factory', () => {
    expect(controllerSource).toContain("from './explore-query-keys'");
    expect(controllerSource).toContain('queryKey: exploreQueryKeys.history(');
    expect(controllerSource).not.toMatch(/queryKey:\s*\[/);
  });

  it('keeps trace detail reads and exact cancellation on the same factory', () => {
    expect(traceDetailControllerSource).toContain("from './explore-query-keys'");
    expect(traceDetailControllerSource).toContain('queryKey: exploreQueryKeys.detail(scopeKey, traceId)');
    expect(traceDetailControllerSource).toContain(
      'queryKey: exploreQueryKeys.detail(opened.scopeKey, opened.traceId), exact: true'
    );
    expect(traceDetailControllerSource).not.toMatch(/queryKey:\s*\[/);
  });
});
