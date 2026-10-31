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
import { listAgentTranscriptPage } from './agent-transcript-api';
const api = vi.hoisted(() => ({ apiMessageGet: vi.fn() }));
vi.mock('@/core/http/api-message', () => api);
const page = (content: unknown[]) => ({ content, number: 0, totalPages: 1, totalElements: content.length, size: 200 });
const entry = (messageRole: string, payloadJson: string, id = 1) => ({
  id,
  sessionSequence: id,
  messageRole,
  payloadJson,
  gmtCreate: null
});
describe('internal task checkpoints at the transcript boundary', () => {
  beforeEach(() => vi.clearAllMocks());
  it('keeps the real user message and never parses or renders internal checkpoint payloads', async () => {
    api.apiMessageGet.mockResolvedValue(
      page([
        entry(
          'user',
          JSON.stringify({ role: 'user', content: [{ type: 'text', text: 'Create two loopback monitors.' }] })
        ),
        entry('taskCheckpoint', 'internal server metadata', 2)
      ])
    );
    const result = await listAgentTranscriptPage('owned-session');
    expect(result.items).toHaveLength(1);
    expect(result.items[0]?.text).toBe('Create two loopback monitors.');
  });
  it('continues to reject malformed public messages instead of treating missing content as empty', async () => {
    api.apiMessageGet.mockResolvedValue(page([entry('user', 'invalid-json')]));
    await expect(listAgentTranscriptPage('owned-session')).rejects.toThrow('Invalid agent transcript payload');
  });
});
