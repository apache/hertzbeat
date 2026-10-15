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

import type { AlertInvestigationSnapshot } from './alert-investigation-contract';
import { createAlertInvestigationPersesResults } from './alert-investigation-perses-model';
import { alertInvestigationSnapshot } from './alert-investigation-test-fixtures';

describe('Alert investigation Perses results', () => {
  it('adapts only backend-ready Metrics and Logs with the exact authoritative scope', () => {
    const result = createAlertInvestigationPersesResults(alertInvestigationSnapshot());

    expect(result.metrics[0]).toMatchObject({
      query: {
        signal: 'metrics',
        timeWindow: { from: 1_000, to: 2_000 },
        context: { entityId: '7', monitorId: '42', serviceName: 'checkout', environment: 'prod' }
      },
      outcome: { state: 'ready', truncated: false }
    });
    expect(result.logs?.outcome).toMatchObject({
      state: 'ready',
      data: { rows: [{ logRecordUid: 'log-1', timeUnixNano: '1000000000' }] }
    });
  });

  it('does not create a raw query for unavailable backend evidence', () => {
    const snapshot = alertInvestigationSnapshot();
    const unavailable = {
      ...snapshot,
      metrics: {
        state: 'unavailable',
        reason: 'query_strategy_unavailable',
        source: 'otlp_metrics',
        series: [],
        truncated: false
      },
      logs: {
        state: 'empty',
        reason: 'no_data',
        source: 'greptime_logs',
        records: [],
        truncated: false
      }
    } as AlertInvestigationSnapshot;

    expect(createAlertInvestigationPersesResults(unavailable)).toEqual({ metrics: [] });
  });
});
