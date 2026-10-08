/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { afterEach, expect, it, vi } from 'vitest';
import type { TFunction } from 'i18next';
import type { ExactTimeWindow } from '@/shared/query-context';
import { useExplorePageController } from '../controller/use-explore-page-controller';
import { ExploreWorkspaceResults } from './explore-workspace-results';
import { useLogInspectorAnalysis } from '../controller/use-log-inspector-analysis';

const api = vi.hoisted(() => ({ metric: vi.fn() }));
vi.mock('../api/explore-api', async original => ({
  ...(await original<typeof import('../api/explore-api')>()),
  loadMetricSignal: api.metric
}));
vi.mock('../controller/use-metric-inventory', () => ({
  useMetricInventory: () => ({ search: '', setSearch: vi.fn(), state: 'loading', data: undefined, retry: vi.fn() })
}));
vi.mock('./explore-result-panel', () => ({
  ExploreResultPanel: ({ onTimeWindowChange }: { onTimeWindowChange: (window: ExactTimeWindow) => void }) => (
    <div>
      <button onClick={() => onTimeWindowChange({ from: 1500, to: 2500 })}>Zoom metric</button>
      <button onClick={() => onTimeWindowChange({ from: 500, to: 3500 })}>Out of evidence</button>
    </div>
  )
}));
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});
function Subject() {
  const controller = useExplorePageController();
  const inspectorAnalysis = useLogInspectorAnalysis(controller, true);
  const location = useLocation();
  return (
    <>
      <ExploreWorkspaceResults
        controller={controller}
        t={((key: string) => key) as TFunction}
        inspectorAnalysis={inspectorAnalysis}
      />
      <button onClick={() => controller.submission.updateField({ field: 'query', value: 'draft_metric' })}>
        Edit draft
      </button>
      <output data-testid="url">{location.search}</output>
    </>
  );
}
it('commits a bounded metric zoom to exact URL state, preserves filters and fetches fresh evidence once', async () => {
  api.metric.mockResolvedValue({
    context: null,
    query: 'process_cpu_usage',
    datasource: 'greptime',
    queryMode: 'explicit',
    results: { status: 200, msg: null, refId: null, frames: [] },
    stats: null,
    emptyStateReason: null,
    errorMessage: null
  });
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MemoryRouter
        initialEntries={[
          '/explore?signal=metrics&query=process_cpu_usage&serviceName=HertzBeat&environment=local&step=30&start=1000&end=3000'
        ]}
      >
        <Subject />
      </MemoryRouter>
    </QueryClientProvider>
  );
  await waitFor(() => expect(api.metric).toHaveBeenCalledOnce());
  await waitFor(() => expect(screen.getByTestId('url')).toHaveTextContent('query=process_cpu_usage'));
  fireEvent.click(screen.getByRole('button', { name: 'Edit draft' }));
  expect(await screen.findByText('exploreMetric.pendingDraft')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Out of evidence' }));
  expect(api.metric).toHaveBeenCalledOnce();
  fireEvent.click(screen.getByRole('button', { name: 'Zoom metric' }));
  await waitFor(() => expect(api.metric).toHaveBeenCalledTimes(2));
  const params = new URLSearchParams(screen.getByTestId('url').textContent ?? '');
  expect(Object.fromEntries(params)).toMatchObject({
    query: 'process_cpu_usage',
    serviceName: 'HertzBeat',
    environment: 'local',
    step: '30',
    start: '1500',
    end: '2500'
  });
  expect(api.metric).toHaveBeenLastCalledWith(
    expect.objectContaining({ query: 'process_cpu_usage', start: 1500, end: 2500, step: '30' }),
    expect.any(AbortSignal)
  );
});
