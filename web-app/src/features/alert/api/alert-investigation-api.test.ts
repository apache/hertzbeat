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

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { apiMessageGet } from '@/core/http/api-message';

import { buildAlertInvestigationApiPath, loadAlertInvestigation } from './alert-investigation-api';

vi.mock('@/core/http/api-message', async importOriginal => {
  const actual = await importOriginal<typeof import('@/core/http/api-message')>();
  return { ...actual, apiMessageGet: vi.fn() };
});

const request = vi.mocked(apiMessageGet);
const window = { from: 1_000, to: 2_000 } as const;

describe('Alert investigation API', () => {
  beforeEach(() => request.mockReset());

  it('loads one exact composite with the query AbortSignal', async () => {
    const signal = new AbortController().signal;
    request.mockResolvedValue(emptySnapshot());

    await expect(loadAlertInvestigation(11, window, signal)).resolves.toMatchObject({ alertId: 11 });
    expect(request).toHaveBeenCalledWith('/api/alerts/11/investigation?start=1000&end=2000', { signal });
  });

  it('rejects invalid identity and windows before transport', () => {
    for (const operation of [
      () => buildAlertInvestigationApiPath(0, window),
      () => buildAlertInvestigationApiPath(Number.MAX_SAFE_INTEGER + 1, window),
      () => buildAlertInvestigationApiPath(11, { from: 2_000, to: 1_000 }),
      () => buildAlertInvestigationApiPath(11, { from: 1, to: 86_400_002 })
    ]) {
      expect(operation).toThrow();
    }
    expect(request).not.toHaveBeenCalled();
  });
});

function emptySnapshot() {
  return {
    alertId: 11,
    window: { start: 1_000, end: 2_000, anchor: 1_500 },
    alert: {
      name: null,
      status: 'firing',
      severity: null,
      summary: null,
      content: null,
      labels: {},
      annotations: {}
    },
    identity: {
      state: 'unavailable',
      reason: 'identity_unavailable',
      source: 'persisted_alert',
      identity: null
    },
    metrics: unavailable('otlp_metrics', 'series', 'query_strategy_unavailable'),
    logs: empty('greptime_logs', 'records'),
    traces: empty('greptime_traces', 'traces'),
    topology: unavailable('greptime_semantic_graph', 'edges', 'identity_unavailable'),
    collection: {
      state: 'empty',
      reason: 'no_data',
      source: 'greptime_collection_events',
      event: null
    }
  };
}

function empty(source: string, payload: string) {
  return { state: 'empty', reason: 'no_data', source, [payload]: [], truncated: false };
}

function unavailable(source: string, payload: string, reason: string) {
  return { state: 'unavailable', reason, source, [payload]: [], truncated: false };
}
