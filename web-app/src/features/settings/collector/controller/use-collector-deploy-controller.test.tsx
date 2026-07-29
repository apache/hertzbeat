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

import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiMessageError } from '@/core/http/api-message';

import { CollectorDeployContractError, generateCollectorDeployInfo } from '../api/collector-deploy-api';
import { collectorActionCapabilities } from '../model/collector-action-capability';
import { useCollectorDeployController } from './use-collector-deploy-controller';

vi.mock('../api/collector-deploy-api', async importOriginal => ({
  ...(await importOriginal<typeof import('../api/collector-deploy-api')>()),
  generateCollectorDeployInfo: vi.fn()
}));

const generate = vi.mocked(generateCollectorDeployInfo);
const deployment = { identity: 'edge', host: '10.0.0.7' };

describe('useCollectorDeployController', () => {
  beforeEach(() => vi.clearAllMocks());

  it.each(['ADMIN', 'USER'])('admits the %s write role and keeps the result in dialog memory', async role => {
    generate.mockResolvedValue(deployment);
    const canWrite = collectorActionCapabilities([role]).canWrite;
    const { result } = renderHook(() => useCollectorDeployController({ canWrite }));

    act(() => result.current.open());
    await act(() => result.current.submit(' edge '));

    expect(generate).toHaveBeenCalledWith('edge', expect.any(AbortSignal));
    expect(result.current.state).toEqual({ kind: 'ready', collector: 'edge', deployment });
  });

  it('gives GUEST no open or submit transport path', async () => {
    const { result } = renderHook(() =>
      useCollectorDeployController({ canWrite: collectorActionCapabilities(['GUEST']).canWrite })
    );

    act(() => result.current.open());
    await act(() => result.current.submit('edge'));

    expect(result.current.state).toEqual({ kind: 'closed' });
    expect(generate).not.toHaveBeenCalled();
  });

  it.each([
    ['permission', 'permission', new ApiMessageError('raw permission', { status: 403 })],
    ['validation (400)', 'validation', new ApiMessageError('raw validation', { status: 400 })],
    ['validation (422)', 'validation', new ApiMessageError('raw validation', { status: 422 })],
    ['unavailable', 'unavailable', new ApiMessageError('raw unavailable', { status: 503 })],
    ['contract', 'contract', new CollectorDeployContractError()],
    ['error', 'error', new Error('raw unexpected detail')]
  ] as const)('classifies %s without retaining raw failure details', async (_label, failure, error) => {
    generate.mockRejectedValue(error);
    const { result } = renderHook(() => useCollectorDeployController({ canWrite: true }));
    act(() => result.current.open());

    await act(() => result.current.submit('edge'));

    expect(result.current.state).toEqual({ kind: 'failed', collector: 'edge', failure });
    expect(JSON.stringify(result.current.state)).not.toContain('raw');
  });

  it.each([
    ['same', 'edge'],
    ['corrected', 'edge-west']
  ])('submits the %s identity after an unavailable failure', async (_case, collector) => {
    const nextDeployment = { identity: collector, host: '10.0.0.8' };
    generate
      .mockRejectedValueOnce(new ApiMessageError('offline', { status: 503 }))
      .mockResolvedValueOnce(nextDeployment);
    const { result } = renderHook(() => useCollectorDeployController({ canWrite: true }));
    act(() => result.current.open());
    await act(() => result.current.submit('edge'));

    await act(() => result.current.submit(collector));

    expect(generate).toHaveBeenCalledTimes(2);
    expect(result.current.state).toEqual({ kind: 'ready', collector, deployment: nextDeployment });
  });

  it('rejects duplicate commands while pending or ready without another API request', async () => {
    const request = deferred<typeof deployment>();
    generate.mockReturnValue(request.promise);
    const { result } = renderHook(() => useCollectorDeployController({ canWrite: true }));
    act(() => result.current.open());
    let completion!: Promise<void>;
    act(() => {
      completion = result.current.submit('edge');
      void result.current.submit('other');
    });
    expect(generate).toHaveBeenCalledOnce();
    request.resolve(deployment);
    await act(() => completion);

    await act(() => result.current.submit('other'));

    expect(generate).toHaveBeenCalledOnce();
    expect(result.current.state).toEqual({ kind: 'ready', collector: 'edge', deployment });
  });

  it.each(['cancel', 'close', 'role-loss', 'unmount'] as const)(
    'retires a pending completion after %s',
    async retirement => {
      const request = deferred<typeof deployment>();
      generate.mockReturnValue(request.promise);
      const { result, rerender, unmount } = renderHook(
        ({ canWrite }: { canWrite: boolean }) => useCollectorDeployController({ canWrite }),
        { initialProps: { canWrite: true } }
      );
      act(() => result.current.open());
      let completion!: Promise<void>;
      act(() => {
        completion = result.current.submit('edge');
      });
      await waitFor(() => expect(generate).toHaveBeenCalledOnce());

      if (retirement === 'cancel') act(() => result.current.cancel());
      if (retirement === 'close') act(() => result.current.close());
      if (retirement === 'role-loss') rerender({ canWrite: false });
      if (retirement === 'unmount') unmount();
      request.resolve(deployment);
      await act(() => completion);

      if (retirement !== 'unmount') expect(result.current.state).toEqual({ kind: 'closed' });
    }
  );
});

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(fulfill => {
    resolve = fulfill;
  });
  return { promise, resolve };
}
