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

import { fireEvent, render, screen } from '@testing-library/react';
import { I18nextProvider, useTranslation } from 'react-i18next';
import { beforeAll, describe, expect, it, vi } from 'vitest';

import { i18n, initializeI18n, loadLocale } from '@/core/i18n/i18n';

import { LogResult } from './LogResult';

describe('LogResult', () => {
  beforeAll(async () => {
    Object.defineProperty(globalThis, 'ResizeObserver', { value: ResizeObserverStub, configurable: true });
    await initializeI18n();
    await loadLocale('en-US');
  });

  it('opens an inspectable OTLP log detail without leaving the workbench', () => {
    render(<I18nextProvider i18n={i18n}><Subject /></I18nextProvider>);
    fireEvent.click(screen.getByText('payment timeout'));
    expect(screen.getByRole('dialog', { name: 'Log detail' })).toBeInTheDocument();
    expect(screen.getByText(/service.version/)).toBeInTheDocument();
    expect(screen.getByText(/retry.count/)).toBeInTheDocument();
  });
});

function Subject() {
  const { t } = useTranslation();
  return <LogResult
    data={{ content: [{
      timeUnixNano: 1_750_000_000_000_000_000,
      severityText: 'ERROR',
      body: 'payment timeout',
      traceId: 'trace-1',
      spanId: 'span-1',
      resource: { 'service.name': 'checkout', 'service.version': '1.2.3' },
      attributes: { 'retry.count': 2 }
    }], totalElements: 1, totalPages: 1, number: 0, size: 20 }}
    query={{ signal: 'logs', timeRange: 'last-30m' }}
    t={t}
    navigate={vi.fn()}
  />;
}

class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
