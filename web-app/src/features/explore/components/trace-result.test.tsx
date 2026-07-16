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
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { I18nextProvider, useTranslation } from 'react-i18next';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import { i18n, initializeI18n, loadLocale } from '@/core/i18n/i18n';

import type { TraceDetail } from '../model/explore-signal-contract';
import { TraceResult } from './trace-result';

describe('TraceResult', () => {
  afterEach(cleanup);

  beforeAll(async () => {
    Object.defineProperty(globalThis, 'ResizeObserver', { value: ResizeObserverStub, configurable: true });
    await initializeI18n();
    await loadLocale('en-US');
  });

  it('opens a selected trace and keeps cross-signal pivots in the workbench', () => {
    const navigate = vi.fn();
    render(<I18nextProvider i18n={i18n}><Subject navigate={navigate} /></I18nextProvider>);

    fireEvent.click(screen.getByText('POST /checkout'));
    expect(screen.getByRole('dialog', { name: 'POST /checkout' })).toBeInTheDocument();
    expect(screen.getByText('http.status_code')).toBeInTheDocument();
    expect(screen.getByText('retry.scheduled')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Related logs' }));
    expect(navigate).toHaveBeenCalledWith(expect.stringContaining('signal=logs'));
    expect(navigate).toHaveBeenCalledWith(expect.stringContaining('traceId=trace-1'));
  });

  it('keeps an out-of-range nonzero page ready with authoritative total', () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(<I18nextProvider i18n={i18n}><QueryClientProvider client={client}><TraceResult
      data={{ content: [], totalElements: 3, totalPages: 1, number: 3, size: 20 }}
      query={{ signal: 'traces', timeRange: 'last-30m', pageIndex: 3 }}
      t={i18n.t}
      navigate={vi.fn()}
    /></QueryClientProvider></I18nextProvider>);
    expect(screen.getByRole('heading', { name: 'Traces' }).parentElement).toHaveTextContent('3');
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('uses neutral status unless health or failure is explicit', () => {
    const unknownRow: TraceDetail = { ...traceDetail, traceId: 'unknown', status: null, errorSpanCount: 0 };
    const countErrorRow: TraceDetail = { ...traceDetail, traceId: 'count-error', status: null, errorSpanCount: 1 };
    const cases = [
      { row: unknownRow, text: '—', tone: 'neutral' },
      { row: { ...traceDetail, traceId: 'ok', status: 'OK', errorSpanCount: 0 }, text: 'OK', tone: 'green' },
      { row: { ...traceDetail, traceId: 'status-error', status: 'ERROR', errorSpanCount: 0 }, text: 'ERROR', tone: 'red' },
      { row: countErrorRow, text: '—', tone: 'red' },
    ] as const;

    for (const testCase of cases) {
      const navigate = vi.fn();
      render(<I18nextProvider i18n={i18n}><Subject navigate={navigate} row={testCase.row} detail={testCase.row} /></I18nextProvider>);
      const tag = screen.getByText(testCase.text, { selector: '.ant-tag' });
      if (testCase.tone === 'neutral') {
        expect(tag).not.toHaveClass('ant-tag-green');
        expect(tag).not.toHaveClass('ant-tag-red');
      } else {
        expect(tag).toHaveClass(`ant-tag-${testCase.tone}`);
      }
      cleanup();
    }
  });

  it('keeps nullable span durations unknown', async () => {
    const navigate = vi.fn();
    const incompleteSpans = (traceDetail.spans ?? []).map((span) => {
      const incompleteSpan = { ...span };
      incompleteSpan.durationNanos = null;
      return incompleteSpan;
    });
    const incompleteDetail: TraceDetail = {
      ...traceDetail,
      status: 'OK',
      spans: incompleteSpans
    };
    render(<I18nextProvider i18n={i18n}><Subject navigate={navigate} row={incompleteDetail} detail={incompleteDetail} /></I18nextProvider>);

    fireEvent.click(screen.getByText('POST /checkout'));

    await waitFor(() => expect(screen.getByText(/1 errors/)).toBeInTheDocument());
    expect(screen.queryByText('0.00 ms')).not.toBeInTheDocument();

    const spanButton = screen.getByText('checkout', { selector: 'strong' }).closest('button');
    expect(spanButton).not.toBeNull();
    expect(within(spanButton!).getByText('—')).toBeInTheDocument();
  });
});

function Subject({ navigate, row = traceDetail, detail = traceDetail }: { navigate: (path: string) => void; row?: TraceDetail; detail?: TraceDetail }) {
  const { t } = useTranslation();
  const client = new QueryClient({ defaultOptions: { queries: { staleTime: Number.POSITIVE_INFINITY, retry: false } } });
  client.setQueryData(['trace-detail', row.traceId], detail);
  return <QueryClientProvider client={client}><TraceResult
    data={{ content: [row], totalElements: 1, totalPages: 1, number: 0, size: 20 }}
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
  serviceNamespace: null,
  startTime: 1_750_000_000_000,
  durationNanos: 3_000_000_000,
  errorSpanCount: 1,
  status: 'ERROR',
  resourceAttributes: null,
  spans: [{
    traceId: 'trace-1',
    spanId: 'span-1',
    parentSpanId: null,
    spanName: 'POST /checkout',
    serviceName: 'checkout',
    startTime: 1_750_000_000_000,
    durationNanos: 3_000_000_000,
    status: 'error',
    spanKind: null,
    statusMessage: null,
    traceState: null,
    scopeName: null,
    scopeVersion: null,
    highlighted: false,
    resourceAttributes: null,
    spanAttributes: { 'http.status_code': '504' },
    events: [{ timeUnixNano: null, name: 'retry.scheduled', attributes: { 'retry.attempt': 2 }, droppedAttributesCount: null }],
    links: null,
    codeNavigationHint: null
  }]
};

class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
