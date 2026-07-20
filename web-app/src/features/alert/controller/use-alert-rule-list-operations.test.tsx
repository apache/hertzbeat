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

import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AlertRuleRequestFailure, type AlertRule } from '../alert-rule-model';
import { useAlertRuleListOperations } from './use-alert-rule-list-operations';

const api = vi.hoisted(() => ({
  deleteAlertRules: vi.fn(),
  loadAlertRule: vi.fn(),
  updateAlertRuleEnabled: vi.fn()
}));

vi.mock('../alert-rule-api', async importOriginal => ({
  ...(await importOriginal<typeof import('../alert-rule-api')>()),
  ...api
}));

describe('alert rule list operation state', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.updateAlertRuleEnabled.mockResolvedValue(undefined);
  });

  it('prioritizes operating over recovering and returns to idle after recovery succeeds', async () => {
    const proof = deferred<AlertRule>();
    api.loadAlertRule
      .mockRejectedValueOnce(new AlertRuleRequestFailure('unavailable', 'uncertain'))
      .mockReturnValueOnce(proof.promise);
    const rereadLatest = vi.fn().mockResolvedValue({ content: [], totalElements: 0, totalPages: 0 });
    const { result } = renderHook(() =>
      useAlertRuleListOperations(rereadLatest, { success: vi.fn(), failure: vi.fn() })
    );

    expect(result.current.command).toBe('idle');
    await act(async () => result.current.toggle(rule, false));
    expect(result.current.command).toBe('recovering');

    let recovery!: Promise<void>;
    act(() => {
      recovery = result.current.resume();
    });
    expect(result.current.command).toBe('operating');

    act(() => proof.resolve({ ...rule, enable: false }));
    await act(async () => recovery);
    expect(result.current.command).toBe('idle');
  });
});

const rule: AlertRule = {
  id: 7,
  name: 'CPU',
  type: 'realtime_metric',
  datasource: 'promql',
  expr: 'usage > 90',
  period: null,
  times: null,
  labels: { severity: 'critical' },
  annotations: { summary: 'CPU high' },
  template: null,
  enable: true,
  gmtUpdate: '2026-07-17T09:00:00'
};

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(accept => {
    resolve = accept;
  });
  return { promise, resolve };
}
