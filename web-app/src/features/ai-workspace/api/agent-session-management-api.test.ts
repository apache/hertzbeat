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
import {
  agentSessionManagementPaths,
  deleteAgentSessions,
  previewAgentSessionDeletion
} from './agent-session-management-api';
const http = vi.hoisted(() => ({ apiMessageGet: vi.fn(), apiMessagePost: vi.fn() }));
vi.mock('@/core/http/api-message', () => http);

describe('session management wire contract', () => {
  beforeEach(() => vi.clearAllMocks());
  it('reads a bounded exact preview', async () => {
    http.apiMessageGet.mockResolvedValue({ sessionUids: ['ags_1'], activeCount: 0 });
    expect(await previewAgentSessionDeletion()).toEqual({ sessionUids: ['ags_1'], activeCount: 0 });
    expect(http.apiMessageGet).toHaveBeenCalledWith(agentSessionManagementPaths.preview);
  });
  it('sends only explicit selection after confirmation and checks the result count', async () => {
    http.apiMessagePost.mockResolvedValue({ deletedCount: 2 });
    await deleteAgentSessions(['ags_1', 'ags_2']);
    expect(http.apiMessagePost).toHaveBeenCalledWith(agentSessionManagementPaths.delete, {
      sessionUids: ['ags_1', 'ags_2'],
      confirmed: true
    });
    http.apiMessagePost.mockResolvedValue({ deletedCount: 1 });
    await expect(deleteAgentSessions(['ags_1', 'ags_2'])).rejects.toThrow();
  });
  it('rejects malformed preview counts and public identifiers', async () => {
    http.apiMessageGet.mockResolvedValue({ sessionUids: ['other-user'], activeCount: -1 });
    await expect(previewAgentSessionDeletion()).rejects.toThrow();
  });
});
