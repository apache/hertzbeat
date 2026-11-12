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
import { cleanup, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const transport = vi.hoisted(() => ({ apiMessageGet: vi.fn() }));
vi.mock('@/core/http/api-message', async original => ({
  ...(await original<typeof import('@/core/http/api-message')>()),
  apiMessageGet: transport.apiMessageGet
}));

import { useDashboardActivity } from './use-dashboard-activity';

const emptyPage = { content: [], totalElements: 0, pageIndex: 0, pageSize: 10 };
const emptyAlerts = {
  total: 0,
  dealNum: 0,
  rate: 100,
  priorityWarningNum: 0,
  priorityCriticalNum: 0,
  priorityEmergencyNum: 0
};
const sources = ['monitors', 'alerts', 'services'] as const;
const invalidCases = ['null response', 'missing response', 'missing total', 'null total'] as const;

function sourceFor(path: string) {
  if (path.startsWith('/api/monitors')) return 'monitors';
  if (path.startsWith('/api/entities')) return 'services';
  if (path === '/api/alerts/summary') return 'alerts';
  throw new Error('Unexpected dashboard request');
}

function invalidWire(source: (typeof sources)[number], kind: (typeof invalidCases)[number]) {
  if (kind === 'null response') return null;
  if (kind === 'missing response') return undefined;
  const wire = source === 'alerts' ? { ...emptyAlerts } : { ...emptyPage };
  const totalKey = source === 'alerts' ? 'total' : 'totalElements';
  if (kind === 'missing total') {
    return Object.fromEntries(Object.entries(wire).filter(([key]) => key !== totalKey));
  }
  return { ...wire, [totalKey]: null };
}

function renderActivity() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  return renderHook(() => useDashboardActivity(), {
    wrapper: ({ children }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>
  });
}

describe('Start wire evidence boundaries', () => {
  beforeEach(() => {
    transport.apiMessageGet.mockReset();
    transport.apiMessageGet.mockImplementation((path: string) =>
      Promise.resolve(sourceFor(path) === 'alerts' ? emptyAlerts : emptyPage)
    );
  });
  afterEach(cleanup);

  it('accepts explicit zero totals through the real feature API parsers', async () => {
    const view = renderActivity();
    await waitFor(() => expect(view.result.current.refreshing).toBe(false));
    for (const source of sources) expect(view.result.current[source]).toEqual({ kind: 'ready', count: 0 });
  });

  it.each(sources.flatMap(source => invalidCases.map(kind => ({ source, kind }))))(
    'rejects $source $kind without inventing zero or crashing the page controller',
    async ({ source, kind }) => {
      transport.apiMessageGet.mockImplementation((path: string) => {
        const requested = sourceFor(path);
        if (requested === source) return Promise.resolve(invalidWire(source, kind));
        return Promise.resolve(requested === 'alerts' ? emptyAlerts : emptyPage);
      });
      const view = renderActivity();
      await waitFor(() => expect(view.result.current[source]).toEqual({ kind: 'error' }));
      for (const other of sources.filter(value => value !== source)) {
        expect(view.result.current[other]).toEqual({ kind: 'ready', count: 0 });
      }
      expect(view.result.current.firstUse).toBe(false);
    }
  );
});
