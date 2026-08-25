/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { useShellFullscreenAction } from './use-shell-fullscreen-action';

describe('useShellFullscreenAction', () => {
  it('asks the browser to hide navigation chrome before entering fullscreen', async () => {
    const requestFullscreen = vi.fn().mockResolvedValue(undefined);
    const exitFullscreen = vi.fn().mockResolvedValue(undefined);
    const requestDescriptor = Object.getOwnPropertyDescriptor(document.documentElement, 'requestFullscreen');
    const exitDescriptor = Object.getOwnPropertyDescriptor(document, 'exitFullscreen');
    Object.defineProperty(document.documentElement, 'requestFullscreen', {
      configurable: true,
      value: requestFullscreen
    });
    Object.defineProperty(document, 'exitFullscreen', { configurable: true, value: exitFullscreen });

    const { result, unmount } = renderHook(() => useShellFullscreenAction());
    try {
      await act(async () => expect(result.current.toggle()).resolves.toBe('changed'));
      expect(requestFullscreen).toHaveBeenCalledWith({ navigationUI: 'hide' });
    } finally {
      unmount();
      restoreProperty(document.documentElement, 'requestFullscreen', requestDescriptor);
      restoreProperty(document, 'exitFullscreen', exitDescriptor);
    }
  });

  it('tracks browser fullscreen events and toggles through the runtime boundary', async () => {
    const runtime = fullscreenRuntime();
    const { result, unmount } = renderHook(() => useShellFullscreenAction(runtime));

    expect(result.current.state).toEqual({ available: true, active: false, busy: false });
    await act(async () => expect(result.current.toggle()).resolves.toBe('changed'));
    expect(runtime.enter).toHaveBeenCalledOnce();
    expect(result.current.state).toEqual({ available: true, active: true, busy: false });

    await act(async () => expect(result.current.toggle()).resolves.toBe('changed'));
    expect(runtime.exit).toHaveBeenCalledOnce();
    expect(result.current.state).toEqual({ available: true, active: false, busy: false });

    unmount();
    expect(runtime.unsubscribe).toHaveBeenCalledOnce();
  });

  it('hides unsupported capability and contains browser rejection', async () => {
    const unsupported = fullscreenRuntime(false);
    const rejected = fullscreenRuntime();
    rejected.enter.mockRejectedValueOnce(new Error('browser denied'));

    const hidden = renderHook(() => useShellFullscreenAction(unsupported));
    await expect(hidden.result.current.toggle()).resolves.toBe('unavailable');
    expect(unsupported.enter).not.toHaveBeenCalled();

    const denied = renderHook(() => useShellFullscreenAction(rejected));
    await act(async () => expect(denied.result.current.toggle()).resolves.toBe('error'));
    expect(denied.result.current.state).toEqual({ available: true, active: false, busy: false });
  });
});

function restoreProperty(target: object, key: PropertyKey, descriptor: PropertyDescriptor | undefined) {
  if (descriptor) Object.defineProperty(target, key, descriptor);
  else Reflect.deleteProperty(target, key);
}

function fullscreenRuntime(available = true) {
  let active = false;
  const listeners = new Set<() => void>();
  const unsubscribe = vi.fn();
  return {
    available: () => available,
    active: () => active,
    enter: vi.fn(() => {
      active = true;
      listeners.forEach(listener => listener());
      return Promise.resolve();
    }),
    exit: vi.fn(() => {
      active = false;
      listeners.forEach(listener => listener());
      return Promise.resolve();
    }),
    subscribe: (listener: () => void) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
        unsubscribe();
      };
    },
    unsubscribe
  };
}
