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

import { cleanup, render, screen } from '@testing-library/react';
import { I18nextProvider, useTranslation } from 'react-i18next';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';

import { i18n, initializeI18n, loadLocale } from '@/core/i18n/i18n';

import type { MetricConsole } from '../api/explore-signal-contract';
import { MetricResult } from './metric-result';

describe('MetricResult', () => {
  afterEach(cleanup);

  beforeAll(async () => {
    Object.defineProperty(globalThis, 'ResizeObserver', { value: ResizeObserverStub, configurable: true });
    await initializeI18n();
    await loadLocale('en-US');
  });

  it('shows a populated series as a trend and inspectable samples', () => {
    render(<I18nextProvider i18n={i18n}><Subject data={metricData} /></I18nextProvider>);
    expect(screen.getByRole('heading', { name: 'Metrics' })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Metric trend' })).toBeInTheDocument();
    expect(screen.getByText('http.server.duration · checkout')).toBeInTheDocument();
    expect(screen.getByText('125 ms')).toBeInTheDocument();
  });

  it('keeps a true empty response distinct from a zero-valued series', () => {
    render(<I18nextProvider i18n={i18n}><Subject data={{ results: { status: 200, frames: [] } }} /></I18nextProvider>);
    expect(screen.getByText('No metric series for this context.')).toBeInTheDocument();

    cleanup();
    render(<I18nextProvider i18n={i18n}><Subject data={{ results: {
      status: 200,
      frames: [{ schema: { fields: [{ name: 'value', type: 'number' }] }, data: [[1_750_000_000_000, 0]] }]
    } }} /></I18nextProvider>);
    expect(screen.getByText('0')).toBeInTheDocument();
    expect(screen.queryByText('No metric series for this context.')).not.toBeInTheDocument();
  });

  it('treats explicit frames without numeric points as empty', () => {
    render(<I18nextProvider i18n={i18n}><Subject data={{ results: {
      status: 200,
      frames: [{ data: [] }, { data: [
        [1_750_000_000_000, 'not-a-number'],
        [1_750_000_000_001, null],
        [1_750_000_000_002, false],
        [1_750_000_000_003, '   ']
      ] }]
    } }} /></I18nextProvider>);
    expect(screen.getByText('No metric series for this context.')).toBeInTheDocument();
    expect(screen.queryByRole('img', { name: 'Metric trend' })).not.toBeInTheDocument();
  });

  it('renders backend failures instead of empty results', () => {
    render(<I18nextProvider i18n={i18n}><Subject data={{ results: { status: 503, msg: 'storage offline', frames: [] } }} /></I18nextProvider>);
    expect(screen.getByText('storage offline')).toBeInTheDocument();
    expect(screen.queryByText('No metric series for this context.')).not.toBeInTheDocument();

    cleanup();
    render(<I18nextProvider i18n={i18n}><Subject data={{ results: { status: 500, frames: [] } }} /></I18nextProvider>);
    expect(screen.getByText('The signal query failed.')).toBeInTheDocument();

    cleanup();
    render(<I18nextProvider i18n={i18n}><Subject data={{ errorMessage: 'transport failed', results: { status: 200, frames: [] } }} /></I18nextProvider>);
    expect(screen.getByText('transport failed')).toBeInTheDocument();
  });

  it('renders unavailable for malformed metric results', () => {
    const malformed: MetricConsole[] = [
      {},
      { results: { frames: [] } },
      { results: { status: 200 } },
      { results: { status: 200, frames: [{ data: [[1_750_000_000_000, 1]] }, {}] } }
    ];

    for (const data of malformed) {
      render(<I18nextProvider i18n={i18n}><Subject data={data} /></I18nextProvider>);
      expect(screen.getByText('The service is unavailable. Check the backend connection and try again.')).toBeInTheDocument();
      expect(screen.queryByText('No metric series for this context.')).not.toBeInTheDocument();
      cleanup();
    }
  });
});

function Subject({ data }: { data: MetricConsole }) {
  const { t } = useTranslation();
  return <MetricResult data={data} t={t} />;
}

const metricData: MetricConsole = {
  datasource: 'greptime',
  queryMode: 'range',
  stats: { totalSeries: 1 },
  results: {
    status: 200,
    frames: [{
      schema: { labels: { __name__: 'http.server.duration', service_name: 'checkout', method: 'POST' }, fields: [{ name: 'value', type: 'number', unit: 'ms' }] },
      data: [[1_750_000_000_000, 100], [1_750_000_060_000, 125]]
    }]
  }
};

class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
