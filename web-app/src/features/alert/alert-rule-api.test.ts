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

import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  ApiMessageError,
  apiMessageDelete,
  apiMessageGet,
  apiMessagePost,
  apiMessagePut
} from '@/core/http/api-message';

import {
  buildAlertRuleListPath,
  deleteAlertRules,
  loadAlertRule,
  loadAlertRules,
  previewAlertRule,
  saveAlertRule,
  updateAlertRuleEnabled
} from './alert-rule-api';
import {
  AlertRuleContractError,
  AlertRuleRequestFailure,
  alertRuleDraftFromDetail,
  createAlertRuleDraft,
  type AlertRule,
  type AlertRuleQuery
} from './alert-rule-model';

vi.mock('@/core/http/api-message', async importOriginal => ({
  ...(await importOriginal<typeof import('@/core/http/api-message')>()),
  apiMessageDelete: vi.fn(),
  apiMessageGet: vi.fn(),
  apiMessagePost: vi.fn(),
  apiMessagePut: vi.fn()
}));

const query: AlertRuleQuery = { search: '', pageIndex: 0, pageSize: 8 };
const persisted: AlertRule = {
  id: 7,
  name: 'CPU high',
  type: 'realtime_metric',
  datasource: 'promql',
  expr: 'usage > 90',
  period: 300,
  times: 3,
  labels: { severity: 'critical' },
  annotations: { summary: 'CPU high' },
  template: 'CPU {{ $value }}',
  enable: true,
  creator: null,
  modifier: null,
  gmtCreate: null,
  gmtUpdate: null
};

