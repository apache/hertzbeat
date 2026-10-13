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

import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { discoverAgentProviderModels } from '../api/agent-provider-models-api';
import { useAgentProviderModels } from './use-agent-provider-models';
import type { AgentProviderModelCatalog } from '../model/agent-provider-contract';

vi.mock('../api/agent-provider-models-api', () => ({ discoverAgentProviderModels: vi.fn() }));
const input = { type: 'protocol', code: 'openai-chat', baseUrl: 'https://example.invalid/v1', model: '' };
const ready: AgentProviderModelCatalog = { status: 'ready', models: [{ id: 'one', name: 'One' }], truncated: false };
afterEach(() => vi.resetAllMocks());

describe('provider model discovery lifecycle', () => {
  it('clears prior results and discards a late response after the destination changes', async () => {
    let finish!: (value: AgentProviderModelCatalog) => void;
    vi.mocked(discoverAgentProviderModels)
      .mockResolvedValueOnce(ready)
      .mockImplementationOnce(
        () =>
          new Promise(resolve => {
            finish = resolve;
          })
      );
    const { result } = renderHook(useAgentProviderModels);
    await act(() => result.current.discoverModels(input));
    expect(result.current.state.modelCatalog).toEqual(ready);
    let pending!: Promise<void>;
    act(() => {
      pending = result.current.discoverModels(input);
    });
    expect(result.current.state.modelCatalog).toBeUndefined();
    expect(result.current.state.modelsLoading).toBe(true);
    act(() => result.current.clearModels());
    expect(vi.mocked(discoverAgentProviderModels).mock.calls[1]?.[1].aborted).toBe(true);
    await act(async () => {
      finish(ready);
      await pending;
    });
    expect(result.current.state).toEqual({ modelsLoading: false });
  });

  it('shows a safe manual-entry fallback for transport failures', async () => {
    vi.mocked(discoverAgentProviderModels).mockRejectedValue(new Error('secret upstream details'));
    const { result } = renderHook(useAgentProviderModels);
    await act(() => result.current.discoverModels(input));
    expect(result.current.state.modelCatalog?.status).toBe('unavailable');
    expect(JSON.stringify(result.current.state)).not.toContain('secret');
  });

  it('aborts discovery when the editor is unmounted', async () => {
    vi.mocked(discoverAgentProviderModels).mockImplementation(() => new Promise(() => {}));
    const { result, unmount } = renderHook(useAgentProviderModels);
    act(() => {
      void result.current.discoverModels(input);
    });
    await waitFor(() => expect(discoverAgentProviderModels).toHaveBeenCalledOnce());
    unmount();
    expect(vi.mocked(discoverAgentProviderModels).mock.calls[0]?.[1].aborted).toBe(true);
  });
});
