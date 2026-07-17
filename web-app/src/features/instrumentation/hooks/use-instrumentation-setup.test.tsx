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

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { InstrumentationRequestError } from '../api/instrumentation-api';

const dependencies = vi.hoisted(() => ({
  catalog: vi.fn(), guide: vi.fn(), loadCollectors: vi.fn()
}));
vi.mock('../controller/use-instrumentation-catalog-controller', () => ({
  useInstrumentationCatalogController: dependencies.catalog
}));
vi.mock('../controller/use-instrumentation-guide-controller', () => ({
  useInstrumentationGuideController: dependencies.guide
}));
vi.mock('../api/collector-api', () => ({ loadInstrumentationCollectors: dependencies.loadCollectors }));

import { useInstrumentationSetup } from './use-instrumentation-setup';

describe('instrumentation setup contract convergence', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('returns to selection and clears secret-bearing guide state before refreshing catalog', async () => {
    const clearSelection = vi.fn();
    const retry = vi.fn().mockResolvedValue(undefined);
    const clearContractState = vi.fn();
    dependencies.loadCollectors.mockResolvedValue([]);
    dependencies.catalog.mockReturnValue({
      draft: { environment: 'docker', platform: 'linux_amd64', collectorId: '', serviceName: '',
        serviceNamespace: '', serviceEnvironment: '' },
      state: { status: 'ready' }, catalog: { schemaVersion: 1, languages: [] }, retry, clearSelection,
      setEnvironment: vi.fn(), setPlatform: vi.fn(), setLanguage: vi.fn(), setFramework: vi.fn(),
      setMethod: vi.fn(), setContext: vi.fn(), restoreDraft: vi.fn()
    });
    dependencies.guide.mockReturnValue({
      state: { status: 'idle' }, guide: undefined, token: 'memory_only', setToken: vi.fn(), transientTarget: undefined,
      setTransientTarget: vi.fn(), render: vi.fn(), materializeSnippet: vi.fn(), reset: vi.fn(), clearContractState
    });
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const wrapper = ({ children }: { children: ReactNode }) => (
      <MemoryRouter><QueryClientProvider client={client}>{children}</QueryClientProvider></MemoryRouter>
    );
    const { result } = renderHook(() => useInstrumentationSetup(), { wrapper });
    act(() => result.current.setStage(5));
    expect(result.current.stage).toBe(5);

    await act(async () => {
      await result.current.handleContractError(new InstrumentationRequestError('instrumentation_selection_invalid'));
    });

    expect(result.current.stage).toBe(1);
    expect(clearSelection).toHaveBeenCalledOnce();
    expect(clearContractState).toHaveBeenCalledOnce();
    expect(retry).toHaveBeenCalledOnce();
  });
});
