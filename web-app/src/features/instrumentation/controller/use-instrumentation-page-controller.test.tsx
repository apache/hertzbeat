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
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiMessageError } from '@/core/http/api-message';

import { CollectorContractError } from '../api/collector-api';
import { InstrumentationRequestError } from '../api/instrumentation-api';

const dependencies = vi.hoisted(() => ({
  catalog: vi.fn(),
  detection: vi.fn(),
  guide: vi.fn(),
  loadCollectors: vi.fn()
}));
vi.mock('../api/collector-api', async importOriginal => ({
  ...(await importOriginal<typeof import('../api/collector-api')>()),
  loadInstrumentationCollectors: dependencies.loadCollectors
}));
vi.mock('./use-instrumentation-catalog-controller', () => ({
  useInstrumentationCatalogController: dependencies.catalog
}));
vi.mock('./use-instrumentation-detection-controller', () => ({
  useInstrumentationDetectionController: dependencies.detection
}));
vi.mock('./use-instrumentation-guide-controller', () => ({
  useInstrumentationGuideController: dependencies.guide
}));

import { useInstrumentationPageController } from './use-instrumentation-page-controller';

describe('instrumentation page controller', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    dependencies.loadCollectors.mockResolvedValue([]);
    dependencies.detection.mockReturnValue({
      response: undefined,
      checking: false,
      error: undefined,
      start: vi.fn(),
      retry: vi.fn(),
      reset: vi.fn(),
      signalNames: ['metrics', 'logs', 'traces'],
      queryHandoff: vi.fn(),
      openQuery: vi.fn()
    });
  });

  it('returns to selection and clears secret-bearing guide state before refreshing catalog', async () => {
    const clearSelection = vi.fn();
    const retry = vi.fn().mockResolvedValue(undefined);
    const clearContractState = vi.fn();
    dependencies.catalog.mockReturnValue(catalogController(clearSelection, retry));
    dependencies.guide.mockReturnValue(guideController(clearContractState));
    const { result } = renderHook(() => useInstrumentationPageController(), { wrapper: queryWrapper() });

    act(() => result.current.setup.setStage(5));
    expect(result.current.setup.stage).toBe(5);

    await act(async () => {
      await result.current.setup.handleContractError(
        new InstrumentationRequestError('instrumentation_selection_invalid')
      );
    });

    expect(result.current.setup.stage).toBe(1);
    expect(clearSelection).toHaveBeenCalledOnce();
    expect(clearContractState).toHaveBeenCalledOnce();
    expect(retry).toHaveBeenCalledOnce();
  });

  it('owns detection request construction and navigation orchestration', () => {
    dependencies.catalog.mockReturnValue(catalogController(vi.fn(), vi.fn()));
    dependencies.guide.mockReturnValue(guideController(vi.fn()));
    const { result } = renderHook(() => useInstrumentationPageController(), { wrapper: queryWrapper() });
    const [createRequest, handleContractError, openPath] = dependencies.detection.mock.calls.at(-1)!;

    expect(createRequest(1_710_000_000_000)).toMatchObject({
      schemaVersion: 1,
      collectorId: 'collector-east',
      startedAt: 1_710_000_000_000,
      service: { name: 'checkout-api', namespace: 'commerce', environment: 'prod' }
    });
    expect(handleContractError).toBe(result.current.setup.handleContractError);
    expect(openPath).toEqual(expect.any(Function));
  });

  it('uses an unambiguous detection identity for user-controlled service context', () => {
    const separator = '\u001f';
    const first = catalogController(vi.fn(), vi.fn());
    first.draft.serviceName = `checkout${separator}commerce`;
    first.draft.serviceNamespace = 'prod';
    const second = catalogController(vi.fn(), vi.fn());
    second.draft.serviceName = 'checkout';
    second.draft.serviceNamespace = `commerce${separator}prod`;
    dependencies.catalog.mockReturnValue(first);
    dependencies.guide.mockReturnValue(guideController(vi.fn()));
    const view = renderHook(() => useInstrumentationPageController(), { wrapper: queryWrapper() });
    const firstIdentity = dependencies.detection.mock.calls.at(-1)?.[3];

    dependencies.catalog.mockReturnValue(second);
    view.rerender();
    const secondIdentity = dependencies.detection.mock.calls.at(-1)?.[3];

    expect(firstIdentity).not.toBe(secondIdentity);
  });

  it('does not let a retired guide render advance a newer setup stage', async () => {
    const rendering = deferred<unknown>();
    const reset = vi.fn();
    dependencies.catalog.mockReturnValue(catalogController(vi.fn(), vi.fn()));
    dependencies.guide.mockReturnValue({
      ...guideController(vi.fn()),
      render: vi.fn(() => rendering.promise),
      reset
    });
    const { result } = renderHook(() => useInstrumentationPageController(), { wrapper: queryWrapper() });
    act(() => result.current.setup.setStage(3));

    let pending: Promise<unknown>;
    act(() => {
      pending = result.current.setup.renderGuide();
    });
    act(() => result.current.setup.setStage(2));
    rendering.resolve(undefined);
    await act(async () => void (await pending!));

    expect(result.current.setup.stage).toBe(2);
    expect(reset).toHaveBeenCalled();
  });

  it('keeps a complete empty Collector inventory in the ready state', async () => {
    dependencies.catalog.mockReturnValue(catalogController(vi.fn(), vi.fn()));
    dependencies.guide.mockReturnValue(guideController(vi.fn()));
    const { result } = renderHook(() => useInstrumentationPageController(), { wrapper: queryWrapper() });

    await waitFor(() => expect(result.current.setup.collectorsState).toEqual({ status: 'ready' }));
    expect(result.current.setup.collectors).toEqual([]);
  });

  it.each([
    ['contract failure', new CollectorContractError(), 'error'],
    ['transport unavailability', new ApiMessageError('service unavailable', { status: 503 }), 'unavailable']
  ] as const)('classifies %s without inventing an empty inventory', async (_label, failure, status) => {
    dependencies.loadCollectors.mockRejectedValue(failure);
    dependencies.catalog.mockReturnValue(catalogController(vi.fn(), vi.fn()));
    dependencies.guide.mockReturnValue(guideController(vi.fn()));
    const { result } = renderHook(() => useInstrumentationPageController(), { wrapper: queryWrapper() });

    await waitFor(() => expect(result.current.setup.collectorsState).toEqual({ status }));
    expect(result.current.setup.collectors).toEqual([]);
  });
});

