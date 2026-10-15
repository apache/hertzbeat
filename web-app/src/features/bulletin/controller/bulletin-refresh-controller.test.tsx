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

import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { useBulletinRefreshController } from './bulletin-refresh-controller';

describe('Bulletin refresh controller', () => {
  it('rereads the definition list and selected metrics as one manual refresh', async () => {
    const listRefresh = vi.fn().mockResolvedValue(true);
    const metricsRefresh = vi.fn().mockResolvedValue(true);
    const hook = renderHook(() => useBulletinRefreshController(true, listRefresh, metricsRefresh));

    await act(async () => expect(hook.result.current.refresh()).resolves.toBe(true));

    expect(listRefresh).toHaveBeenCalledOnce();
    expect(metricsRefresh).toHaveBeenCalledOnce();
  });

  it('does not duplicate an admitted refresh and reports either failed reread', async () => {
    let releaseList!: (value: boolean) => void;
    const listRefresh = vi.fn(() => new Promise<boolean>(resolve => (releaseList = resolve)));
    const metricsRefresh = vi.fn().mockResolvedValue(false);
    const hook = renderHook(() => useBulletinRefreshController(true, listRefresh, metricsRefresh));

    let first!: Promise<boolean>;
    act(() => {
      first = hook.result.current.refresh();
    });
    await act(async () => expect(hook.result.current.refresh()).resolves.toBe(false));
    expect(listRefresh).toHaveBeenCalledOnce();
    expect(metricsRefresh).toHaveBeenCalledOnce();

    releaseList(true);
    await act(async () => expect(first).resolves.toBe(false));
  });

  it('rejects retained refresh commands after read access is retired', async () => {
    const listRefresh = vi.fn().mockResolvedValue(true);
    const metricsRefresh = vi.fn().mockResolvedValue(true);
    const hook = renderHook(({ canRead }) => useBulletinRefreshController(canRead, listRefresh, metricsRefresh), {
      initialProps: { canRead: true }
    });
    const retainedRefresh = hook.result.current.refresh;

    hook.rerender({ canRead: false });
    await act(async () => expect(retainedRefresh()).resolves.toBe(false));

    expect(listRefresh).not.toHaveBeenCalled();
    expect(metricsRefresh).not.toHaveBeenCalled();
  });
});
