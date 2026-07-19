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

const feedback = vi.hoisted(() => ({ error: vi.fn(), success: vi.fn() }));

vi.mock('antd', () => ({ App: { useApp: () => ({ message: feedback }) } }));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));

import { useAlertSilenceOperationGate } from './use-alert-silence-operation-gate';

const labels = { success: 'operation.success', error: 'operation.error' };

describe('useAlertSilenceOperationGate', () => {
  beforeEach(() => vi.clearAllMocks());

  it('does not publish a late write failure after its owner unmounts', async () => {
    const write = deferred<void>();
    const view = renderHook(() => useAlertSilenceOperationGate());
    let operation!: Promise<void>;
    act(() => {
      operation = view.result.current.run({ write: () => write.promise, verify: vi.fn() }, labels);
    });

    view.unmount();
    await act(async () => {
      write.reject(new Error('private provider failure'));
      await operation;
    });

    expect(feedback.error).not.toHaveBeenCalled();
    expect(feedback.success).not.toHaveBeenCalled();
  });

  it('does not publish a late projection failure after its owner unmounts', async () => {
    const proof = deferred<void>();
    const verify = vi.fn(() => proof.promise);
    const view = renderHook(() => useAlertSilenceOperationGate());
    let operation!: Promise<void>;
    act(() => {
      operation = view.result.current.run({ write: () => Promise.resolve(), verify }, labels);
    });
    await waitFor(() => expect(verify).toHaveBeenCalledOnce());
    expect(feedback.success).toHaveBeenCalledWith(labels.success);

    view.unmount();
    await act(async () => {
      proof.reject(new Error('late projection failure'));
      await operation;
    });

    expect(feedback.error).not.toHaveBeenCalled();
  });
});

function deferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, reject, resolve };
}
