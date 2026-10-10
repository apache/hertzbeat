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

import { act, cleanup, render, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, expect, it, vi } from 'vitest';
import { MemoryRouter, useSearchParams } from 'react-router-dom';
import { GlobalTimeProvider, RouteTimeProvider } from '@/shared/time';
import { parseHertzBeatDashboardDocument } from '@/platform/perses';
import fixture from '@/platform/perses/model/fixtures/supported-dashboard.json';
import { useSignalDashboardTime } from './use-signal-dashboard-time';
import { DashboardPanelRuntime } from '../runtime/dashboard-panel-runtime';
const request = vi.hoisted(() => vi.fn());
vi.mock('@/platform/perses', async original => ({
  ...(await original<typeof import('@/platform/perses')>()),
  queryHertzBeatData: request
}));
const document = parseHertzBeatDashboardDocument(fixture);
const messages = {
  loading: 'Loading',
  inactive: 'Inactive',
  empty: 'Empty',
  truncated: 'Truncated',
  truncationUnknown: 'Unknown',
  runtimeError: 'Failed',
  failures: {
    'perses.query.invalid': 'Invalid',
    'perses.query.permission': 'Permission',
    'perses.query.overloaded': 'Overloaded',
    'perses.query.unavailable': 'Unavailable',
    'perses.query.contract': 'Contract'
  }
};
afterEach(cleanup);
it('executes Query again when the exact window and controls are unchanged', async () => {
  request.mockResolvedValue({ state: 'empty', truncated: false });
  let current!: ReturnType<typeof useSignalDashboardTime>;
  function Harness() {
    const [params] = useSearchParams();
    current = useSignalDashboardTime(params, document);
    return current.timeWindow ? (
      <DashboardPanelRuntime
        panelId="jvm"
        panel={document.spec.panels.jvm!}
        variables={document.spec.variables}
        variableValues={current.query.variables}
        timeWindow={current.timeWindow}
        refreshRevision={current.refreshRevision}
        enabled
        messages={messages}
      />
    ) : null;
  }
  render(
    <MemoryRouter
      initialEntries={[
        '/observability/dashboards?dashboard=alpha-service-diagnostics&start=1780000000000&end=1780000060000&timeZone=UTC'
      ]}
    >
      <QueryClientProvider client={new QueryClient()}>
        <GlobalTimeProvider>
          <RouteTimeProvider policy="route_owned" canonicalizeInvalidExact={false}>
            <Harness />
          </RouteTimeProvider>
        </GlobalTimeProvider>
      </QueryClientProvider>
    </MemoryRouter>
  );
  await waitFor(() => expect(request).toHaveBeenCalledTimes(1));
  const window = current.timeWindow;
  act(() => current.commit());
  await waitFor(() => expect(request).toHaveBeenCalledTimes(2));
  expect(current.timeWindow).toEqual(window);
});
