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

import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { useState } from 'react';
import { I18nextProvider, useTranslation } from 'react-i18next';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import { i18n, initializeI18n, loadLocale } from '@/core/i18n/i18n';

import type { TraceDetail } from '../model/explore-signal-contract';
import { traceSpanLayout, type TraceDetailState } from '../model/explore-signal-model';
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
    render(
      <I18nextProvider i18n={i18n}>
        <Subject navigate={navigate} />
      </I18nextProvider>
    );

    const traceRow = screen.getByText('POST /checkout').closest('tr');
    expect(traceRow).toHaveAttribute('tabindex', '0');
    fireEvent.keyDown(traceRow!, { key: 'Enter' });
    expect(screen.getByRole('complementary', { name: 'POST /checkout' })).toBeInTheDocument();
    expect(traceRow).toBeInTheDocument();
    expect(screen.getByText('http.status_code')).toBeInTheDocument();
    expect(screen.getByText('retry.scheduled')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Related logs' }));
    expect(navigate).toHaveBeenCalledWith(expect.stringContaining('signal=logs'));
    expect(navigate).toHaveBeenCalledWith(expect.stringContaining('traceId=trace-1'));
  });

  it('keeps an out-of-range nonzero page ready with authoritative total', () => {
    render(
      <I18nextProvider i18n={i18n}>
        <TraceResult
          data={{ content: [], totalElements: 3, totalPages: 1, number: 3, size: 20 }}
          t={i18n.t}
          trace={closedTrace()}
        />
      </I18nextProvider>
    );
    expect(screen.getByRole('heading', { name: 'Traces' }).parentElement).toHaveTextContent('3');
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('uses neutral status unless health or failure is explicit', () => {
    const unknownRow: TraceDetail = { ...traceDetail, traceId: 'unknown', status: null, errorSpanCount: 0 };
    const countErrorRow: TraceDetail = { ...traceDetail, traceId: 'count-error', status: null, errorSpanCount: 1 };
    const cases = [
      { row: unknownRow, text: '—', tone: 'neutral' },
      { row: { ...traceDetail, traceId: 'ok', status: 'OK', errorSpanCount: 0 }, text: 'OK', tone: 'green' },
      {
        row: { ...traceDetail, traceId: 'status-error', status: 'ERROR', errorSpanCount: 0 },
        text: 'ERROR',
        tone: 'red'
      },
      { row: countErrorRow, text: '—', tone: 'red' }
    ] as const;

    for (const testCase of cases) {
      const navigate = vi.fn();
      render(
        <I18nextProvider i18n={i18n}>
          <Subject navigate={navigate} row={testCase.row} detail={testCase.row} />
        </I18nextProvider>
      );
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
    const incompleteSpans = (traceDetail.spans ?? []).map(span => {
      const incompleteSpan = { ...span };
      incompleteSpan.durationNanos = null;
      return incompleteSpan;
    });
    const incompleteDetail: TraceDetail = {
      ...traceDetail,
      status: 'OK',
      spans: incompleteSpans
    };
    render(
      <I18nextProvider i18n={i18n}>
        <Subject navigate={navigate} row={incompleteDetail} detail={incompleteDetail} />
      </I18nextProvider>
    );

    fireEvent.click(screen.getByText('POST /checkout'));

    await waitFor(() => expect(screen.getByText(/1 errors/)).toBeInTheDocument());
    expect(screen.queryByText('0.00 ms')).not.toBeInTheDocument();

    const spanButton = screen.getByText('checkout', { selector: 'strong' }).closest('button');
    expect(spanButton).not.toBeNull();
    expect(within(spanButton!).getByLabelText(`${i18n.t('explore.duration')}: —`)).toBeInTheDocument();
    expect(spanButton?.querySelector('[data-timing]')).toBeNull();
  });

  it('renders an actual zero-duration span as an instant instead of unavailable timing', () => {
    const instantDetail: TraceDetail = {
      ...traceDetail,
      durationNanos: 0,
      spans: (traceDetail.spans ?? []).map(span => ({
        ...span,
        spanName: 'instant span',
        durationNanos: 0
      }))
    };
    render(
      <I18nextProvider i18n={i18n}>
        <Subject navigate={vi.fn()} row={instantDetail} detail={instantDetail} />
      </I18nextProvider>
    );

    fireEvent.click(screen.getByText('POST /checkout'));

    const spanButton = screen.getByText('instant span', { selector: 'small' }).closest('button');
    expect(spanButton).not.toBeNull();
    expect(within(spanButton!).getByText('0.00 ms')).toBeInTheDocument();
    expect(spanButton?.querySelector('[data-timing="instant"]')).not.toBeNull();
    expect(within(spanButton!).queryByLabelText(`${i18n.t('explore.duration')}: —`)).not.toBeInTheDocument();
  });

  it('renders epoch startTime zero instead of treating it as absent', () => {
    render(
      <I18nextProvider i18n={i18n}>
        <Subject navigate={vi.fn()} row={{ ...traceDetail, startTime: 0 }} />
      </I18nextProvider>
    );
    expect(screen.getByText(new Date(0).toLocaleString())).toBeInTheDocument();
  });

  it('renders loading without leaking old trace detail', () => {
    renderState({ kind: 'loading', traceId: 'trace-2' });
    expect(document.querySelector('.ant-skeleton')).not.toBeNull();
    expect(screen.queryByText('http.status_code')).not.toBeInTheDocument();
  });

  it.each([
    [{ kind: 'missing', traceId: 'trace-1' } as const, 'explore.empty.traces'],
    [{ kind: 'unavailable', traceId: 'trace-1' } as const, 'common.unavailable'],
    [{ kind: 'error', traceId: 'trace-1' } as const, 'exploreTrace.loadFailed']
  ])('renders truthful detail state $state.kind', (state, messageKey) => {
    renderState(state);
    expect(screen.getByText(i18n.t(messageKey))).toBeInTheDocument();
  });

  it('keeps an open trace inspectable when a list refresh becomes empty', () => {
    const spans = traceSpanLayout(traceDetail);
    const state: TraceDetailState = {
      kind: 'ready',
      traceId: traceDetail.traceId,
      detail: traceDetail,
      spans,
      selected: spans[0]
    };
    render(
      <I18nextProvider i18n={i18n}>
        <TraceResult
          data={{ content: [], totalElements: 0, totalPages: 0, number: 0, size: 20 }}
          t={i18n.t}
          trace={{ ...closedTrace(), state }}
        />
      </I18nextProvider>
    );
    expect(screen.getByRole('complementary', { name: 'POST /checkout' })).toBeInTheDocument();
    expect(screen.getByText('http.status_code')).toBeInTheDocument();
  });
});

function renderState(state: TraceDetailState) {
  return render(
    <I18nextProvider i18n={i18n}>
      <TraceResult
        data={{ content: [traceDetail], totalElements: 1, totalPages: 1, number: 0, size: 20 }}
        t={i18n.t}
        trace={{ ...closedTrace(), state }}
      />
    </I18nextProvider>
  );
}

function Subject({
  navigate,
  row = traceDetail,
  detail = traceDetail
}: {
  navigate: (path: string) => void;
  row?: TraceDetail;
  detail?: TraceDetail;
}) {
  const { t } = useTranslation();
  const [state, setState] = useState<TraceDetailState>({ kind: 'closed' });
  const showDetail = (selectedId?: string) => {
    const spans = traceSpanLayout(detail);
    setState({
      kind: 'ready',
      traceId: detail.traceId,
      detail,
      spans,
      selected: spans.find(span => span.spanId === selectedId) ?? spans[0]
    });
  };
  return (
    <TraceResult
      data={{ content: [row], totalElements: 1, totalPages: 1, number: 0, size: 20 }}
      t={t}
      trace={{
        state,
        openTrace: () => showDetail(),
        close: () => setState({ kind: 'closed' }),
        retry: () => Promise.resolve(),
        selectSpan: showDetail,
        changePage: vi.fn(),
        openRelatedLogs: () => navigate(`/explore?signal=logs&traceId=${detail.traceId}`),
        openRelatedMetrics: () => navigate('/explore?signal=metrics')
      }}
    />
  );
}

function closedTrace() {
  return {
    state: { kind: 'closed' } as const,
    openTrace: vi.fn(),
    close: vi.fn(),
    selectSpan: vi.fn(),
    retry: () => Promise.resolve(),
    changePage: vi.fn(),
    openRelatedLogs: vi.fn(),
    openRelatedMetrics: vi.fn()
  };
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
  spans: [
    {
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
      events: [
        {
          timeUnixNano: null,
          name: 'retry.scheduled',
          attributes: { 'retry.attempt': 2 },
          droppedAttributesCount: null
        }
      ],
      links: null,
      codeNavigationHint: null
    }
  ]
};

class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
