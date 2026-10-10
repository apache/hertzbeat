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

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { i18n, initializeI18n, loadLocale } from '@/core/i18n/i18n';
import { RouteTimeContext, type SharedTimeValue } from '@/shared/time/time-context';
import type { TopologyGraph } from '../model/topology-contract';

const api = vi.hoisted(() => ({ loadTopologyGraph: vi.fn() }));
const canvas = vi.hoisted(() => ({ fit: vi.fn() }));
vi.mock('../api/topology-api', async importOriginal => ({
  ...(await importOriginal<typeof import('../api/topology-api')>()),
  loadTopologyGraph: api.loadTopologyGraph
}));
vi.mock('../components/topology-canvas', async () => {
  const { forwardRef, useImperativeHandle } = await import('react');
  return {
    TopologyCanvas: forwardRef(function CanvasBoundary(_props, ref) {
      useImperativeHandle(ref, () => ({ fit: canvas.fit }));
      return <div data-testid="topology-canvas" />;
    })
  };
});

import { TopologyPage } from './topology-page';

describe('TopologyPage refresh ownership', () => {
  beforeAll(async () => {
    await initializeI18n();
    await loadLocale('en-US');
  });
  beforeEach(() => {
    vi.clearAllMocks();
    api.loadTopologyGraph.mockResolvedValue(graph());
  });
  afterEach(cleanup);

  it('requests shared time refresh when the shared revision owns refresh', async () => {
    const requestRefresh = vi.fn();
    renderPage({ ...sharedTime, requestRefresh });
    await screen.findByTestId('topology-canvas');

    fireEvent.click(screen.getByRole('button', { name: i18n.t('common.refresh') }));
    expect(requestRefresh).toHaveBeenCalledOnce();
    expect(api.loadTopologyGraph).toHaveBeenCalledOnce();
  });

  it('refetches through the controller when active queries own refresh', async () => {
    renderPage();
    await screen.findByTestId('topology-canvas');

    fireEvent.click(screen.getByRole('button', { name: i18n.t('common.refresh') }));
    await waitFor(() => expect(api.loadTopologyGraph).toHaveBeenCalledTimes(2));
  });

  it('fits through the mounted canvas handle without changing route scope', async () => {
    renderPage();
    await screen.findByTestId('topology-canvas');
    fireEvent.click(screen.getByRole('button', { name: i18n.t('topology.toolbar.fit') }));
    expect(canvas.fit).toHaveBeenCalledOnce();
  });
});

function renderPage(time: SharedTimeValue | null = null) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  const router = createMemoryRouter([{ path: '*', element: <TopologyPage /> }], { initialEntries: ['/topology'] });
  return render(
    <I18nextProvider i18n={i18n}>
      <QueryClientProvider client={client}>
        <RouteTimeContext.Provider value={time}>
          <RouterProvider router={router} />
        </RouteTimeContext.Provider>
      </QueryClientProvider>
    </I18nextProvider>
  );
}

const sharedTime: SharedTimeValue = {
  policy: 'global',
  headerMode: 'global_controls',
  manualRefreshOwner: 'time_revision',
  window: { from: 1000, to: 2000 },
  range: '30m',
  autoRefreshMs: 0,
  remainingMs: null,
  refreshRevision: 0,
  setRange: () => undefined,
  setAutoRefresh: () => undefined,
  commitWindow: () => undefined,
  requestRefresh: () => undefined
};

function graph(): TopologyGraph {
  return {
    apiBacked: true,
    focusEntityId: 1,
    depth: 1,
    partial: false,
    partialReasons: [],
    edgePage: { pageIndex: 0, pageSize: 25, totalElements: 0, hasNext: false },
    sourceKinds: [],
    nodes: [
      {
        id: 'node-1',
        entityId: 1,
        entityName: 'checkout',
        entityType: 'service',
        namespace: 'store',
        environment: 'prod',
        health: 'healthy',
        focus: true,
        evidenceBadges: [],
        redMetrics: {
          requestRatePerSecond: 1,
          requestCount: 1,
          errorRate: 0,
          errorCount: 0,
          latencyP95Ms: 10,
          latencyAvgMs: 5
        }
      }
    ],
    edges: [],
    impactTimeline: []
  };
}
