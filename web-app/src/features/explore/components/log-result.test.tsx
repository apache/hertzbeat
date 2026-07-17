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

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { I18nextProvider, useTranslation } from 'react-i18next';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import { i18n, initializeI18n, loadLocale } from '@/core/i18n/i18n';

import { LogResult } from './log-result';

describe('LogResult', () => {
  beforeAll(async () => {
    Object.defineProperty(globalThis, 'ResizeObserver', { value: ResizeObserverStub, configurable: true });
    await initializeI18n();
    await loadLocale('en-US');
  });

  afterEach(() => cleanup());

  it('opens an inspectable OTLP log detail without leaving the workbench', () => {
    render(<I18nextProvider i18n={i18n}><Subject /></I18nextProvider>);
    const logRow = screen.getByText('payment timeout').closest('tr');
    expect(logRow).toHaveAttribute('tabindex', '0');
    fireEvent.keyDown(logRow!, { key: ' ' });
    expect(screen.getByRole('dialog', { name: 'Log detail' })).toBeInTheDocument();
    expect(screen.getByText(/service.version/)).toBeInTheDocument();
    expect(screen.getByText(/retry.count/)).toBeInTheDocument();
  });

  it('keeps an out-of-range nonzero page ready with authoritative total', () => {
    render(<I18nextProvider i18n={i18n}><LogResult
      data={{ content: [], totalElements: 3, totalPages: 1, number: 3, size: 20 }}
      query={{ signal: 'logs', timeRange: 'last-30m', pageIndex: 3 }}
      t={i18n.t}
      navigate={vi.fn()}
    /></I18nextProvider>);
    expect(screen.getByRole('heading', { name: 'Logs' }).parentElement).toHaveTextContent('3');
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('lets an operator pause, resume, and clear a live stream', () => {
    render(<I18nextProvider i18n={i18n}><LiveSubject /></I18nextProvider>);
    expect(screen.getByText('live payment timeout')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Pause' }));
    expect(screen.getByText('Paused')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Clear' }));
    expect(screen.queryByText('live payment timeout')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Resume' }));
    expect(screen.getByText('Connecting to log stream')).toBeInTheDocument();
  });

  it('does not turn a missing live view into a historical empty result', () => {
    render(<I18nextProvider i18n={i18n}><LogResult
      query={{ signal: 'logs', timeRange: 'last-30m', live: true }}
      t={i18n.t}
      navigate={vi.fn()}
    /></I18nextProvider>);
    expect(screen.getByRole('alert')).toHaveTextContent(i18n.t('exploreLog.streamFailed'));
    expect(screen.queryByText(i18n.t('explore.empty.logs'))).not.toBeInTheDocument();
  });

  it.each([
    ['unavailable', 'common.unavailable'],
    ['error', 'exploreLog.streamFailed'],
    ['contract', 'explore.loadFailed']
  ] as const)('labels %s without claiming the stream is connecting', (status, messageKey) => {
    render(<I18nextProvider i18n={i18n}><LogResult
      query={{ signal: 'logs', timeRange: 'last-30m', live: true }}
      t={i18n.t}
      navigate={vi.fn()}
      live={{ rows: [], status, togglePaused: vi.fn(), clear: vi.fn() }}
    /></I18nextProvider>);
    expect(screen.getAllByText(i18n.t(messageKey)).length).toBeGreaterThan(0);
    expect(screen.queryByText(i18n.t('exploreLog.connecting'))).not.toBeInTheDocument();
  });
});

function Subject() {
  const { t } = useTranslation();
  return <LogResult
    data={{ content: [{
      timeUnixNano: 1_750_000_000_000_000_000,
      observedTimeUnixNano: null,
      severityNumber: null,
      severityText: 'ERROR',
      body: 'payment timeout',
      droppedAttributesCount: null,
      traceId: 'trace-1',
      spanId: 'span-1',
      traceFlags: null,
      resource: { 'service.name': 'checkout', 'service.version': '1.2.3' },
      attributes: { 'retry.count': 2 },
      resourceSchemaUrl: null,
      instrumentationScope: null,
      scopeSchemaUrl: null
    }], totalElements: 1, totalPages: 1, number: 0, size: 20 }}
    query={{ signal: 'logs', timeRange: 'last-30m' }}
    t={t}
    navigate={vi.fn()}
  />;
}

function LiveSubject() {
  const { t } = useTranslation();
  const [rows, setRows] = useState([liveLogRow]);
  const [paused, setPaused] = useState(false);
  return <LogResult
    query={{ signal: 'logs', timeRange: 'last-30m', live: true }}
    t={t}
    navigate={vi.fn()}
    live={{
      rows,
      status: paused ? 'paused' : 'waiting',
      togglePaused: () => setPaused(current => !current),
      clear: () => setRows([])
    }}
  />;
}

const liveLogRow = {
  timeUnixNano: 1_750_000_000_000_000_000, observedTimeUnixNano: null, severityNumber: 17,
  severityText: 'ERROR', body: 'live payment timeout', attributes: null, droppedAttributesCount: null,
  traceId: null, spanId: null, traceFlags: null, resource: null, resourceSchemaUrl: null,
  instrumentationScope: null, scopeSchemaUrl: null
};

class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
