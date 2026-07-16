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
  classifyAlertGroupReadError,
  deleteAlertGroup,
  loadAlertGroup,
  loadAlertGroups,
  saveAlertGroup,
  updateAlertGroupEnabled
} from './alert-group-api';
import {
  AlertGroupContractError,
  AlertGroupMissingError,
  createAlertGroupDraft,
  type AlertGroupConverge
} from './alert-group-model';

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

    await expect(loadAlertGroups({ search: '', pageIndex: 0, pageSize: 8 }))
      .resolves.toMatchObject({ content: [persisted], totalElements: 1 });
    await expect(loadAlertGroup(7)).resolves.toEqual(persisted);
    expect(transport.apiMessageGet).toHaveBeenNthCalledWith(
      1, '/api/alert/groups?pageIndex=0&pageSize=8&sort=id&order=desc'
    );
    expect(transport.apiMessageGet).toHaveBeenNthCalledWith(2, '/api/alert/group/7');
  });

  it('returns void acknowledgements and never treats response data as a canonical entity', async () => {
    transport.apiMessagePost.mockResolvedValue({ id: 99, leaked: true });
    transport.apiMessagePut.mockResolvedValue({ id: 7, leaked: true });
    transport.apiMessageDelete.mockResolvedValue({ id: 7, leaked: true });
    const draft = { ...createAlertGroupDraft(), name: 'By service', groupLabels: ['service'] };

    await expect(saveAlertGroup(draft)).resolves.toBeUndefined();
    await expect(saveAlertGroup({ ...draft, id: 7 })).resolves.toBeUndefined();
    await expect(updateAlertGroupEnabled(persisted, false)).resolves.toBeUndefined();
    await expect(deleteAlertGroup(7)).resolves.toBeUndefined();
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

  it.each([
    ['missing custom detail', new AlertGroupMissingError(), 'missing'],
    ['backend missing detail', new ApiMessageError('missing', { code: 3, status: 200 }), 'missing'],
    ['HTTP missing detail', new ApiMessageError('missing', { status: 404 }), 'missing'],
    ['network failure', new ApiMessageError('offline', { cause: new TypeError('fetch') }), 'unavailable'],
    ['gateway failure', new ApiMessageError('gateway', { status: 503 }), 'unavailable'],
    ['malformed response', new AlertGroupContractError('invalid'), 'error'],
    ['server error', new ApiMessageError('failed', { status: 500 }), 'error'],
    ['unknown error', new Error('failed'), 'error']
  ])('classifies %s without collapsing missing, unavailable, and error', (_label, reason, expected) => {
    expect(classifyAlertGroupReadError(reason)).toBe(expected);
  });
});
