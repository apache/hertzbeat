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
