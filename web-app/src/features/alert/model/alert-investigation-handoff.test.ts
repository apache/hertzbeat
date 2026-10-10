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

import { parseTopologyQuery } from '@/features/topology/model/topology-model';

import {
  buildAlertInvestigationLogPath,
  buildAlertInvestigationMetricPath,
  buildAlertInvestigationTopologyPath,
  buildAlertInvestigationTracePath
} from './alert-investigation-handoff';
import type { AlertInvestigationSnapshot } from './alert-investigation-contract';
import { alertInvestigationSnapshot, alertReadyRoute } from './alert-investigation-test-fixtures';

describe('Alert investigation handoffs', () => {
  it('uses snapshot identity rather than alert labels and preserves the exact Metric window', () => {
    const snapshot = alertInvestigationSnapshot();
    snapshot.alert.labels = { 'service.name': 'stale', credential: 'private' };
    const url = new URL(buildAlertInvestigationMetricPath(alertReadyRoute(), snapshot)!, 'https://hertzbeat.local');

    expect(Object.fromEntries(url.searchParams)).toMatchObject({
      signal: 'metrics',
      start: '1000',
      end: '2000',
      timeZone: 'UTC',
      entityId: '7',
      monitorId: '42',
      serviceName: 'checkout',
      serviceNamespace: 'commerce',
      environment: 'prod'
    });
    expect(url.searchParams.has('credential')).toBe(false);
  });

  it('focuses an exact Log or Trace without dropping snapshot scope', () => {
    const route = alertReadyRoute();
    const snapshot = alertInvestigationSnapshot();
    const log = new URL(
      buildAlertInvestigationLogPath(route, snapshot, snapshot.logs.records[0]!)!,
      'https://hertzbeat.local'
    );
    const trace = new URL(
      buildAlertInvestigationTracePath(route, snapshot, snapshot.traces.traces[0]!)!,
      'https://hertzbeat.local'
    );

    expect(Object.fromEntries(log.searchParams)).toMatchObject({
      signal: 'logs',
      logRecordUid: 'log-1',
      traceId: '0123456789abcdef0123456789abcdef',
      spanId: '0123456789abcdef',
      start: '1000',
      end: '2000',
      timeZone: 'UTC',
      entityId: '7'
    });
    expect(Object.fromEntries(trace.searchParams)).toMatchObject({
      signal: 'traces',
      traceId: '0123456789abcdef0123456789abcdef',
      start: '1000',
      end: '2000',
      timeZone: 'UTC',
      entityId: '7'
    });
  });

  it('opens Topology only from ready evidence and a typed safe entity identity', () => {
    const route = alertReadyRoute();
    const snapshot = alertInvestigationSnapshot();
    const url = new URL(buildAlertInvestigationTopologyPath(route, snapshot)!, 'https://hertzbeat.local');
    expect(parseTopologyQuery(url.searchParams)).toMatchObject({
      focusEntityId: 7,
      environment: 'prod',
      sourceKind: 'otel',
      window: { from: 1_000, to: 2_000 }
    });

    const unavailable = {
      ...snapshot,
      topology: {
        state: 'unavailable',
        reason: 'identity_unavailable',
        source: 'greptime_semantic_graph',
        edges: [],
        truncated: false
      }
    } as AlertInvestigationSnapshot;
    expect(buildAlertInvestigationTopologyPath(route, unavailable)).toBeUndefined();
    snapshot.identity.identity!.entityType = null;
    expect(buildAlertInvestigationTopologyPath(route, snapshot)).toBeUndefined();
  });

  it('suppresses Metrics when no usable authoritative query context exists', () => {
    const snapshot = alertInvestigationSnapshot();
    snapshot.identity.identity = {
      serviceName: null,
      serviceNamespace: null,
      deploymentEnvironment: null,
      entityId: null,
      entityType: null,
      monitorId: null,
      metricName: 'cpu.usage',
      metricQuery: null
    };
    expect(buildAlertInvestigationMetricPath(alertReadyRoute(), snapshot)).toBeUndefined();
  });
});
