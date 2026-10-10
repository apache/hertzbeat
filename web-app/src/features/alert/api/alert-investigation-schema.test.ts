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

import { describe, expect, it } from 'vitest';

import type { AlertInvestigationSnapshot } from '../model/alert-investigation-contract';

import { AlertInvestigationContractError, parseAlertInvestigation } from './alert-investigation-schema';

const window = { from: 1_784_249_160_000, to: 1_784_250_960_000 };

describe('Alert investigation schema', () => {
  it('accepts the strict ready composite without losing decimal nanoseconds', () => {
    const result = parseAlertInvestigation(readySnapshot(), 11, window);

    expect(result.traces.traces[0]?.startTimeUnixNano).toBe('1784249160000000000');
    expect(result.logs.records[0]?.timeUnixNano).toBe('1784249160000000000');
    expect(result.window).toEqual({ start: window.from, end: window.to, anchor: 1_784_250_060_000 });
  });

  it('accepts canonical empty and unavailable evidence without synthesizing payloads', () => {
    const value = readySnapshot();
    setAtPath(value, ['identity'], {
      state: 'unavailable',
      reason: 'identity_unavailable',
      source: 'persisted_alert',
      identity: null
    });
    setAtPath(value, ['metrics'], emptyList('otlp_metrics'));
    setAtPath(value, ['logs'], emptyList('greptime_logs', 'records'));
    setAtPath(value, ['traces'], unavailableList('greptime_traces', 'traces'));
    setAtPath(value, ['topology'], emptyList('greptime_semantic_graph', 'edges'));
    setAtPath(value, ['collection'], {
      state: 'unavailable',
      reason: 'storage_unavailable',
      source: 'greptime_collection_events',
      event: null
    });

    expect(parseAlertInvestigation(value, 11, window)).toEqual(value);
  });

  it('accepts malformed unavailable identity and an entityId-only authoritative identity', () => {
    const malformed = readySnapshot();
    setAtPath(malformed, ['identity'], {
      state: 'unavailable',
      reason: 'malformed_data',
      source: 'persisted_alert',
      identity: null
    });
    expect(parseAlertInvestigation(malformed, 11, window).identity).toMatchObject({
      state: 'unavailable',
      reason: 'malformed_data'
    });

    const entityOnly = readySnapshot();
    setAtPath(entityOnly, ['identity', 'identity'], {
      serviceName: null,
      serviceNamespace: null,
      deploymentEnvironment: null,
      entityId: 7,
      entityType: null,
      monitorId: null,
      metricName: null,
      metricQuery: null
    });
    expect(parseAlertInvestigation(entityOnly, 11, window).identity.identity?.entityId).toBe(7);
  });

  it('accepts frozen metric limits and the persisted unknown collection duration sentinel', () => {
    const atBoundary = readySnapshot();
    const series = atBoundary.metrics.series[0];
    if (!series || !atBoundary.collection.event) throw new Error('Ready evidence fixture expected');
    series.points = Array.from({ length: 1_440 }, (_, index) => ({ timestamp: window.from + index, value: index }));
    atBoundary.metrics.series = Array.from({ length: 20 }, (_, index) => ({ ...series, name: `metric.${index}` }));
    atBoundary.collection.event.durationMillis = -1;
    expect(() => parseAlertInvestigation(atBoundary, 11, window)).not.toThrow();

    const tooManySeries = structuredClone(atBoundary);
    tooManySeries.metrics.series.push({ ...series, name: 'metric.20' });
    expect(() => parseAlertInvestigation(tooManySeries, 11, window)).toThrow(AlertInvestigationContractError);

    const tooManyPoints = readySnapshot();
    const firstSeries = tooManyPoints.metrics.series[0];
    if (!firstSeries) throw new Error('Metric fixture expected');
    firstSeries.points = Array.from({ length: 1_441 }, (_, index) => ({
      timestamp: window.from + index,
      value: index
    }));
    expect(() => parseAlertInvestigation(tooManyPoints, 11, window)).toThrow(AlertInvestigationContractError);
  });

  it.each(invalidCases)('rejects %s', (_label, mutate) => {
    const value = readySnapshot();
    mutate(value);
    expect(() => parseAlertInvestigation(value, 11, window)).toThrow(AlertInvestigationContractError);
  });
});

