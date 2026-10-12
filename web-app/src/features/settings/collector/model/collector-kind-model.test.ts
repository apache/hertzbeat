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

import type { CollectorRecord } from './collector-model';
import { classifyCollectorKind } from './collector-kind-model';

describe('classifyCollectorKind', () => {
  it('always classifies the protected in-process Collector as embedded Java', () => {
    expect(
      classifyCollectorKind(
        collector({
          name: 'main-default-collector',
          immutable: true,
          instrumentationIntake: {
            status: 'unavailable',
            errorCode: 'intake_advertisement_unavailable'
          },
          runtimeReport: {
            schemaVersion: 2,
            enabled: true,
            state: 'RUNNING',
            desiredRevision: 3,
            activeRevision: 3,
            failureCode: 'NONE',
            rejectedRevisions: [],
            sources: [],
            reportedAt: '2026-08-06T01:00:00Z'
          }
        })
      )
    ).toBe('embedded_java');
  });

  it('keeps an ordinary registered Collector classified as Java', () => {
    expect(classifyCollectorKind(collector())).toBe('java');
  });

  it('classifies a Collector with a managed runtime report as Hybrid', () => {
    expect(
      classifyCollectorKind(
        collector({
          runtimeReport: {
            schemaVersion: 2,
            enabled: true,
            state: 'RUNNING',
            desiredRevision: 3,
            activeRevision: 3,
            failureCode: 'NONE',
            rejectedRevisions: [],
            sources: [],
            reportedAt: '2026-08-06T01:00:00Z'
          }
        })
      )
    ).toBe('hybrid');
  });

  it('retains the Hybrid classification while its advertised gateway is temporarily unavailable', () => {
    expect(
      classifyCollectorKind(
        collector({
          instrumentationIntake: {
            status: 'unavailable',
            errorCode: 'intake_advertisement_unavailable'
          }
        })
      )
    ).toBe('hybrid');
  });

  it('does not mistake a legacy Server-owned endpoint for a Hybrid Collector', () => {
    expect(
      classifyCollectorKind(
        collector({
          instrumentationIntake: {
            status: 'available',
            schemaVersion: 1,
            collectorId: 'edge',
            gateway: 'server',
            capabilities: ['otlp_grpc'],
            otlpHttpEndpoint: null,
            otlpGrpcEndpoint: 'https://server.example.test:4317',
            authorizationHeader: 'Authorization'
          }
        })
      )
    ).toBe('java');
  });
});

function collector(overrides: Partial<CollectorRecord> = {}): CollectorRecord {
  return {
    name: 'edge',
    address: '10.0.0.7',
    version: '2.0.0',
    mode: 'public',
    online: true,
    immutable: false,
    pinMonitorNum: 0,
    dispatchMonitorNum: 0,
    updatedAt: '2026-08-06T01:00:00Z',
    runtimeReport: null,
    instrumentationIntake: { status: 'unavailable', errorCode: 'intake_not_advertised' },
    ...overrides
  };
}
