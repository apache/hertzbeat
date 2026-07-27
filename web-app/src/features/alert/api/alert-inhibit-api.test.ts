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
  loadAllAlertInhibits,
  loadAlertInhibit,
  loadAlertInhibitPrefillAlerts,
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

  it('walks every authoritative page for create identity proof', async () => {
    const records = Array.from({ length: 26 }, (_, index) => ({ ...persisted, id: index + 1 }));
    transport.apiMessageGet
      .mockResolvedValueOnce({
        content: records.slice(0, 25),
        totalElements: 26,
        totalPages: 2,
        number: 0,
        size: 25
      })
      .mockResolvedValueOnce({
        content: records.slice(25),
        totalElements: 26,
        totalPages: 2,
        number: 1,
        size: 25
      });

    await expect(loadAllAlertInhibits()).resolves.toEqual(records);
    expect(transport.apiMessageGet).toHaveBeenNthCalledWith(
      1,
      '/api/alert/inhibits?pageIndex=0&pageSize=25&sort=id&order=desc'
    );
    expect(transport.apiMessageGet).toHaveBeenNthCalledWith(
      2,
      '/api/alert/inhibits?pageIndex=1&pageSize=25&sort=id&order=desc'
    );
  });

  it('rejects an oversized, changing, or globally duplicate proof page set', async () => {
    const fullPage = Array.from({ length: 25 }, (_, index) => ({ ...persisted, id: index + 1 }));
    transport.apiMessageGet.mockResolvedValueOnce({
      content: fullPage,
      totalElements: 501,
      totalPages: 21,
      number: 0,
      size: 25
    });
    await expect(loadAllAlertInhibits()).rejects.toThrow('bounded scan limit');
    expect(transport.apiMessageGet).toHaveBeenCalledOnce();

    transport.apiMessageGet.mockReset();
    transport.apiMessageGet
      .mockResolvedValueOnce({
        content: fullPage,
        totalElements: 26,
        totalPages: 2,
        number: 0,
        size: 25
      })
      .mockResolvedValueOnce({
        content: [
          { ...persisted, id: 26 },
          { ...persisted, id: 27 }
        ],
        totalElements: 27,
        totalPages: 2,
        number: 1,
        size: 25
      });
    await expect(loadAllAlertInhibits()).rejects.toThrow('page set changed');

    transport.apiMessageGet.mockReset();
    transport.apiMessageGet
      .mockResolvedValueOnce({
        content: fullPage,
        totalElements: 26,
        totalPages: 2,
        number: 0,
        size: 25
      })
      .mockResolvedValueOnce({
        content: [{ ...persisted, id: 1 }],
        totalElements: 26,
        totalPages: 2,
        number: 1,
        size: 25
      });
    await expect(loadAllAlertInhibits()).rejects.toThrow('full scan');
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

  it('loads a bounded page of firing entity alerts for authoring evidence', async () => {
    const signal = new AbortController().signal;
    transport.apiMessageGet.mockResolvedValue({
      content: [{ id: 71, labels: { service: 'checkout' } }],
      totalElements: 1,
      totalPages: 1,
      number: 0,
      size: 20
    });

    await expect(loadAlertInhibitPrefillAlerts(7, signal)).resolves.toEqual([{ labels: { service: 'checkout' } }]);
    expect(transport.apiMessageGet).toHaveBeenCalledWith(
      '/api/entities/7/alerts?pageIndex=0&pageSize=20&status=firing',
      { signal }
    );
    await expect(loadAlertInhibitPrefillAlerts(0)).rejects.toThrow();
    expect(transport.apiMessageGet).toHaveBeenCalledTimes(1);
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