describe('alert rule API', () => {
  beforeEach(() => vi.clearAllMocks());

  it('owns the established double-decoded paged search path', () => {
    expect(buildAlertRuleListPath({ search: '', pageIndex: 0, pageSize: 8 })).toBe(
      '/api/alert/defines?pageIndex=0&pageSize=8&sort=id&order=desc'
    );
    expect(buildAlertRuleListPath({ search: 'cpu', pageIndex: 2, pageSize: 15 })).toBe(
      '/api/alert/defines?pageIndex=2&pageSize=15&sort=id&order=desc&search=%255B%2522cpu%2522%255D'
    );
  });

  it('parses unknown list and detail responses through the strict boundary', async () => {
    vi.mocked(apiMessageGet)
      .mockResolvedValueOnce({
        content: [{ ...persisted, ignored: true }],
        totalElements: 1,
        totalPages: 1,
        number: 0,
        size: 8
      })
      .mockResolvedValueOnce({ ...persisted, ignored: true });
    await expect(loadAlertRules(query)).resolves.toEqual({
      content: [persisted],
      totalElements: 1,
      totalPages: 1,
      number: 0,
      size: 8
    });
    await expect(loadAlertRule('7')).resolves.toEqual(persisted);
  });

  it('rejects detail evidence whose id does not match the canonical endpoint', async () => {
    vi.mocked(apiMessageGet).mockResolvedValue({ ...persisted, id: 8 });
    await expect(loadAlertRule('7')).rejects.toThrow(AlertRuleContractError);
  });

  it('returns void from POST, PUT, toggle, and DELETE instead of leaking acknowledgements', async () => {
    vi.mocked(apiMessagePost).mockResolvedValue({ id: 99 });
    vi.mocked(apiMessagePut).mockResolvedValue({ ...persisted, id: 99 });
    vi.mocked(apiMessageDelete).mockResolvedValue({ deleted: [7] });
    const draft = {
      ...createAlertRuleDraft(),
      name: 'CPU high',
      expr: 'usage > 90',
      template: 'CPU',
      labelsText: 'severity:critical'
    };
    await expect(saveAlertRule('new', draft)).resolves.toBeUndefined();
    await expect(saveAlertRule('edit', { ...draft, id: 7 })).resolves.toBeUndefined();
    await expect(updateAlertRuleEnabled(persisted, false)).resolves.toBeUndefined();
    await expect(deleteAlertRules([7])).resolves.toBeUndefined();
  });

  it('rejects create/update commands whose identity does not match the endpoint', async () => {
    const draft = { ...createAlertRuleDraft(), name: 'CPU high', expr: 'usage > 90', template: 'CPU' };
    await expect(saveAlertRule('edit', draft)).rejects.toThrow(AlertRuleContractError);
    await expect(saveAlertRule('new', { ...draft, id: 7 })).rejects.toThrow(AlertRuleContractError);
    expect(apiMessagePost).not.toHaveBeenCalled();
    expect(apiMessagePut).not.toHaveBeenCalled();
  });

  it.each(['', ' 7', '7 ', '1e2', '1.0', '+1', '0', '-1'])(
    'rejects non-canonical detail id %s before transport',
    async id => {
      await expect(loadAlertRule(id)).rejects.toThrow(AlertRuleContractError);
      expect(apiMessageGet).not.toHaveBeenCalled();
    }
  );

  it('requires a nonempty valid delete set and stably removes duplicate ids', async () => {
    vi.mocked(apiMessageDelete).mockResolvedValue(undefined);
    await expect(deleteAlertRules([])).rejects.toThrow(AlertRuleContractError);
    await expect(deleteAlertRules([7, 0])).rejects.toThrow(AlertRuleContractError);
    await expect(deleteAlertRules([7, Number.MAX_SAFE_INTEGER + 1])).rejects.toThrow(AlertRuleContractError);
    expect(apiMessageDelete).not.toHaveBeenCalled();

    await deleteAlertRules([7, 7, 9, 7, 9]);
    expect(apiMessageDelete).toHaveBeenCalledWith('/api/alert/defines?ids=7&ids=9');
  });

  it('toggle sends only writable fields and preserves annotations', async () => {
    vi.mocked(apiMessagePut).mockResolvedValue(undefined);
    await updateAlertRuleEnabled(persisted, false);
    expect(apiMessagePut).toHaveBeenCalledWith('/api/alert/define', {
      id: 7,
      name: 'CPU high',
      type: 'realtime_metric',
      datasource: 'promql',
      expr: 'usage > 90',
      period: 300,
      times: 3,
      labels: { severity: 'critical' },
      annotations: { summary: 'CPU high' },
      template: 'CPU {{ $value }}',
      enable: false
    });
  });

  it('edit payload preserves annotations loaded from canonical detail', async () => {
    vi.mocked(apiMessagePut).mockResolvedValue(undefined);
    const draft = alertRuleDraftFromDetail(persisted);
    await saveAlertRule('edit', draft);
    expect(apiMessagePut).toHaveBeenCalledWith(
      '/api/alert/define',
      expect.objectContaining({ annotations: { summary: 'CPU high' } })
    );
  });

  it('previews a valid strategy and expression without requiring unrelated editor fields', async () => {
    vi.mocked(apiMessageGet).mockResolvedValue([{ value: 1 }]);
    await expect(previewAlertRule({ ...createAlertRuleDraft(), expr: 'usage > 90' })).resolves.toEqual([{ value: 1 }]);
    expect(apiMessageGet).toHaveBeenCalledWith(
      '/api/alert/define/preview/promql?type=realtime_metric&expr=usage+%3E+90'
    );
  });

  it('rejects malformed preview rows at the response boundary', async () => {
    vi.mocked(apiMessageGet).mockResolvedValue([[]]);
    await expect(previewAlertRule({ ...createAlertRuleDraft(), expr: 'usage > 90' })).rejects.toThrow(
      AlertRuleContractError
    );
  });

  it('normalizes every transport entry before leaving the API', async () => {
    const draft = {
      ...createAlertRuleDraft(),
      name: 'CPU high',
      expr: 'usage > 90',
      template: 'CPU'
    };

    vi.mocked(apiMessageGet).mockRejectedValueOnce(transportFailure());
    await expect(loadAlertRules(query)).rejects.toBeInstanceOf(AlertRuleRequestFailure);
    vi.mocked(apiMessageGet).mockRejectedValueOnce(transportFailure());
    await expect(loadAlertRule(7)).rejects.toBeInstanceOf(AlertRuleRequestFailure);
    vi.mocked(apiMessagePost).mockRejectedValueOnce(transportFailure());
    await expect(saveAlertRule('new', draft)).rejects.toBeInstanceOf(AlertRuleRequestFailure);
    vi.mocked(apiMessagePut).mockRejectedValueOnce(transportFailure());
    await expect(saveAlertRule('edit', { ...draft, id: 7 })).rejects.toBeInstanceOf(AlertRuleRequestFailure);
    vi.mocked(apiMessageDelete).mockRejectedValueOnce(transportFailure());
    await expect(deleteAlertRules([7])).rejects.toBeInstanceOf(AlertRuleRequestFailure);
    vi.mocked(apiMessagePut).mockRejectedValueOnce(transportFailure());
    await expect(updateAlertRuleEnabled(persisted, false)).rejects.toBeInstanceOf(AlertRuleRequestFailure);
    vi.mocked(apiMessageGet).mockRejectedValueOnce(transportFailure());
    await expect(previewAlertRule(draft)).rejects.toBeInstanceOf(AlertRuleRequestFailure);
  });
});

function transportFailure() {
  return new ApiMessageError('private transport failure', { status: 503 });
}
