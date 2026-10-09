/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import { createElement, type PropsWithChildren } from 'react';
import { act, renderHook } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { expect, it, vi } from 'vitest';
import type { MonitorDefinitionWorkspace } from '../model/monitor-definition-model';
import { useMonitorDefinitionRouteController } from './use-monitor-definition-route-controller';

it('does not reopen an admitted route from a repeated null snapshot, but reloads a retired workspace', async () => {
  const actions = {
    cancelEdit: vi.fn(() => true),
    closeWorkspace: vi.fn(() => true),
    followRoute: vi.fn(() => true),
    openCreate: vi.fn(() => true),
    openEdit: vi.fn(() => ({ admitted: true, completion: Promise.resolve() })),
    openView: vi.fn(() => ({ admitted: true, completion: Promise.resolve() }))
  };
  const wrapper = ({ children }: PropsWithChildren) =>
    createElement(MemoryRouter, { initialEntries: ['/settings/monitor-definitions?app=mysql'] }, children);
  const view = renderHook(
    ({ workspace }: { workspace: MonitorDefinitionWorkspace | null }) =>
      useMonitorDefinitionRouteController(workspace, actions),
    { initialProps: { workspace: null as MonitorDefinitionWorkspace | null }, wrapper }
  );
  await act(async () => {
    await Promise.resolve();
  });
  expect(actions.followRoute).toHaveBeenCalledTimes(1);
  view.rerender({ workspace: null });
  expect(actions.followRoute).toHaveBeenCalledTimes(1);
  view.rerender({ workspace: { kind: 'loading', mode: 'edit', app: 'mysql' } });
  view.rerender({ workspace: null });
  expect(actions.followRoute).toHaveBeenCalledTimes(2);
});
