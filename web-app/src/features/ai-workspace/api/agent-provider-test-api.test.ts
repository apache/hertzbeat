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

import { apiMessageDelete, apiMessagePost } from '@/core/http/api-message';

import { cancelAgentProviderTest, testAgentProvider } from './agent-provider-test-api';

vi.mock('@/core/http/api-message', () => ({ apiMessagePost: vi.fn(), apiMessageDelete: vi.fn() }));
describe('provider test wire boundary', () => {
  it('uses authenticated HTTP and accepts only the redacted result contract', async () => {
    const result = {
      protocol: 'responses',
      model: 'fixture',
      elapsedMs: 9,
      category: 'AUTHENTICATION',
      httpStatus: 401
    };
    vi.mocked(apiMessagePost).mockResolvedValue(result);
    const input = {
      type: 'openai-compatible',
      code: 'custom',
      model: 'fixture',
      baseUrl: 'https://fixture.invalid/v1'
    };
    const signal = new AbortController().signal;
    await expect(testAgentProvider('fixture-id', input, signal)).resolves.toEqual(result);
    expect(apiMessagePost).toHaveBeenCalledWith(
      '/api/agent/model-providers/connection-tests',
      { requestId: 'fixture-id', config: input },
      { signal }
    );
    vi.mocked(apiMessagePost).mockResolvedValue({ ...result, rawResponse: 'synthetic-private-fixture' });
    await expect(testAgentProvider('fixture-id', input, signal)).rejects.toThrow();
  });
  it('bounds cancellation and never sends form fields to the cancellation path', async () => {
    await cancelAgentProviderTest('fixture-id');
    expect(apiMessageDelete).toHaveBeenCalledWith('/api/agent/model-providers/connection-tests/fixture-id', {
      signal: expect.any(AbortSignal)
    });
  });
});
