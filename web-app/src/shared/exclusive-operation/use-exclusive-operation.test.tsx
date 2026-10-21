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
import { StrictMode, type PropsWithChildren } from 'react';
import { expect, it } from 'vitest';

import { useExclusiveOperation } from './use-exclusive-operation';

it('retires a pending operation owner when its controller unmounts', () => {
  const hook = renderHook(() => useExclusiveOperation('test-operation'));
  let owner!: NonNullable<ReturnType<typeof hook.result.current.begin>>;
  act(() => {
    owner = hook.result.current.begin()!;
  });

  hook.unmount();

  expect(hook.result.current.isCurrent(owner)).toBe(false);
});

it('accepts an owner after the Strict Mode effect replay', () => {
  const hook = renderHook(() => useExclusiveOperation('strict-operation'), { wrapper: StrictModeWrapper });

  expect(typeof hook.result.current.begin()).toBe('symbol');
});

it('explicitly retires only the selected owner and unlocks immediately', () => {
  const hook = renderHook(() => useExclusiveOperation('capability-operation'));
  let owner!: NonNullable<ReturnType<typeof hook.result.current.begin>>;
  act(() => {
    owner = hook.result.current.begin()!;
  });

  act(() => {
    expect(hook.result.current.retire(Symbol('other'))).toBe(false);
    expect(hook.result.current.retire(owner)).toBe(true);
  });

  expect(hook.result.current.isCurrent(owner)).toBe(false);
  expect(hook.result.current.isLocked()).toBe(false);
  expect(hook.result.current.pending).toBe(false);
});

function StrictModeWrapper({ children }: PropsWithChildren) {
  return <StrictMode>{children}</StrictMode>;
}
