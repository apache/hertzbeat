/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

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

  expect(hook.result.current.begin()).toBeTruthy();
});

it('explicitly retires only the selected owner and unlocks immediately', () => {
  const hook = renderHook(() => useExclusiveOperation('capability-operation'));
  let owner!: NonNullable<ReturnType<typeof hook.result.current.begin>>;
  act(() => {
    owner = hook.result.current.begin()!;
  });

  act(() => {
    expect(hook.result.current.retire({ token: Symbol('other') })).toBe(false);
    expect(hook.result.current.retire(owner)).toBe(true);
  });

  expect(hook.result.current.isCurrent(owner)).toBe(false);
  expect(hook.result.current.isLocked()).toBe(false);
  expect(hook.result.current.pending).toBe(false);
});

function StrictModeWrapper({ children }: PropsWithChildren) {
  return <StrictMode>{children}</StrictMode>;
}
