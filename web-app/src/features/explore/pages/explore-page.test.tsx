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
import { App } from 'antd';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { i18n, initializeI18n, loadLocale } from '@/core/i18n/i18n';
import en from '@/assets/i18n/en-us.json';
import { ApiMessageError } from '@/core/http/api-message';

import { ExploreSignalContractError, type MetricConsole } from '../model/explore-signal-contract';

const api = vi.hoisted(() => ({
  loadMetricSignal: vi.fn(),
  loadLogSignal: vi.fn(),
  loadTraceSignal: vi.fn(),
  openLogStream: vi.fn()
}));

vi.mock('../api/explore-api', async importOriginal => ({
  ...await importOriginal<typeof import('../api/explore-api')>(),
  ...api
}));

import { ExplorePage } from './explore-page';

describe('ExplorePage instrumentation context boundary', () => {
  beforeAll(async () => {
    Object.defineProperty(globalThis, 'ResizeObserver', { value: ResizeObserverStub, configurable: true });
    await initializeI18n();
    await loadLocale('en-US');
  });

  beforeEach(() => {
    vi.clearAllMocks();
    const pending = () => new Promise<never>(() => undefined);
    api.loadMetricSignal.mockImplementation(pending);
    api.loadLogSignal.mockImplementation(pending);
    api.loadTraceSignal.mockImplementation(pending);
    api.openLogStream.mockReturnValue({
      close: vi.fn(),
      addEventListener: vi.fn(),
      onopen: null,
      onerror: null
    });
  });

  afterEach(() => cleanup());

  it('does not widen partial or reversed instrumentation scope into any signal query or SSE stream', async () => {
    const invalidEntries = [
      '/explore?signal=metrics&serviceNamespace=commerce',
      '/explore?signal=logs&serviceName=checkout&serviceNamespace=commerce&environment=prod&collectorId=east&start=2000&end=1000',
      '/explore?signal=traces&collectorId=east',
      '/explore?signal=logs&live=true&collectorId=east'
    ];

    for (const entry of invalidEntries) {
      renderPage(entry);
      expect(await screen.findByText(en.explore.handoffInvalid))
        .toBeInTheDocument();
      cleanup();
    }

    expect(api.loadMetricSignal).not.toHaveBeenCalled();
    expect(api.loadLogSignal).not.toHaveBeenCalled();
    expect(api.loadTraceSignal).not.toHaveBeenCalled();
    expect(api.openLogStream).not.toHaveBeenCalled();
  });

  it('continues to query ordinary Explore scope', async () => {
    renderPage('/explore?signal=metrics&serviceName=checkout&environment=prod');

    await waitFor(() => expect(api.loadMetricSignal).toHaveBeenCalledWith(
      expect.objectContaining({ signal: 'metrics', serviceName: 'checkout', environment: 'prod' }),
      expect.any(AbortSignal)
    ));
  });

  it('preserves a complete scoped instrumentation handoff', async () => {
    renderPage('/explore?signal=logs&serviceName=checkout&serviceNamespace=commerce&environment=prod'
      + '&collectorId=east&start=1710000000000&end=1710000005000');

    await waitFor(() => expect(api.loadLogSignal).toHaveBeenCalledWith(
      expect.objectContaining({
        signal: 'logs', serviceName: 'checkout', serviceNamespace: 'commerce', environment: 'prod',
        collectorId: 'east', start: 1_710_000_000_000, end: 1_710_000_005_000
      }),
      expect.any(AbortSignal)
    ));
  });

  it('keeps metric controls local until a valid typed submission updates the URL', async () => {
    renderPage('/explore?signal=metrics&page=4&aggregation=p95');
    const initialSearch = screen.getByTestId('location').textContent;
    fireEvent.click(screen.getByText(en.explore.advancedFilters));
    const step = screen.getByPlaceholderText(en.exploreMetric.step);
    fireEvent.change(step, { target: { value: '0' } });
    expect(screen.getByTestId('location')).toHaveTextContent(initialSearch ?? '');

    fireEvent.click(querySubmitButton());
    expect(await screen.findByText(en.explore.submissionErrors.invalidStep)).toBeInTheDocument();
    expect(screen.getByText(en.explore.submissionErrors.unsupportedAggregation)).toBeInTheDocument();
    expect(screen.getByTestId('location')).toHaveTextContent(initialSearch ?? '');

    fireEvent.change(step, { target: { value: '60' } });
    const aggregation = screen.getByRole('combobox', { name: en.exploreMetric.aggregation });
    await selectOption(aggregation, 'sum');
    expect(screen.getByTestId('location')).toHaveTextContent(initialSearch ?? '');
    fireEvent.click(querySubmitButton());

    await waitFor(() => expect(locationParams()).toEqual(expect.objectContaining({
      signal: 'metrics', aggregation: 'sum', step: '60'
    })));
    expect(locationParams()).not.toHaveProperty('page');
  });

  it('does not commit controlled log and trace toggles before submission', async () => {
    renderPage('/explore?signal=logs');
    fireEvent.click(screen.getByText(en.explore.advancedFilters));
    const severity = screen.getByRole('combobox', { name: en.explore.severity });
    await selectOption(severity, 'ERROR');
    expect(locationParams()).not.toHaveProperty('severityText');
    fireEvent.click(querySubmitButton());
    await waitFor(() => expect(locationParams()).toHaveProperty('severityText', 'ERROR'));

    cleanup();
    renderPage('/explore?signal=traces');
    fireEvent.click(screen.getByText(en.explore.advancedFilters));
    fireEvent.click(screen.getByRole('checkbox', { name: en.exploreTrace.errorOnly }));
    expect(locationParams()).not.toHaveProperty('errorOnly');
    fireEvent.click(querySubmitButton());
    await waitFor(() => expect(locationParams()).toHaveProperty('errorOnly', 'true'));
  });

  it('associates trace duration validation feedback with the invalid field', async () => {
    renderPage('/explore?signal=traces');
    fireEvent.click(screen.getByText(en.explore.advancedFilters));
    const min = screen.getByPlaceholderText(en.exploreTrace.minDuration);
    const max = screen.getByPlaceholderText(en.exploreTrace.maxDuration);

    fireEvent.change(min, { target: { value: '1.5' } });
    fireEvent.click(querySubmitButton());
    const invalidDuration = await screen.findByText(en.explore.submissionErrors.invalidDuration);
    expect(min).toHaveAttribute('aria-invalid', 'true');
    expect(min).toHaveAttribute('aria-describedby', invalidDuration.id);

    fireEvent.change(min, { target: { value: '200' } });
    fireEvent.change(max, { target: { value: '100' } });
    fireEvent.click(querySubmitButton());
    const ordering = await screen.findByText(en.explore.submissionErrors.minExceedsMax);
    expect(max).toHaveAttribute('aria-invalid', 'true');
    expect(max).toHaveAttribute('aria-describedby', ordering.id);
  });

  it.each([
    ['unsupported_query', 'unsupportedQuery'],
    ['load_failed', 'storageUnavailable']
  ] as const)('renders the metric backend state %s without inventing empty data', async (reason, messageKey) => {
    api.loadMetricSignal.mockResolvedValue(metricState(reason));
    renderPage('/explore?signal=metrics');
    expect(await screen.findByText(i18n.t(`explore.states.${messageKey}`))).toBeInTheDocument();
    expect(screen.queryByText(en.explore.empty.metrics)).not.toBeInTheDocument();
  });

  it.each([
    [new ApiMessageError('offline', { status: 503 }), 'transportError'],
    [new ExploreSignalContractError('invalid payload'), 'contractError']
  ] as const)('renders classified request failures without calling them empty', async (reason, messageKey) => {
    api.loadLogSignal.mockRejectedValue(reason);
    renderPage('/explore?signal=logs');
    expect(await screen.findByText(i18n.t(`explore.states.${messageKey}`))).toBeInTheDocument();
    expect(screen.queryByText(en.explore.empty.logs)).not.toBeInTheDocument();
  });
});

