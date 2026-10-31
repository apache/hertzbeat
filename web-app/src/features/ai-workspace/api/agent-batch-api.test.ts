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

import { describe, expect, it, vi } from 'vitest';
import { agentBatchSchema, streamAgentBatch, agentBatchPath, agentBatchContinuePath } from './agent-batch-api';
import { batchFixture } from '../model/agent-batch-fixture';
const api = vi.hoisted(() => ({ apiStreamFetch: vi.fn() }));
vi.mock('@/core/http/http-client', () => api);
describe('frozen batch wire boundary', () => {
  it('rejects mismatched counts and unknown fields', () => {
    expect(agentBatchSchema.safeParse(batchFixture()).success).toBe(true);
    expect(agentBatchSchema.safeParse({ ...batchFixture(), verified: 50 }).success).toBe(false);
    expect(agentBatchSchema.safeParse({ ...batchFixture(), injectedBudget: 1000 }).success).toBe(false);
  });
  it('retains exact native IDs beyond JavaScript numeric precision', () => {
    const batch = batchFixture();
    batch.items[0]!.monitorId = '9007199254740993';
    expect(agentBatchSchema.parse(batch).items[0]!.monitorId).toBe('9007199254740993');
  });
  it('sends only the frozen hash and source UID, never arguments or a budget', async () => {
    expect(agentBatchPath('root/1')).toBe('/api/agent/runs/root%2F1/batch');
    expect(agentBatchContinuePath('root/1')).toBe('/api/agent/runs/root%2F1/batch/continue');
    api.apiStreamFetch.mockResolvedValue(new Response('', { headers: { 'Content-Type': 'text/event-stream' } }));
    await streamAgentBatch({ runUid: 'root/1', planHash: 'a'.repeat(64) }, vi.fn());
    expect(api.apiStreamFetch).toHaveBeenCalledWith(
      '/api/agent/runs/root%2F1/batch/continue',
      expect.objectContaining({
        body: JSON.stringify({ planHash: 'a'.repeat(64) }),
        method: 'POST'
      })
    );
  });
});
