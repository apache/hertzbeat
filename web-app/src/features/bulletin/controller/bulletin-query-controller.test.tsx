/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { act, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { MemoryRouter, useLocation, useNavigate } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { useBulletinSelection } from './bulletin-list-controller';
import { useBulletinQueryController } from './bulletin-query-controller';

function wrapper({ children }: { children: ReactNode }) {
  return <MemoryRouter initialEntries={['/bulletin']}>{children}</MemoryRouter>;
}
function useHarness() {
  return { controller: useBulletinQueryController(), location: useLocation(), navigate: useNavigate() };
}

function useSelectionHarness() {
  const controller = useBulletinQueryController();
  const selection = useBulletinSelection(controller.query, {
    kind: 'ready',
    records: [
      {
        id: 7,
        name: 'Operations',
        app: 'website',
        monitorIds: [1],
        fields: { responseTime: ['duration'] },
        creator: null,
        modifier: null,
        gmtCreate: null,
        gmtUpdate: null
      }
    ],
    total: 1
  });
  return { controller, location: useLocation(), navigate: useNavigate(), selection };
}

describe('bulletin query controller', () => {
  it('converges draft and URL through push, back, and forward', async () => {
    const hook = renderHook(useHarness, { wrapper });
    await act(() => Promise.resolve());
    act(() => hook.result.current.controller.setSearch('api'));
    act(() => hook.result.current.controller.submitSearch());
    expect(hook.result.current.location.search).toContain('search=api');
    await act(async () => {
      await hook.result.current.navigate(-1);
    });
    expect(hook.result.current.controller.search).toBe('');
    await act(async () => {
      await hook.result.current.navigate(1);
    });
    expect(hook.result.current.controller.search).toBe('api');
  });

  it('does not restore a retired selection through browser Back or Forward', async () => {
    const hook = renderHook(useSelectionHarness, { wrapper });
    await act(() => Promise.resolve());
    act(() => hook.result.current.selection.setSelectedId(7));
    expect(hook.result.current.selection.selectedId).toBe(7);

    act(() => hook.result.current.controller.setSearch('api'));
    act(() => hook.result.current.controller.submitSearch());
    expect(hook.result.current.selection.selectedId).toBeNull();
    await act(() => Promise.resolve());

    await act(async () => {
      await hook.result.current.navigate(-1);
    });
    expect(hook.result.current.selection.selectedId).toBeNull();
    await act(async () => {
      await hook.result.current.navigate(1);
    });
    expect(hook.result.current.selection.selectedId).toBeNull();
  });
});