function queryWrapper() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <MemoryRouter>
        <QueryClientProvider client={client}>{children}</QueryClientProvider>
      </MemoryRouter>
    );
  };
}

function catalogController(clearSelection: ReturnType<typeof vi.fn>, retry: ReturnType<typeof vi.fn>) {
  return {
    draft: {
      environment: 'docker',
      platform: 'linux_amd64',
      selection: {
        language: 'go',
        framework: 'go_generic',
        method: 'sdk',
        environment: 'docker',
        platform: 'linux_amd64'
      },
      collectorId: 'collector-east',
      serviceName: 'checkout-api',
      serviceNamespace: 'commerce',
      serviceEnvironment: 'prod'
    },
    state: { status: 'ready' },
    catalog: { schemaVersion: 1, languages: [] },
    retry,
    clearSelection,
    setEnvironment: vi.fn(),
    setPlatform: vi.fn(),
    setLanguage: vi.fn(),
    setFramework: vi.fn(),
    setMethod: vi.fn(),
    setContext: vi.fn(),
    restoreDraft: vi.fn()
  };
}

function guideController(clearContractState: ReturnType<typeof vi.fn>) {
  return {
    state: { status: 'idle' },
    guide: undefined,
    token: 'memory_only',
    setToken: vi.fn(),
    transientTarget: undefined,
    setTransientTarget: vi.fn(),
    render: vi.fn(),
    materializeSnippet: vi.fn(),
    clearContractState,
    reset: vi.fn()
  };
}

function deferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((done, fail) => {
    resolve = done;
    reject = fail;
  });
  return { promise, resolve, reject };
}