function metricState(emptyStateReason: string): MetricConsole {
  return { context: null, query: null, datasource: null, queryMode: null, results: null,
    stats: { totalSeries: 0, nonEmptySeries: 0, latestObservedAt: null }, emptyStateReason, errorMessage: null };
}

function renderPage(initialEntry: string) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } }
  });
  return render(
    <I18nextProvider i18n={i18n}>
      <QueryClientProvider client={client}>
        <MemoryRouter initialEntries={[initialEntry]}>
          <App><ExplorePage /><LocationProbe /></App>
        </MemoryRouter>
      </QueryClientProvider>
    </I18nextProvider>
  );
}

function LocationProbe() {
  const location = useLocation();
  return <output data-testid="location">{location.search}</output>;
}

function locationParams() {
  return Object.fromEntries(new URLSearchParams(screen.getByTestId('location').textContent ?? ''));
}

function querySubmitButton() {
  const button = screen.getAllByRole('button', { name: en.common.query })
    .find(candidate => candidate.getAttribute('type') === 'submit');
  if (!button) throw new Error('Explore query submit button is missing');
  return button;
}

async function selectOption(combobox: HTMLElement, label: string) {
  fireEvent.mouseDown(combobox);
  const options = await screen.findAllByText(label);
  const option = options.at(-1);
  if (!option) throw new Error(`Select option is missing: ${label}`);
  fireEvent.click(option);
}

class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
