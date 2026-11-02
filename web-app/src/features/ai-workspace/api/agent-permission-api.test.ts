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
const api = vi.hoisted(() => ({ apiMessageGet: vi.fn(), apiMessagePost: vi.fn() }));
vi.mock('@/core/http/api-message', () => api);
import { getAgentPermission, createAgentPermissionChallenge, confirmAgentPermission } from './agent-permission-api';
const base = {
  sessionUid: 'ags-test',
  mode: 'MANUAL',
  generation: 0,
  expiresAt: 0,
  serverNow: 10000,
  fullAllowed: true,
  noticeVersion: 1,
  revocationGuardVersion: 1,
  scope: 'CURRENT_USER_SESSION_NORMAL_APPLICATION_WRITES'
};
const challenge = {
  sessionUid: 'ags-test',
  challengeId: '123e4567-e89b-42d3-a456-426614174000',
  generation: 1,
  notBefore: 15000,
  expiresAt: 130000,
  serverNow: 10000,
  noticeVersion: 1
};
beforeEach(() => vi.clearAllMocks());
describe('permission wire boundary', () => {
  it('rejects foreign scope and invalid early review windows', async () => {
    api.apiMessageGet.mockResolvedValue({ ...base, sessionUid: 'foreign' });
    await expect(getAgentPermission('ags-test')).rejects.toThrow();
    api.apiMessagePost.mockResolvedValue({ ...challenge, scope: base.scope, notBefore: 14999 });
    await expect(createAgentPermissionChallenge('ags-test')).rejects.toThrow();
  });
  it('rejects a server without the fresh revocation guard', async () => {
    const oldServer = { ...base, revocationGuardVersion: undefined };
    api.apiMessageGet.mockResolvedValue(oldServer);
    await expect(getAgentPermission('ags-test')).rejects.toThrow();
  });
  it('confirms only the exact challenge fields without caller identity overrides', async () => {
    api.apiMessagePost.mockResolvedValue({ ...base, mode: 'FULL', generation: 2, expiresAt: 910000 });
    await confirmAgentPermission('ags-test', challenge, true);
    expect(api.apiMessagePost).toHaveBeenCalledWith('/api/agent/sessions/ags-test/permission-mode/confirm', {
      challengeId: challenge.challengeId,
      generation: 1,
      noticeVersion: 1,
      acknowledged: true
    });
  });
});
