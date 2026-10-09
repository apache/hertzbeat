/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { act, cleanup, render, waitFor } from '@testing-library/react';
import { useEffect, useState } from 'react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { useAlertRuleUnsavedHistory } from './use-alert-rule-unsaved-history';

const confirmations = vi.hoisted(() => {
  const entries: { onOk: () => void; onCancel: () => void; destroy: ReturnType<typeof vi.fn> }[] = [];
  return {
    entries,
    modal: {
      confirm: vi.fn((options: { onOk: () => void; onCancel: () => void }) => {
        const entry = { ...options, destroy: vi.fn() };
        entries.push(entry);
        return entry;
      })
    },
    translation: { t: (key: string) => key }
  };
});
vi.mock('antd', () => ({ App: { useApp: () => ({ modal: confirmations.modal }) } }));
vi.mock('react-i18next', () => ({ useTranslation: () => confirmations.translation }));

afterEach(() => {
  cleanup();
  confirmations.entries.length = 0;
  vi.clearAllMocks();
});

function Guard({ dirty }: { dirty: boolean }) {
  useAlertRuleUnsavedHistory(dirty, () => undefined);
  return null;
}

function mount() {
  let retire = () => {};
  let unmountGuard = () => {};
  const router = createMemoryRouter(
    [
      { path: '/receiver', element: <Host /> },
      { path: '/before', element: <div /> },
      { path: '/after', element: <div /> }
    ],
    { initialEntries: ['/before', '/receiver', '/after'], initialIndex: 1 }
  );
  function Host() {
    const [dirty, setDirty] = useState(true);
    const [mounted, setMounted] = useState(true);
    useEffect(() => {
      retire = () => setDirty(false);
      unmountGuard = () => setMounted(false);
    }, []);
    return mounted ? <Guard dirty={dirty} /> : null;
  }
  render(<RouterProvider router={router} />);
  return {
    router,
    retire: () => retire(),
    unmountGuard: () => unmountGuard()
  };
}

function latest() {
  const entry = confirmations.entries.at(-1);
  if (!entry) throw new Error('Expected a history confirmation');
  return entry;
}

describe('alert-rule history confirmation lifecycle', () => {
  it.each(['cancel', 'discard'])(
    'mixed Back/Forward keeps one active confirmation and %s targets current intent',
    async action => {
      const { router } = mount();
      await act(() => router.navigate(-1));
      await act(() => router.navigate(1));
      expect(confirmations.entries.filter(entry => entry.destroy.mock.calls.length === 0)).toHaveLength(1);
      act(() => (action === 'cancel' ? latest().onCancel() : latest().onOk()));
      await waitFor(() => expect(router.state.location.pathname).toBe(action === 'cancel' ? '/receiver' : '/after'));
    }
  );

  it('callbacks from resolved confirmation cannot consume a later request', async () => {
    const { router } = mount();
    await act(() => router.navigate(-1));
    const retired = latest();
    act(() => retired.onCancel());
    await act(() => router.navigate(1));
    const current = latest();
    act(() => retired.onOk());
    act(() => retired.onCancel());
    expect(router.state.location.pathname).toBe('/receiver');
    expect([...router.state.blockers.values()].some(blocker => blocker.state === 'blocked')).toBe(true);
    act(() => current.onOk());
    await waitFor(() => expect(router.state.location.pathname).toBe('/after'));
  });

  it('forced guard unmount destroys confirmation and ignores late callbacks', async () => {
    const { router, unmountGuard } = mount();
    await act(() => router.navigate(-1));
    const pending = latest();
    act(unmountGuard);
    expect(pending.destroy).toHaveBeenCalledTimes(1);
    act(() => pending.onOk());
    act(() => pending.onCancel());
    expect(router.state.location.pathname).toBe('/receiver');
    expect(router.state.blockers.size).toBe(0);
  });

  it.each(['save completion', 'role loss'])(
    'mocked %s retires the draft and completes only the pending departure',
    async () => {
      const { router, retire } = mount();
      const transitions: string[] = [];
      const originalKey = router.state.location.key;
      const unsubscribe = router.subscribe(state => {
        if (state.location.key !== originalKey && transitions.at(-1) !== state.location.key)
          transitions.push(state.location.key);
      });
      await act(() => router.navigate(-1));
      const pending = latest();
      act(retire);
      expect(pending.destroy).toHaveBeenCalledTimes(1);
      await waitFor(() => expect(router.state.location.pathname).toBe('/before'));
      act(() => pending.onOk());
      act(() => pending.onCancel());
      expect(transitions).toHaveLength(1);
      expect(router.state.location.pathname).toBe('/before');
      expect([...router.state.blockers.values()].every(blocker => blocker.state === 'unblocked')).toBe(true);
      unsubscribe();
    }
  );
});
