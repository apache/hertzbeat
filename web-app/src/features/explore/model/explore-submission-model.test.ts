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

import { buildSubmissionPatch, draftFromQuery } from './explore-submission-model';

describe('explore submission model', () => {
  it('creates a controlled draft for only the selected signal', () => {
    expect(
      draftFromQuery({
        signal: 'metrics',
        timeRange: 'last-30m',
        serviceName: 'checkout',
        environment: 'prod',
        instance: 'checkout-7d9',
        endpoint: '/checkout',
        query: 'latency',
        metricFilter: 'method=POST',
        groupBy: 'service_name',
        aggregation: 'avg',
        step: '60'
      })
    ).toEqual({
      signal: 'metrics',
      serviceName: 'checkout',
      environment: 'prod',
      instance: 'checkout-7d9',
      endpoint: '/checkout',
      query: 'latency',
      metricFilter: 'method=POST',
      groupBy: 'service_name',
      aggregation: 'avg',
      stepSeconds: '60'
    });

    expect(
      draftFromQuery({
        signal: 'traces',
        timeRange: 'last-30m',
        traceId: 'trace-1',
        attributeFilter: 'http.route=/checkout',
        minDurationMs: 10,
        maxDurationMs: 500,
        errorOnly: true
      })
    ).toEqual({
      signal: 'traces',
      serviceName: '',
      environment: '',
      instance: '',
      endpoint: '',
      query: '',
      traceId: 'trace-1',
      resourceFilter: '',
      attributeFilter: 'http.route=/checkout',
      minDurationMs: '10',
      maxDurationMs: '500',
      errorOnly: true
    });
  });

  it('trims a metric submission and enforces backend aggregation and step contracts', () => {
    expect(
      buildSubmissionPatch({
        signal: 'metrics',
        serviceName: ' checkout ',
        environment: ' prod ',
        instance: ' checkout-7d9 ',
        endpoint: ' /checkout ',
        query: ' rate(http_requests_total[5m]) ',
        metricFilter: ' method=POST ',
        groupBy: ' service_name ',
        aggregation: ' AVG ',
        stepSeconds: ' 86400 '
      })
    ).toEqual({
      valid: true,
      patch: {
        serviceName: 'checkout',
        environment: 'prod',
        instance: 'checkout-7d9',
        endpoint: '/checkout',
        query: 'rate(http_requests_total[5m])',
        metricFilter: 'method=POST',
        groupBy: 'service_name',
        aggregation: 'avg',
        step: '86400',
        pageIndex: undefined
      }
    });

    for (const stepSeconds of ['0', '86401', '60s', '60 seconds']) {
      expect(
        buildSubmissionPatch({
          signal: 'metrics',
          serviceName: '',
          environment: '',
          instance: '',
          endpoint: '',
          query: '',
          metricFilter: '',
          groupBy: '',
          aggregation: 'p95',
          stepSeconds
        })
      ).toEqual({
        valid: false,
        errors: [
          { field: 'aggregation', code: 'unsupported_aggregation' },
          { field: 'stepSeconds', code: 'invalid_step' }
        ]
      });
    }
  });

  it('builds only log-owned fields even when runtime input is polluted', () => {
    expect(
      buildSubmissionPatch({
        signal: 'logs',
        serviceName: '',
        environment: ' prod ',
        instance: '',
        endpoint: '',
        query: ' timeout ',
        severityText: ' ERROR ',
        traceId: ' trace-1 ',
        spanId: ' span-1 ',
        resourceFilter: ' service.version=1 ',
        attributeFilter: ' http.status_code=500 ',
        metricFilter: 'must-not-leak',
        minDurationMs: '100'
      } as never)
    ).toEqual({
      valid: true,
      patch: {
        serviceName: undefined,
        environment: 'prod',
        instance: undefined,
        endpoint: undefined,
        query: 'timeout',
        severityText: 'ERROR',
        traceId: 'trace-1',
        spanId: 'span-1',
        resourceFilter: 'service.version=1',
        attributeFilter: 'http.status_code=500',
        pageIndex: undefined
      }
    });
  });

  it('accepts only ordered safe-integer trace durations', () => {
    expect(
      buildSubmissionPatch({
        signal: 'traces',
        serviceName: '',
        environment: '',
        instance: '',
        endpoint: '',
        query: '',
        traceId: '',
        resourceFilter: '',
        attributeFilter: ' http.route=/checkout ',
        minDurationMs: ' 0 ',
        maxDurationMs: ' 9007199254740991 ',
        errorOnly: false
      })
    ).toEqual({
      valid: true,
      patch: {
        serviceName: undefined,
        environment: undefined,
        instance: undefined,
        endpoint: undefined,
        query: undefined,
        traceId: undefined,
        resourceFilter: undefined,
        attributeFilter: 'http.route=/checkout',
        minDurationMs: 0,
        maxDurationMs: Number.MAX_SAFE_INTEGER,
        errorOnly: undefined,
        pageIndex: undefined
      }
    });

    for (const [minDurationMs, maxDurationMs, field, code] of [
      ['1.5', '', 'minDurationMs', 'invalid_duration'],
      ['-1', '', 'minDurationMs', 'invalid_duration'],
      ['9007199254740992', '', 'minDurationMs', 'invalid_duration'],
      ['200', '100', 'maxDurationMs', 'min_exceeds_max']
    ] as const) {
      const result = buildSubmissionPatch({
        signal: 'traces',
        serviceName: '',
        environment: '',
        instance: '',
        endpoint: '',
        query: '',
        traceId: '',
        resourceFilter: '',
        attributeFilter: '',
        minDurationMs,
        maxDurationMs,
        errorOnly: false
      });
      expect(result).toEqual({ valid: false, errors: [{ field, code }] });
    }
  });
});
