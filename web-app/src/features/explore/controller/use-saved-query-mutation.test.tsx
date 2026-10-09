/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import { StrictMode, type PropsWithChildren } from 'react';
import { act, cleanup, render, renderHook } from '@testing-library/react';
import { createMemoryRouter, RouterProvider, useLocation } from 'react-router-dom';
import { afterEach, expect, it, vi } from 'vitest';

import { ApiMessageError } from '@/core/http/api-message';
import { useSavedQueryMutation } from './use-saved-query-mutation';

afterEach(cleanup);

it('admits an authorized write after StrictMode effect replay', async () => {
  const write = vi.fn().mockResolvedValue(undefined);
  const completed = vi.fn();
  const hook = renderHook(() => useSavedQueryMutation('source-a', true, vi.fn()), {
    wrapper: ({ children }: PropsWithChildren) => <StrictMode>{children}</StrictMode>
  });
  await act(() => hook.result.current.mutate(write, completed));
  expect(write).toHaveBeenCalledOnce();
  expect(completed).toHaveBeenCalledOnce();
});

it('does not let an older source write completion replace a newer selection', async () => {
  let resolve: () => void = () => {};
  const write = vi.fn(
    () =>
      new Promise<void>(done => {
        resolve = done;
      })
  );
  const completed = vi.fn();
  const hook = renderHook(({ source }) => useSavedQueryMutation(source, true, vi.fn()), {
    initialProps: { source: 'a' }
  });
  let pending: Promise<void> | undefined;
  act(() => {
    pending = hook.result.current.mutate(write, completed);
  });
  hook.rerender({ source: 'b' });
  await act(async () => {
    resolve();
    await pending;
  });
  expect(completed).not.toHaveBeenCalled();
});

it('does not complete a write in the UI after permission is lost or admit a new write', async () => {
  let resolve: () => void = () => {};
  const write = vi.fn(
    () =>
      new Promise<void>(done => {
        resolve = done;
      })
  );
  const completed = vi.fn();
  const hook = renderHook(({ canWrite }) => useSavedQueryMutation('same-source', canWrite, vi.fn()), {
    initialProps: { canWrite: true }
  });
  let pending: Promise<void> | undefined;
  act(() => {
    pending = hook.result.current.mutate(write, completed);
  });
  hook.rerender({ canWrite: false });
  await act(async () => {
    resolve();
    await pending;
  });
  expect(completed).not.toHaveBeenCalled();
  await act(() => hook.result.current.mutate(write, completed));
  expect(write).toHaveBeenCalledOnce();
});

it('does not revive an old write when Browser Back restores its original location key', async () => {
  let current!: ReturnType<typeof useSavedQueryMutation>;
  const refresh = vi.fn();
  function Probe() {
    current = useSavedQueryMutation(useLocation().key, true, refresh);
    return null;
  }
  const router = createMemoryRouter([{ path: '/explore', element: <Probe /> }], {
    initialEntries: ['/explore?signal=logs']
  });
  render(<RouterProvider router={router} />);
  const originalKey = router.state.location.key;
  let complete!: () => void;
  const succeeded = vi.fn();
  let pending!: Promise<void>;
  act(() => {
    pending = current.mutate(
      () =>
        new Promise<void>(resolve => {
          complete = resolve;
        }),
      succeeded
    );
  });
  await act(() => router.navigate('/explore?signal=metrics'));
  await act(() => router.navigate(-1));
  expect(router.state.location.key).toBe(originalKey);
  await act(async () => {
    complete();
    await pending;
  });
  expect(succeeded).not.toHaveBeenCalled();
  expect(refresh).toHaveBeenCalledOnce();
});

it('does not revive a write failure after permission is lost and restored', async () => {
  let reject!: (reason: Error) => void;
  const hook = renderHook(({ canWrite }) => useSavedQueryMutation('same-source', canWrite, vi.fn()), {
    initialProps: { canWrite: true }
  });
  let pending!: Promise<void>;
  act(() => {
    pending = hook.result.current.mutate(
      () =>
        new Promise<void>((_resolve, fail) => {
          reject = fail;
        }),
      vi.fn()
    );
  });
  hook.rerender({ canWrite: false });
  hook.rerender({ canWrite: true });
  await act(async () => {
    reject(new Error('Late old write failure'));
    await pending;
  });
  expect(hook.result.current.error).toBeUndefined();
});

it('does not admit retained callbacks after their route or permission generation is retired', async () => {
  const hook = renderHook(({ source, canWrite }) => useSavedQueryMutation(source, canWrite, vi.fn()), {
    initialProps: { source: 'a', canWrite: true }
  });
  const old = hook.result.current.mutate;
  const write = vi.fn().mockResolvedValue(undefined);
  hook.rerender({ source: 'b', canWrite: true });
  await act(() => old(write, vi.fn()));
  hook.rerender({ source: 'a', canWrite: true });
  await act(() => old(write, vi.fn()));
  const beforeRoleLoss = hook.result.current.mutate;
  hook.rerender({ source: 'a', canWrite: false });
  hook.rerender({ source: 'a', canWrite: true });
  await act(() => beforeRoleLoss(write, vi.fn()));
  expect(write).not.toHaveBeenCalled();
  await act(() => hook.result.current.mutate(write, vi.fn()));
  expect(write).toHaveBeenCalledOnce();
});

it('retains the edit and reports revision conflict without retrying or refreshing over it', async () => {
  const refresh = vi.fn();
  const completed = vi.fn();
  const write = vi.fn().mockRejectedValue(new ApiMessageError('Conflict', { status: 409 }));
  const hook = renderHook(() => useSavedQueryMutation('same-source', true, refresh));
  await act(() => hook.result.current.mutate(write, completed));
  expect(hook.result.current.error).toBe('revisionConflict');
  expect(write).toHaveBeenCalledOnce();
  expect(refresh).not.toHaveBeenCalled();
  expect(completed).not.toHaveBeenCalled();
});
