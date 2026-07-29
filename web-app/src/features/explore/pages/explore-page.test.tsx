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
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { i18n, initializeI18n, loadLocale } from '@/core/i18n/i18n';
import en from '@/assets/i18n/en-us.json';
import { ApiMessageError } from '@/core/http/api-message';
import { GlobalTimeProvider, RouteTimeProvider } from '@/shared/time';

import { ExploreSignalContractError, type MetricConsole } from '../model/explore-signal-contract';

const api = vi.hoisted(() => ({
  loadMetricSignal: vi.fn(),
  loadLogSignal: vi.fn(),
  loadTraceSignal: vi.fn(),
  openLogStream: vi.fn()
}));

vi.mock('../api/explore-api', async importOriginal => ({
  ...(await importOriginal<typeof import('../api/explore-api')>()),
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

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it('does not widen partial or reversed instrumentation scope into any signal query or SSE stream', async () => {
    const invalidEntries = [
      '/explore?signal=metrics&intakeProfileId=primary-ingress&serviceName=checkout&serviceNamespace=commerce&start=1000&end=2000',
      '/explore?signal=logs&serviceName=checkout&serviceNamespace=commerce&environment=prod&collectorId=east&start=2000&end=1000',
      '/explore?signal=traces&collectorId=east',
      '/explore?signal=logs&mode=live&collectorId=east'
    ];

    for (const entry of invalidEntries) {
      renderPage(entry);
      expect(await screen.findByText(en.explore.handoffInvalid)).toBeInTheDocument();
      cleanup();
    }

    expect(api.loadMetricSignal).not.toHaveBeenCalled();
    expect(api.loadLogSignal).not.toHaveBeenCalled();
    expect(api.loadTraceSignal).not.toHaveBeenCalled();
    expect(api.openLogStream).not.toHaveBeenCalled();
  });

  it('queries history and opens live SSE for ordinary direct Explore scope', async () => {
    const scope =
      'serviceName=checkout&serviceNamespace=commerce&environment=prod&instance=checkout-1&endpoint=%2Fcheckout';
    renderPage(`/explore?signal=metrics&${scope}`);

    await waitFor(() =>
      expect(api.loadMetricSignal).toHaveBeenCalledWith(
        expect.objectContaining({
          signal: 'metrics',
          serviceName: 'checkout',
          serviceNamespace: 'commerce',
          environment: 'prod',
          instance: 'checkout-1',
          endpoint: '/checkout'
        }),
        expect.any(AbortSignal)
      )
    );
    expect(screen.queryByText(en.explore.handoffInvalid)).not.toBeInTheDocument();
    cleanup();

    renderPage(`/explore?signal=logs&mode=live&${scope}`);
    await waitFor(() =>
      expect(api.openLogStream).toHaveBeenCalledWith(
        '/api/logs/sse/subscribe?serviceName=checkout&serviceNamespace=commerce&environment=prod' +
          '&instance=checkout-1&endpoint=%2Fcheckout',
        expect.any(Object)
      )
    );
    expect(screen.queryByText(en.explore.handoffInvalid)).not.toBeInTheDocument();
  });

  it('does not reconnect a live log SSE stream when the shared relative window auto-refreshes', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(2_000_000);
    renderPage('/explore?signal=logs&mode=live');
    await act(async () => vi.advanceTimersByTimeAsync(0));
    expect(api.openLogStream).toHaveBeenCalledOnce();

    fireEvent.mouseDown(screen.getByRole('combobox', { name: /Auto refresh/u }));
    fireEvent.click(screen.getByText('Auto refresh 30s'));
    await act(async () => vi.advanceTimersByTimeAsync(30_000));

    expect(api.openLogStream).toHaveBeenCalledOnce();
  });

  it('preserves a complete scoped instrumentation handoff', async () => {
    renderPage(
      '/explore?signal=logs&serviceName=checkout&serviceNamespace=commerce&environment=prod' +
        '&collectorId=east&start=1710000000000&end=1710000005000'
    );

    await waitFor(() =>
      expect(api.loadLogSignal).toHaveBeenCalledWith(
        expect.objectContaining({
          signal: 'logs',
          serviceName: 'checkout',
          serviceNamespace: 'commerce',
          environment: 'prod',
          collectorId: 'east',
          start: 1_710_000_000_000,
          end: 1_710_000_005_000
        }),
        expect.any(AbortSignal)
      )
    );
  });

  it('retires instrumentation markers when removing a query-bar active filter', async () => {
    api.loadMetricSignal.mockResolvedValue(metricState('no_context', null));
    renderPage(
      '/explore?signal=metrics&serviceName=checkout&serviceNamespace=commerce&environment=prod' +
        '&collectorId=east&windowMode=preset'
    );
    await waitFor(() => expect(api.loadMetricSignal).toHaveBeenCalledOnce());

    const collector = screen.getByText(i18n.t('explore.collectorContext', { value: 'east' })).closest('.ant-tag');
    expect(collector).not.toBeNull();
    fireEvent.click(within(collector as HTMLElement).getByRole('img', { name: 'Close' }));

    await waitFor(() => expect(api.loadMetricSignal).toHaveBeenCalledTimes(2));
    expect(locationParams()).not.toHaveProperty('collectorId');
    expect(locationParams()).not.toHaveProperty('intakeProfileId');
    expect(locationParams()).not.toHaveProperty('windowMode');
    expect(locationParams()).toEqual(
      expect.objectContaining({
        signal: 'metrics',
        serviceName: 'checkout',
        serviceNamespace: 'commerce',
        environment: 'prod'
      })
    );
  });

  it.each(['metrics', 'logs', 'traces'] as const)(
    'queries %s from a complete direct-server handoff without showing invalid context',
    async signal => {
      renderPage(
        `/explore?signal=${signal}&intakeProfileId=primary-ingress&serviceName=checkout` +
          '&serviceNamespace=commerce&environment=prod&start=1710000000000&end=1710000005000'
      );
      const loader =
        signal === 'metrics' ? api.loadMetricSignal : signal === 'logs' ? api.loadLogSignal : api.loadTraceSignal;

      await waitFor(() =>
        expect(loader).toHaveBeenCalledWith(
          expect.objectContaining({
            signal,
            intakeProfileId: 'primary-ingress',
            serviceName: 'checkout',
            serviceNamespace: 'commerce',
            environment: 'prod',
            collectorId: undefined,
            start: 1_710_000_000_000,
            end: 1_710_000_005_000
          }),
          expect.any(AbortSignal)
        )
      );
      expect(screen.queryByText(en.explore.handoffInvalid)).not.toBeInTheDocument();
    }
  );

  it('drops an invalid URL filter and keeps typed controls local until a valid submission', async () => {
    renderPage('/explore?signal=metrics&page=4&aggregation=p95');
    const initialSearch = screen.getByTestId('location').textContent;
    fireEvent.click(screen.getByText(en.explore.advancedFilters));
    const step = screen.getByPlaceholderText(en.exploreMetric.step);
    fireEvent.change(step, { target: { value: '0' } });
    expect(screen.getByTestId('location')).toHaveTextContent(initialSearch ?? '');

    fireEvent.click(querySubmitButton());
    expect(await screen.findByText(en.explore.submissionErrors.invalidStep)).toBeInTheDocument();
    expect(screen.queryByText(en.explore.submissionErrors.unsupportedAggregation)).not.toBeInTheDocument();
    expect(screen.getByTestId('location')).toHaveTextContent(initialSearch ?? '');

    fireEvent.change(step, { target: { value: '60' } });
    const aggregation = screen.getByRole('combobox', { name: en.exploreMetric.aggregation });
    await selectOption(aggregation, 'sum');
    expect(screen.getByTestId('location')).toHaveTextContent(initialSearch ?? '');
    fireEvent.click(querySubmitButton());

    await waitFor(() =>
      expect(locationParams()).toEqual(
        expect.objectContaining({
          signal: 'metrics',
          aggregation: 'sum',
          step: '60'
        })
      )
    );
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
    ['no_context', 'missingContext', 'Choose a metric or service context.', false],
    ['unsupported_query', 'unsupportedQuery', null, false],
    ['load_failed', 'storageUnavailable', null, true]
  ] as const)(
    'renders the metric backend state %s without inventing empty data',
    async (reason, messageKey, errorMessage, retryable) => {
      api.loadMetricSignal.mockResolvedValue(metricState(reason, errorMessage));
      renderPage('/explore?signal=metrics');
      expect(await screen.findByText(i18n.t(`explore.states.${messageKey}`))).toBeInTheDocument();
      expect(screen.queryByText(en.explore.empty.metrics)).not.toBeInTheDocument();
      if (retryable) expect(screen.getByRole('button', { name: en.common.retry })).toBeInTheDocument();
      else expect(screen.queryByRole('button', { name: en.common.retry })).not.toBeInTheDocument();
    }
  );

  it('shows the metric backend error message and retries the same query', async () => {
    api.loadMetricSignal.mockResolvedValue(metricBackendError('storage offline'));
    renderPage('/explore?signal=metrics');

    expect(await screen.findByText('storage offline')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: en.common.retry }));
    await waitFor(() => expect(api.loadMetricSignal).toHaveBeenCalledTimes(2));
  });

  it.each([
    [new ApiMessageError('forbidden', { status: 403 }), 'common.permission.roleRequiredDescription'],
    [new ApiMessageError('offline', { status: 503 }), 'explore.states.transportError'],
    [new ExploreSignalContractError('invalid payload'), 'explore.states.contractError']
  ] as const)('renders classified request failures without calling them empty', async (reason, messageKey) => {
    api.loadLogSignal.mockRejectedValue(reason);
    renderPage('/explore?signal=logs');
    expect(await screen.findByText(i18n.t(messageKey))).toBeInTheDocument();
    expect(screen.queryByText(en.explore.empty.logs)).not.toBeInTheDocument();
  });
});

function metricState(emptyStateReason: string, errorMessage: string | null): MetricConsole {
  return {
    context: null,
    query: null,
    datasource: null,
    queryMode: null,
    results: null,
    stats: { totalSeries: 0, nonEmptySeries: 0, latestObservedAt: null },
    emptyStateReason,
    errorMessage
  };
}

function metricBackendError(message: string): MetricConsole {
  return {
    ...metricState('', null),
    results: { refId: null, status: 503, msg: message, frames: [] },
    emptyStateReason: null
  };
}

function renderPage(initialEntry: string) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } }
  });
  return render(
    <I18nextProvider i18n={i18n}>
      <QueryClientProvider client={client}>
        <MemoryRouter initialEntries={[initialEntry]}>
          <GlobalTimeProvider>
            <RouteTimeProvider policy="route_owned">
              <App>
                <ExplorePage />
                <LocationProbe />
              </App>
            </RouteTimeProvider>
          </GlobalTimeProvider>
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
  const button = screen
    .getAllByRole('button', { name: en.common.query })
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
