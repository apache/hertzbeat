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
  deleteAlertGroups,
  loadAlertGroup,
  loadAlertGroups,
  saveAlertGroup,
  updateAlertGroupEnabled
} from './alert-group-api';
import { AlertGroupRequestFailure, createAlertGroupDraft, type AlertGroupConverge } from '../model/alert-group-model';

const persisted: AlertGroupConverge = {
  id: 7,
  name: 'By service',
  groupLabels: ['service'],
  groupWait: 30,
  groupInterval: 300,
  repeatInterval: 0,
  enable: true,
  creator: 'operator',
  modifier: null,
  gmtCreate: '2026-07-17T08:00:00',
  gmtUpdate: '2026-07-17T09:00:00'
};

describe('alert group API', () => {
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

    await expect(loadAlertGroups({ search: '', pageIndex: 0, pageSize: 8 })).resolves.toMatchObject({
      content: [persisted],
      totalElements: 1
    });
    await expect(loadAlertGroup(7)).resolves.toEqual(persisted);
    expect(transport.apiMessageGet).toHaveBeenNthCalledWith(
      1,
      '/api/alert/groups?pageIndex=0&pageSize=8&sort=id&order=desc'
    );
    expect(transport.apiMessageGet).toHaveBeenNthCalledWith(2, '/api/alert/group/7');
  });

  it('owns backend pagination, sorting, and search request assembly', async () => {
    transport.apiMessageGet.mockResolvedValue({
      content: [],
      totalElements: 0,
      totalPages: 0,
      number: 1,
      size: 15
    });

    await loadAlertGroups({ search: 'service', pageIndex: 1, pageSize: 15 });

    expect(transport.apiMessageGet).toHaveBeenCalledWith(
      '/api/alert/groups?pageIndex=1&pageSize=15&sort=id&order=desc&search=service'
    );
  });

  it('forwards caller cancellation for list reads', async () => {
    const signal = new AbortController().signal;
    const query = { search: '', pageIndex: 0, pageSize: 8 };
    transport.apiMessageGet.mockResolvedValue({
      content: [],
      totalElements: 0,
      totalPages: 0,
      number: 0,
      size: 8
    });

    await loadAlertGroups(query, signal);

    expect(transport.apiMessageGet).toHaveBeenCalledWith(
      '/api/alert/groups?pageIndex=0&pageSize=8&sort=id&order=desc',
      { signal }
    );
  });

  it('returns void acknowledgements and never treats response data as a canonical entity', async () => {
    transport.apiMessagePost.mockResolvedValue({ id: 99, leaked: true });
    transport.apiMessagePut.mockResolvedValue({ id: 7, leaked: true });
    transport.apiMessageDelete.mockResolvedValue({ id: 7, leaked: true });
    const draft = { ...createAlertGroupDraft(), name: 'By service', groupLabels: ['service'] };

    await expect(saveAlertGroup(draft)).resolves.toBeUndefined();
    await expect(saveAlertGroup({ ...draft, id: 7 })).resolves.toBeUndefined();
    await expect(updateAlertGroupEnabled(persisted, false)).resolves.toBeUndefined();
    await expect(deleteAlertGroups([7])).resolves.toBeUndefined();
    expect(transport.apiMessagePut).toHaveBeenLastCalledWith('/api/alert/group', {
      id: 7,
      name: 'By service',
      groupLabels: ['service'],
      groupWait: 30,
      groupInterval: 300,
      repeatInterval: 0,
      enable: false
    });
  });

  it('canonicalizes a batch delete into one repeated-id request', async () => {
    await expect(deleteAlertGroups([9, 7, 9])).resolves.toBeUndefined();

    expect(transport.apiMessageDelete).toHaveBeenCalledWith('/api/alert/groups?ids=7&ids=9');
    await expect(deleteAlertGroups([])).rejects.toThrow();
    await expect(deleteAlertGroups([0])).rejects.toThrow();
    expect(transport.apiMessageDelete).toHaveBeenCalledTimes(1);
  });

  it('normalizes every transport entry before leaving the API', async () => {
    const draft = { ...createAlertGroupDraft(), name: 'By service', groupLabels: ['service'] };

    transport.apiMessageGet.mockRejectedValueOnce(transportFailure());
    await expect(loadAlertGroups({ search: '', pageIndex: 0, pageSize: 8 })).rejects.toBeInstanceOf(
      AlertGroupRequestFailure
    );
    transport.apiMessageGet.mockRejectedValueOnce(transportFailure());
    await expect(loadAlertGroup(7)).rejects.toBeInstanceOf(AlertGroupRequestFailure);
    transport.apiMessagePost.mockRejectedValueOnce(transportFailure());
    await expect(saveAlertGroup(draft)).rejects.toBeInstanceOf(AlertGroupRequestFailure);
    transport.apiMessagePut.mockRejectedValueOnce(transportFailure());
    await expect(saveAlertGroup({ ...draft, id: 7 })).rejects.toBeInstanceOf(AlertGroupRequestFailure);
    transport.apiMessageDelete.mockRejectedValueOnce(transportFailure());
    await expect(deleteAlertGroups([7])).rejects.toBeInstanceOf(AlertGroupRequestFailure);
    transport.apiMessagePut.mockRejectedValueOnce(transportFailure());
    await expect(updateAlertGroupEnabled(persisted, false)).rejects.toBeInstanceOf(AlertGroupRequestFailure);
  });
});

function transportFailure() {
  return new ApiMessageError('private transport failure', { status: 503 });
}
