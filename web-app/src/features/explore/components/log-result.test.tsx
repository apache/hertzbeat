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

import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { I18nextProvider, useTranslation } from 'react-i18next';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { i18n, initializeI18n, loadLocale } from '@/core/i18n/i18n';

import { LogResult } from './log-result';

describe('LogResult', () => {
  beforeAll(async () => {
    Object.defineProperty(globalThis, 'ResizeObserver', { value: ResizeObserverStub, configurable: true });
    await initializeI18n();
    await loadLocale('en-US');
  });

  beforeEach(() => {
    EventSourceStub.instances = [];
    Object.defineProperty(globalThis, 'EventSource', { value: EventSourceStub, configurable: true });
  });

  afterEach(() => cleanup());

  it('opens an inspectable OTLP log detail without leaving the workbench', () => {
    render(<I18nextProvider i18n={i18n}><Subject /></I18nextProvider>);
    fireEvent.click(screen.getByText('payment timeout'));
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
    expect(EventSourceStub.instances).toHaveLength(1);

    act(() => EventSourceStub.instances[0]?.emit({ body: 'live payment timeout', severityText: 'ERROR' }));
    expect(screen.getByText('live payment timeout')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Pause' }));
    expect(EventSourceStub.instances[0]?.close).toHaveBeenCalledOnce();
    fireEvent.click(screen.getByRole('button', { name: 'Clear' }));
    expect(screen.queryByText('live payment timeout')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Resume' }));
    expect(EventSourceStub.instances).toHaveLength(2);
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
  return <LogResult
    query={{ signal: 'logs', timeRange: 'last-30m', live: true }}
    t={t}
    navigate={vi.fn()}
  />;
}

class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}


class EventSourceStub {
  static instances: EventSourceStub[] = [];
  onopen: (() => void) | null = null;
  onerror: (() => void) | null = null;
  close = vi.fn();
  private listener?: (event: MessageEvent<string>) => void;

  constructor(readonly url: string) {
    EventSourceStub.instances.push(this);
  }

  addEventListener(_type: string, listener: EventListenerOrEventListenerObject) {
    this.listener = listener as (event: MessageEvent<string>) => void;
  }

  emit(row: Record<string, unknown>) {
    this.listener?.({ data: JSON.stringify(row) } as MessageEvent<string>);
  }
}
