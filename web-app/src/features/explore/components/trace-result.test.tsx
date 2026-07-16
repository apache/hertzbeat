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
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { I18nextProvider, useTranslation } from 'react-i18next';
import type { NavigateFunction } from 'react-router-dom';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import { i18n, initializeI18n, loadLocale } from '@/core/i18n/i18n';

import type { TraceDetail } from '../api/explore-signal-contract';
import { TraceResult } from './trace-result';

describe('TraceResult', () => {
  afterEach(cleanup);

  beforeAll(async () => {
    Object.defineProperty(globalThis, 'ResizeObserver', { value: ResizeObserverStub, configurable: true });
    await initializeI18n();
    await loadLocale('en-US');
  });

  it('opens a selected trace and keeps cross-signal pivots in the workbench', () => {
    const navigate = vi.fn() as unknown as NavigateFunction;
    render(<I18nextProvider i18n={i18n}><Subject navigate={navigate} /></I18nextProvider>);

    fireEvent.click(screen.getByText('POST /checkout'));
    expect(screen.getByRole('dialog', { name: 'POST /checkout' })).toBeInTheDocument();
    expect(screen.getByText('http.status_code')).toBeInTheDocument();
    expect(screen.getByText('retry.scheduled')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Related logs' }));
    expect(navigate).toHaveBeenCalledWith(expect.stringContaining('signal=logs'));
    expect(navigate).toHaveBeenCalledWith(expect.stringContaining('traceId=trace-1'));
  });
});

function Subject({ navigate }: { navigate: NavigateFunction }) {
  const { t } = useTranslation();
  const client = new QueryClient({ defaultOptions: { queries: { staleTime: Number.POSITIVE_INFINITY, retry: false } } });
  client.setQueryData(['trace-detail', 'trace-1'], traceDetail);
  return <QueryClientProvider client={client}><TraceResult
    data={{ content: [traceDetail], totalElements: 1, totalPages: 1, number: 0, size: 20 }}
    query={{ signal: 'traces', timeRange: 'last-30m' }}
    t={t}
    navigate={navigate}
  /></QueryClientProvider>;
}

const traceDetail: TraceDetail = {
  traceId: 'trace-1',
  rootSpanId: 'span-1',
  rootSpanName: 'POST /checkout',
  serviceName: 'checkout',
  startTime: 1_750_000_000_000,
  durationNanos: 3_000_000_000,
  errorSpanCount: 1,
  status: 'ERROR',
  spans: [{
    traceId: 'trace-1',
    spanId: 'span-1',
    spanName: 'POST /checkout',
    serviceName: 'checkout',
    startTime: 1_750_000_000_000,
    durationNanos: 3_000_000_000,
    status: 'error',
    spanAttributes: { 'http.status_code': '504' },
    events: [{ name: 'retry.scheduled', attributes: { 'retry.attempt': 2 } }]
  }]
};

class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
