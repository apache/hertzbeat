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

const transport = vi.hoisted(() => ({
  apiMessageDelete: vi.fn(),
  apiMessageGet: vi.fn(),
  apiMessagePost: vi.fn(),
  apiMessagePut: vi.fn()
}));
vi.mock('@/core/http/api-message', async importOriginal => ({
  ...(await importOriginal<typeof import('@/core/http/api-message')>()),
  ...transport
}));

import { ApiMessageError } from '@/core/http/api-message';

import {
  deleteAlertInhibit,
  deleteAlertInhibits,
  loadAlertInhibit,
  loadAlertInhibits,
  loadMatchedAlertInhibits,
  saveAlertInhibit,
  updateAlertInhibitEnabled
} from './alert-inhibit-api';
import { AlertInhibitRequestFailure, createAlertInhibitDraft, type AlertInhibit } from '../model/alert-inhibit-model';

const persisted: AlertInhibit = {
  id: 9,
  name: 'Critical suppresses warning',
  sourceLabels: { severity: 'critical' },
  targetLabels: { severity: 'warning' },
  equalLabels: ['service'],
  enable: true,
  gmtCreate: '2026-07-17T08:00:00',
  gmtUpdate: '2026-07-17T09:00:00'
};

describe('alert inhibit API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    transport.apiMessageDelete.mockResolvedValue(undefined);
    transport.apiMessageGet.mockResolvedValue(undefined);
    transport.apiMessagePost.mockResolvedValue(undefined);
    transport.apiMessagePut.mockResolvedValue(undefined);
  });

  it('parses list and detail reads instead of trusting transport generics', async () => {
    transport.apiMessageGet
      .mockResolvedValueOnce({ content: [persisted], totalElements: 1, totalPages: 1, number: 0, size: 8 })
      .mockResolvedValueOnce({ ...persisted, transportOnly: true });
    await expect(loadAlertInhibits({ search: 'critical', pageIndex: 0, pageSize: 8 })).resolves.toMatchObject({
      content: [persisted],
      totalElements: 1
    });
    await expect(loadAlertInhibit(9)).resolves.toEqual(persisted);
    expect(transport.apiMessageGet).toHaveBeenNthCalledWith(
      1,
      '/api/alert/inhibits?pageIndex=0&pageSize=8&sort=id&order=desc&search=critical'
    );
    expect(transport.apiMessageGet).toHaveBeenNthCalledWith(2, '/api/alert/inhibit/9');
  });

  it('forwards the caller AbortSignal for list reads', async () => {
    const signal = new AbortController().signal;
    transport.apiMessageGet.mockResolvedValue({ content: [], totalElements: 0, totalPages: 0, number: 0, size: 8 });

    await loadAlertInhibits({ search: '', pageIndex: 0, pageSize: 8 }, signal);

    expect(transport.apiMessageGet).toHaveBeenCalledWith(expect.any(String), { signal });
  });

  it('loads exact matched rules, counts missing ids, and forwards cancellation', async () => {
    const signal = new AbortController().signal;
    transport.apiMessageGet
      .mockResolvedValueOnce(persisted)
      .mockRejectedValueOnce(new ApiMessageError('missing', { status: 404 }));

    await expect(loadMatchedAlertInhibits([9, 10], signal)).resolves.toEqual({
      records: [persisted],
      missingCount: 1
    });
    expect(transport.apiMessageGet).toHaveBeenNthCalledWith(1, '/api/alert/inhibit/9', { signal });
    expect(transport.apiMessageGet).toHaveBeenNthCalledWith(2, '/api/alert/inhibit/10', { signal });
  });

  it('returns void from POST, PUT, toggle, and DELETE acknowledgements', async () => {
    transport.apiMessagePost.mockResolvedValue({ id: 99, leaked: true });
    transport.apiMessagePut.mockResolvedValue({ id: 9, leaked: true });
    transport.apiMessageDelete.mockResolvedValue({ id: 9, leaked: true });
    const draft = {
      ...createAlertInhibitDraft(),
      name: 'Policy',
      sourceLabelsText: 'severity:critical',
      targetLabelsText: 'severity:warning',
      equalLabels: ['service']
    };
    await expect(saveAlertInhibit(draft)).resolves.toBeUndefined();
    await expect(saveAlertInhibit({ ...draft, id: 9 })).resolves.toBeUndefined();
    await expect(updateAlertInhibitEnabled(persisted, false)).resolves.toBeUndefined();
    await expect(deleteAlertInhibit(9)).resolves.toBeUndefined();
    expect(transport.apiMessagePut).toHaveBeenLastCalledWith('/api/alert/inhibit', {
      id: 9,
      name: 'Critical suppresses warning',
      sourceLabels: { severity: 'critical' },
      targetLabels: { severity: 'warning' },
      equalLabels: ['service'],
      enable: false
    });
  });

  it('deletes a canonical id set in one request', async () => {
    await expect(deleteAlertInhibits([9, 7, 9])).resolves.toBeUndefined();

    expect(transport.apiMessageDelete).toHaveBeenCalledOnce();
    expect(transport.apiMessageDelete).toHaveBeenCalledWith('/api/alert/inhibits?ids=7&ids=9');
    await expect(deleteAlertInhibits([])).rejects.toThrow();
    await expect(deleteAlertInhibits([0])).rejects.toThrow();
  });

  it('normalizes every transport entry before leaving the API', async () => {
    const draft = {
      ...createAlertInhibitDraft(),
      name: 'Policy',
      sourceLabelsText: 'severity:critical',
      targetLabelsText: 'severity:warning',
      equalLabels: ['service']
    };

    transport.apiMessageGet.mockRejectedValueOnce(transportFailure());
    await expect(loadAlertInhibits({ search: '', pageIndex: 0, pageSize: 8 })).rejects.toBeInstanceOf(
      AlertInhibitRequestFailure
    );
    transport.apiMessageGet.mockRejectedValueOnce(transportFailure());
    await expect(loadAlertInhibit(9)).rejects.toBeInstanceOf(AlertInhibitRequestFailure);
    transport.apiMessagePost.mockRejectedValueOnce(transportFailure());
    await expect(saveAlertInhibit(draft)).rejects.toBeInstanceOf(AlertInhibitRequestFailure);
    transport.apiMessagePut.mockRejectedValueOnce(transportFailure());
    await expect(saveAlertInhibit({ ...draft, id: 9 })).rejects.toBeInstanceOf(AlertInhibitRequestFailure);
    transport.apiMessageDelete.mockRejectedValueOnce(transportFailure());
    await expect(deleteAlertInhibit(9)).rejects.toBeInstanceOf(AlertInhibitRequestFailure);
    transport.apiMessagePut.mockRejectedValueOnce(transportFailure());
    await expect(updateAlertInhibitEnabled(persisted, false)).rejects.toBeInstanceOf(AlertInhibitRequestFailure);
  });
});

function transportFailure() {
  return new ApiMessageError('private transport failure', { status: 503 });
}