function readySnapshot(): AlertInvestigationSnapshot {
  return {
    alertId: 11,
    window: { start: window.from, end: window.to, anchor: 1_784_250_060_000 },
    alert: {
      name: 'Checkout latency',
      status: 'firing',
      severity: 'critical',
      summary: 'Latency exceeded threshold',
      content: 'Checkout p95 latency is above 500 ms.',
      labels: { team: 'commerce' },
      annotations: { runbook: 'Inspect checkout dependencies.' }
    },
    identity: {
      state: 'ready',
      reason: 'observed',
      source: 'persisted_alert',
      identity: {
        serviceName: 'checkout',
        serviceNamespace: 'commerce',
        deploymentEnvironment: 'prod',
        entityId: 7,
        entityType: 'service',
        monitorId: 42,
        metricName: 'http.server.duration',
        metricQuery: 'service.name="checkout"'
      }
    },
    metrics: {
      state: 'ready',
      reason: 'observed',
      source: 'otlp_metrics',
      series: [
        {
          name: 'http.server.duration',
          labels: { service: 'checkout' },
          points: [{ timestamp: window.from, value: 1 }]
        }
      ],
      truncated: false
    },
    logs: {
      state: 'ready',
      reason: 'observed',
      source: 'greptime_logs',
      records: [logRecord()],
      truncated: false
    },
    traces: {
      state: 'ready',
      reason: 'observed',
      source: 'greptime_traces',
      traces: [
        {
          traceId: '0123456789abcdef0123456789abcdef',
          startTimeUnixNano: '1784249160000000000',
          durationNanos: '3000000000',
          status: 'error',
          spanCount: 7,
          serviceName: 'checkout'
        }
      ],
      truncated: false
    },
    topology: {
      state: 'ready',
      reason: 'observed',
      source: 'greptime_semantic_graph',
      edges: [
        {
          observedAt: window.from,
          sourceType: 'service',
          sourceId: '7',
          targetType: 'service',
          targetId: '8',
          relationType: 'calls',
          provenance: 'trace',
          confidence: 0.9,
          requestCount: 12,
          errorCount: 2
        }
      ],
      truncated: false
    },
    collection: {
      state: 'ready',
      reason: 'observed',
      source: 'greptime_collection_events',
      event: {
        observedAt: window.from,
        durationMillis: 120,
        outcome: 'FAILURE',
        collectorId: 'collector-1',
        target: 'checkout:8080',
        metricSet: 'http',
        failureClass: 'UNREACHABLE',
        phase: 'CONNECT',
        fieldCount: 4,
        rowCount: 0
      }
    }
  };
}

type Mutator = (value: unknown) => void;
const invalidCases: ReadonlyArray<readonly [string, Mutator]> = [
  ['mismatched alert', value => setAtPath(value, ['alertId'], 12)],
  ['mismatched window', value => setAtPath(value, ['window', 'end'], window.to - 1)],
  ['anchor outside window', value => setAtPath(value, ['window', 'anchor'], window.to)],
  ['ready list without evidence', value => setAtPath(value, ['logs', 'records'], [])],
  ['non-ready list with payload', value => setAtPath(value, ['logs', 'state'], 'empty')],
  ['non-ready truncated evidence', value => setAtPath(value, ['metrics', 'state'], 'empty')],
  ['forged trace id', value => setAtPath(value, ['traces', 'traces', '0', 'traceId'], 'ABC')],
  ['numeric trace nanoseconds', value => setAtPath(value, ['traces', 'traces', '0', 'durationNanos'], 42)],
  [
    'out-of-window metric point',
    value => setAtPath(value, ['metrics', 'series', '0', 'points', '0', 'timestamp'], window.to)
  ],
  ['out-of-window topology edge', value => setAtPath(value, ['topology', 'edges', '0', 'observedAt'], window.to)],
  ['wrong evidence source', value => setAtPath(value, ['collection', 'source'], 'current_alerts')],
  ['unknown wire field', value => setAtPath(value, ['alert', 'credential'], 'secret')]
];

function logRecord() {
  return {
    logRecordUid: 'log-1',
    timeUnixNano: '1784249160000000000',
    observedTimeUnixNano: null,
    severityNumber: 17,
    severityText: 'ERROR',
    body: 'checkout failed',
    traceId: '0123456789abcdef0123456789abcdef',
    spanId: '0123456789abcdef',
    identity: {
      workspaceId: 'default',
      entityId: '7',
      entityType: 'service',
      serviceName: 'checkout',
      serviceNamespace: 'commerce',
      deploymentEnvironment: 'prod'
    },
    attributes: {},
    resourceAttributes: {}
  };
}

function emptyList(source: string, payload = 'series') {
  return { state: 'empty', reason: 'no_data', source, [payload]: [], truncated: false };
}

function unavailableList(source: string, payload: string) {
  return { state: 'unavailable', reason: 'storage_unavailable', source, [payload]: [], truncated: false };
}

function setAtPath(root: unknown, path: readonly string[], value: unknown) {
  let cursor = root;
  for (const segment of path.slice(0, -1)) {
    if (!isRecord(cursor)) throw new Error(`Missing test path segment: ${segment}`);
    cursor = cursor[segment];
  }
  const property = path.at(-1);
  if (!property || !isRecord(cursor)) throw new Error('Invalid test mutation path');
  cursor[property] = value;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object';
}
