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

import { setLogSearchText, logSearchText } from '../components/test-log-search-editor';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { App } from 'antd';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { i18n, initializeI18n, loadLocale } from '@/core/i18n/i18n';
import en from '@/assets/i18n/en-us.json';
import { ApiMessageError } from '@/core/http/api-message';
import { RuntimeThemeContext } from '@/core/runtime-theme-context';
import { SessionContext } from '@/core/auth/session-context';
import { loadPersesRuntime } from '@/platform/perses/runtime/perses-runtime-registry';
import { ShellInvestigationProvider, useShellInvestigation } from '@/shared/investigation';
import { GlobalTimeProvider, RouteTimeProvider } from '@/shared/time';

import {
  ExploreSignalContractError,
  type ExplorePageResult,
  type LogRow,
  type MetricConsole
} from '../model/explore-signal-contract';

const api = vi.hoisted(() => ({
  loadMetricSignal: vi.fn(),
  loadMetricInventory: vi.fn(),
  loadLogSignal: vi.fn(),
  loadTraceSignal: vi.fn(),
  openLogStream: vi.fn()
}));

vi.mock('../api/explore-api', async importOriginal => ({
  ...(await importOriginal<typeof import('../api/explore-api')>()),
  ...api,
  loadLogHistoryEvidence: api.loadLogSignal
}));

import { ExplorePage } from './explore-page';

describe('ExplorePage instrumentation context boundary', () => {
  beforeAll(async () => {
    Object.defineProperty(globalThis, 'ResizeObserver', { value: ResizeObserverStub, configurable: true });
    await initializeI18n();
    await loadLocale('en-US');
    await loadPersesRuntime();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    // jsdom has no scrolling API; native browser proofs cover the actual viewport movement.
    Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', { configurable: true, value: vi.fn() });
    vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(800);
    vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockReturnValue(360);
    const pending = () => new Promise<never>(() => undefined);
    api.loadMetricSignal.mockImplementation(pending);
    api.loadMetricInventory.mockResolvedValue({
      context: null,
      source: 'greptime-inventory',
      limit: 100,
      truncated: false,
      items: []
    });
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
    localStorage.clear();
    vi.useRealTimers();
  });

  it('keeps Logs in an explicit workspace and applies its search only on Query', async () => {
    renderPage('/explore?signal=logs&start=1000&end=2000');
    const workspace = document.querySelector('[data-explore-logs-workspace]');
    expect(workspace).toBeInTheDocument();
    expect(workspace).toHaveAttribute('data-explore-query-layout', 'split');
    expect(workspace).toHaveAttribute('data-layout', 'continuous');
    expect(workspace?.querySelector('[data-explore-logs-region="search"]')).toBeInTheDocument();
    expect(workspace?.querySelector('[data-explore-logs-region="body"]')).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Log trend' })).toHaveAttribute('data-trend-state', 'loading');
    expect(screen.getByRole('region', { name: 'Logs' })).toHaveAttribute('id', 'explore-panel-logs');
    setLogSearchText(screen.getByRole('combobox', { name: 'Logs query' }), 'ERROR');
    expect(locationParams().query).toBeUndefined();
    fireEvent.click(querySubmitButton());
    await waitFor(() => expect(locationParams().query).toBe('ERROR'));
  });

  it('keeps a pending unified Logs query beside facets until Query is submitted', () => {
    renderPage('/explore?signal=logs&start=1000&end=2000');
    const search = document.querySelector('[data-explore-logs-region="search"]')!;
    const rail = facetRail();
    const input = within(search as HTMLElement).getByRole('combobox', { name: i18n.t('explore.queryLabels.logs') });
    const requests = api.loadLogSignal.mock.calls.length;
    expect(rail).toBeVisible();
    setLogSearchText(input, 'resource.service.version:"3"');
    expect(logSearchText(input)).toBe('resource.service.version:"3"');
    expect(locationParams()).not.toHaveProperty('query');
    expect(api.loadLogSignal).toHaveBeenCalledTimes(requests);
  });

  it('keeps the applied Logs query when Query submits an unclosed quote', async () => {
    renderPage('/explore?signal=logs&start=1000&end=2000&query=applied&searchSyntax=structured-v1');
    setLogSearchText(screen.getByRole('combobox', { name: i18n.t('explore.queryLabels.logs') }), '@endpoint:"');
    fireEvent.click(querySubmitButton());
    expect(locationParams().query).toBe('applied');
    expect(await screen.findByText(i18n.t('explore.logAuthoring.syntaxIssue.unclosed_quote'))).toBeVisible();
  });

  it('keeps legacy extra measures intact until an explicit reset and blocks Run and Save', async () => {
    const legacy = JSON.stringify({
      version: 1,
      representation: 'table',
      limit: 20,
      order: 'count-desc',
      minCount: 1,
      additionalMeasures: [{ function: 'avg', field: 'attribute:duration' }]
    });
    renderPage(`/explore?signal=logs&start=1000&end=2000&logAnalysis=${encodeURIComponent(legacy)}`, true);
    expect(await screen.findByText(i18n.t('explore.logAnalysis.legacyUnsupported'))).toBeVisible();
    expect(querySubmitButton()).toBeDisabled();
    fireEvent.submit(screen.getByRole('form', { name: i18n.t('explore.queryToolbar') }));
    expect(locationParams().logAnalysis).toBe(legacy);
    fireEvent.click(screen.getByRole('button', { name: i18n.t('exploreSaved.myView') }));
    expect(
      within(await screen.findByRole('complementary', { name: i18n.t('exploreSaved.views') })).getByRole('button', {
        name: i18n.t('exploreSaved.saveAs')
      })
    ).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: i18n.t('explore.logAnalysis.label') }));
    expect(screen.getByRole('button', { name: i18n.t('common.confirm') })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: i18n.t('explore.logAnalysis.reset') }));
    fireEvent.click(screen.getByRole('button', { name: i18n.t('common.confirm') }));
    await waitFor(() => expect(locationParams().logAnalysis).not.toBe(legacy));
    expect(querySubmitButton()).toBeEnabled();
  });

  it('selects a catalog metric into the draft and commits only the explicit Query action', async () => {
    api.loadMetricSignal.mockResolvedValue({ kind: 'selection_required' });
    api.loadMetricInventory.mockResolvedValue({
      context: null,
      source: 'greptime-inventory',
      limit: 100,
      truncated: false,
      items: [{ metricName: 'process_cpu_usage', family: null }]
    });
    renderPage('/explore?signal=metrics&serviceName=HertzBeat&start=1750000000000&end=1750001800000', true);
    await screen.findByText(i18n.t('exploreMetric.selectMetric'));
    expect(locationParams().query).toBeUndefined();
    fireEvent.click(screen.getByText(i18n.t('exploreMetric.catalog')));
    fireEvent.click(await screen.findByRole('button', { name: 'process_cpu_usage' }));
    expect(screen.getByRole('textbox', { name: i18n.t('explore.metricComposition.metric', { ref: 'a' }) })).toHaveValue(
      'process_cpu_usage'
    );
    expect(screen.queryByText(i18n.t('exploreMetric.pendingDraft'))).not.toBeInTheDocument();
    expect(locationParams().query).toBeUndefined();
    expect(api.loadMetricSignal).toHaveBeenCalledOnce();
    fireEvent.click(querySubmitButton());
    await waitFor(() => expect(locationParams().query).toBe('process_cpu_usage'));
    expect(api.loadMetricSignal).toHaveBeenLastCalledWith(
      expect.objectContaining({ query: 'process_cpu_usage', serviceName: 'HertzBeat' }),
      expect.any(AbortSignal)
    );
    expect(api.loadMetricInventory).toHaveBeenCalledOnce();
  });

  it('uses the shared operational workspace and compact loading evidence', () => {
    renderPage('/explore?signal=metrics');

    expect(document.querySelector('[data-hb-operational-page][data-mode="workspace"]')).toBeInTheDocument();
    expect(document.querySelector('[data-hb-operational-command-bar]')).toBeInTheDocument();
    expect(screen.getByText(i18n.t('explore.states.loading')).closest('[data-state]')).toHaveAttribute(
      'data-state',
      'loading'
    );
  });

  it('submits one structured search with resource and attribute clauses', async () => {
    renderPage('/explore?signal=logs&start=1000&end=2000');
    const input = screen.getByRole('combobox', { name: i18n.t('explore.queryLabels.logs') });
    const search = 'resource.service.version:"3" AND @http.route:"checkout"';
    setLogSearchText(input, search);
    expect(locationParams()).not.toHaveProperty('query');
    fireEvent.click(querySubmitButton());
    await waitFor(() => expect(locationParams()).toMatchObject({ query: search, searchSyntax: 'structured-v1' }));
    expect(locationParams()).not.toHaveProperty('resourceFilter');
    expect(locationParams()).not.toHaveProperty('attributeFilter');
  });

  it('preserves an unsubmitted legacy URL filter while editing the unified search', () => {
    renderPage('/explore?signal=logs&resourceFilter=service.version%20LIKE%202');
    const input = screen.getByRole('combobox', { name: i18n.t('explore.queryLabels.logs') });
    input.focus();
    setLogSearchText(input, 'resource.service.version:"2"');
    expect(logSearchText(input)).toBe('resource.service.version:"2"');
    expect(input).toHaveFocus();
    expect(locationParams().resourceFilter).toBe('service.version LIKE 2');
    expect(locationParams()).not.toHaveProperty('query');
  });

  it('keeps essential metric filters visible and submits the labeled query', async () => {
    renderPage('/explore?signal=metrics');

    const primaryQuery = screen.getByRole('textbox', {
      name: i18n.t('explore.metricComposition.metric', { ref: 'a' })
    });
    expect(screen.getByRole('textbox', { name: en.explore.serviceName })).toBeVisible();
    expect(screen.getByRole('textbox', { name: en.explore.environment })).toBeVisible();
    expect(screen.getByText(en.explore.advancedFilters)).toBeInTheDocument();

    const serviceName = screen.getByRole('textbox', { name: en.explore.serviceName });
    const environment = screen.getByRole('textbox', { name: en.explore.environment });
    fireEvent.change(primaryQuery, { target: { value: 'http_request_duration_seconds' } });
    fireEvent.change(serviceName, { target: { value: 'checkout' } });
    fireEvent.change(environment, { target: { value: 'prod' } });
    fireEvent.click(querySubmitButton());

    await waitFor(() =>
      expect(locationParams()).toEqual(
        expect.objectContaining({
          query: 'http_request_duration_seconds',
          serviceName: 'checkout',
          environment: 'prod'
        })
      )
    );
  });

  it('preserves query focus and pending unified search through ready, refreshing, and ready', async () => {
    const refresh = deferred(logEvidence(logPage('replacement', 'not-a-trace-id')));
    api.loadLogSignal
      .mockResolvedValueOnce(logEvidence(logPage('original', 'not-a-trace-id')))
      .mockReturnValueOnce(refresh.promise);
    renderPage('/explore?signal=logs');
    await screen.findByRole('row', { name: /original/u });
    const input = screen.getByRole('combobox', { name: i18n.t('explore.queryLabels.logs') });
    setLogSearchText(input, 'unsent message');
    expect(facetRail()).toBeVisible();
    input.focus();
    fireEvent.click(screen.getByRole('button', { name: en.common.refresh }));
    await screen.findByText(i18n.t('explore.states.refreshing'));
    expect(screen.getByRole('combobox', { name: i18n.t('explore.queryLabels.logs') })).toBe(input);
    expect(input).toHaveFocus();
    expect(logSearchText(input)).toBe('unsent message');
    refresh.resolve();
    await screen.findByRole('row', { name: /replacement/u });
    expect(screen.getByRole('combobox', { name: i18n.t('explore.queryLabels.logs') })).toBe(input);
    expect(logSearchText(input)).toBe('unsent message');
    expect(locationParams()).not.toHaveProperty('query');
  });

  it('shows trace operation, service, environment, error and duration controls before More filters', () => {
    renderPage('/explore?signal=traces');
    for (const label of [i18n.t('explore.queryLabels.traces'), en.explore.serviceName, en.explore.environment]) {
      expect(screen.getByRole('textbox', { name: label })).toBeVisible();
    }
    expect(screen.getByPlaceholderText(en.exploreTrace.minDuration)).toBeVisible();
    expect(screen.getByPlaceholderText(en.exploreTrace.maxDuration)).toBeVisible();
    expect(
      screen.getByRole('checkbox', { name: i18n.t('exploreTrace.errorTracesOnly') }).closest('label')
    ).toBeVisible();
  });

  it('keeps active rare filters counted and visible as chips without forcing the disclosure open', () => {
    renderPage('/explore?signal=metrics&serviceNamespace=commerce&instance=checkout-1&groupBy=host');
    const summary = screen.getByText(en.explore.advancedFilters).closest('summary');
    expect(summary).toHaveTextContent('2');
    expect(screen.getByRole('combobox', { name: `a ${i18n.t('exploreMetric.groupBy')}` })).toBeVisible();
    expect(summary?.parentElement).not.toHaveAttribute('open');
    expect(screen.getByRole('textbox', { name: i18n.t('explore.serviceNamespace') })).not.toBeVisible();
    expect(screen.getByText(i18n.t('explore.serviceNamespaceContext', { value: 'commerce' }))).toBeVisible();
    expect(screen.getByLabelText(i18n.t('explore.metricComposition.options', { ref: 'a' }))).toHaveAttribute(
      'aria-expanded',
      'false'
    );
  });

  it('preserves row option toggles and blocks invalid steps without losing the draft', async () => {
    renderPage('/explore?signal=metrics&query=http_requests_total');
    const summary = screen.getByLabelText(i18n.t('explore.metricComposition.options', { ref: 'a' }));
    fireEvent.click(summary);
    const step = screen.getByRole('textbox', { name: `a ${en.exploreMetric.step}` });
    fireEvent.change(step, { target: { value: '0' } });
    fireEvent.click(summary);
    expect(summary).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(querySubmitButton());
    expect(await screen.findByText(/a:.*step/i)).toBeVisible();
    expect(locationParams()).not.toHaveProperty('metricPlan');
    fireEvent.click(summary);
    step.focus();
    fireEvent.change(step, { target: { value: '30' } });
    expect(step).toHaveFocus();
    fireEvent.click(querySubmitButton());
    await waitFor(() => expect(locationParams().step).toBe('30'));
    expect(JSON.parse(locationParams().metricPlan!).queries[0].step).toBe('30');
  });

  it('does not widen partial or reversed instrumentation scope into any signal query or SSE stream', async () => {
    const invalidEntries = [
      '/explore?signal=metrics&intakeProfileId=primary-ingress&serviceName=checkout&serviceNamespace=commerce&start=1000&end=2000',
      '/explore?signal=logs&serviceName=checkout&serviceNamespace=commerce&environment=prod&collectorId=east&start=2000&end=1000',
      '/explore?signal=traces&collectorId=east',
      '/explore?signal=traces&serviceName=checkout&serviceNamespace=commerce&environment=prod' +
        '&collectorId=east&windowMode=preset&start=1000',
      '/explore?signal=traces&windowMode=preset&start=1000',
      '/explore?signal=traces&windowMode=preset&start=2000&end=1000',
      '/explore?signal=logs&mode=live&collectorId=east'
    ];

    for (const entry of invalidEntries) {
      renderPage(entry);
      expect((await screen.findAllByText(en.explore.handoffInvalid)).length).toBeGreaterThan(0);
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
          '&instance=checkout-1&endpoint=%2Fcheckout&searchSyntax=structured-v1',
        expect.any(Object)
      )
    );
    expect(screen.queryByText(en.explore.handoffInvalid)).not.toBeInTheDocument();
  });

  it('keeps the live log SSE stream stable without exposing auto-refresh in the fixed Logs row', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(2_000_000);
    renderPage('/explore?signal=logs&mode=live');
    await act(async () => vi.advanceTimersByTimeAsync(0));
    expect(api.openLogStream).toHaveBeenCalledOnce();
    expect(screen.queryByRole('combobox', { name: /Auto refresh/u })).not.toBeInTheDocument();

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

  it.each(['logs', 'traces'] as const)(
    'keeps the exact instrumentation scope and Collector chip when submitting a %s query',
    async signal => {
      renderPage(
        `/explore?signal=${signal}&serviceName=checkout&serviceNamespace=commerce&environment=prod` +
          '&intakeProfileId=collector%3Aeast&collectorId=east&instance=checkout-1&endpoint=%2Fcheckout' +
          '&start=1710000000000&end=1710000005000'
      );
      const collectorLabel = i18n.t('explore.collectorContext', { value: 'east' });

      expect(await screen.findByText(collectorLabel)).toBeInTheDocument();
      fireEvent.click(querySubmitButton());

      await waitFor(() =>
        expect(locationParams()).toEqual(
          expect.objectContaining({
            signal,
            serviceName: 'checkout',
            serviceNamespace: 'commerce',
            environment: 'prod',
            intakeProfileId: 'collector:east',
            collectorId: 'east',
            instance: 'checkout-1',
            endpoint: '/checkout',
            start: '1710000000000',
            end: '1710000005000'
          })
        )
      );
      expect(screen.getByText(collectorLabel)).toBeInTheDocument();
    }
  );

  it('retires instrumentation markers when removing a query-bar active filter', async () => {
    api.loadMetricSignal.mockResolvedValue(metricState('no_context', null));
    renderPage(
      '/explore?signal=metrics&serviceName=checkout&serviceNamespace=commerce&environment=prod' +
        '&collectorId=east&windowMode=preset'
    );
    await waitFor(() => expect(api.loadMetricSignal).toHaveBeenCalledOnce());

    const collector = screen.getByText(i18n.t('explore.collectorContext', { value: 'east' })).closest('.ant-tag');
    expect(collector).not.toBeNull();
    fireEvent.click(within(collector as HTMLElement).getByRole('button'));

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
    renderPage('/explore?signal=metrics&query=cpu&page=4&aggregation=p95');
    await waitFor(() =>
      expect(locationParams()).toEqual(
        expect.objectContaining({
          signal: 'metrics',
          timeRange: 'last-30m'
        })
      )
    );
    const initialSearch = screen.getByTestId('location').textContent;
    fireEvent.click(screen.getByLabelText(i18n.t('explore.metricComposition.options', { ref: 'a' })));
    const step = screen.getByRole('textbox', { name: `a ${en.exploreMetric.step}` });
    fireEvent.change(step, { target: { value: '0' } });
    expect(screen.getByTestId('location')).toHaveTextContent(initialSearch ?? '');

    fireEvent.click(querySubmitButton());
    expect(await screen.findByText(/a:.*step/i)).toBeInTheDocument();
    expect(screen.queryByText(en.explore.submissionErrors.unsupportedAggregation)).not.toBeInTheDocument();
    expect(screen.getByTestId('location')).toHaveTextContent(initialSearch ?? '');

    fireEvent.change(step, { target: { value: '60' } });
    const aggregation = screen.getByRole('combobox', { name: `a ${en.exploreMetric.aggregation}` });
    await selectOption(aggregation, 'avg');
    expect(screen.getByTestId('location')).toHaveTextContent(initialSearch ?? '');
    fireEvent.click(querySubmitButton());

    await waitFor(() =>
      expect(locationParams()).toEqual(
        expect.objectContaining({
          signal: 'metrics',
          aggregation: 'avg',
          step: '60'
        })
      )
    );
    expect(locationParams()).not.toHaveProperty('page');
  });

  it('does not commit log search or trace filters before submission', async () => {
    renderPage('/explore?signal=logs');
    const search = 'status:"ERROR" AND @trace_id:"trace-1"';
    setLogSearchText(screen.getByRole('combobox', { name: i18n.t('explore.queryLabels.logs') }), search);
    expect(locationParams()).not.toHaveProperty('query');
    fireEvent.click(querySubmitButton());
    await waitFor(() => expect(locationParams()).toMatchObject({ query: search, searchSyntax: 'structured-v1' }));

    cleanup();
    renderPage('/explore?signal=traces');
    fireEvent.click(screen.getByText(en.explore.advancedFilters));
    const attributeFilter = screen.getByPlaceholderText(i18n.t('exploreTrace.attributeFilter'));
    fireEvent.change(attributeFilter, { target: { value: 'http.route=/checkout' } });
    fireEvent.click(screen.getByRole('checkbox', { name: i18n.t('exploreTrace.errorTracesOnly') }));
    expect(locationParams()).not.toHaveProperty('errorOnly');
    expect(locationParams()).not.toHaveProperty('attributeFilter');
    fireEvent.click(querySubmitButton());
    await waitFor(() =>
      expect(locationParams()).toEqual(
        expect.objectContaining({ errorOnly: 'true', attributeFilter: 'http.route=/checkout' })
      )
    );
  });

  it('renders localized signal-specific parity controls in the advanced filter surface', async () => {
    renderPage('/explore?signal=metrics');
    fireEvent.click(screen.getByLabelText(i18n.t('explore.metricComposition.options', { ref: 'a' })));
    const temporalAggregation = screen.getByRole('combobox', { name: `a ${en.exploreMetric.temporalAggregation}` });
    await selectOption(temporalAggregation, en.exploreMetric.temporalAggregationValues.rate);
    expect(screen.getAllByText(en.exploreMetric.temporalAggregationValues.rate).length).toBeGreaterThan(0);

    cleanup();
    renderPage('/explore?signal=traces');
    fireEvent.click(screen.getByText(en.explore.advancedFilters));
    const spanScope = screen.getByRole('combobox', { name: en.exploreTrace.spanScope });
    await selectOption(spanScope, en.exploreTrace.spanScopeValues.root);
    expect(screen.getAllByText(en.exploreTrace.spanScopeValues.root).length).toBeGreaterThan(0);
    expect(screen.getByRole('checkbox', { name: en.exploreTrace.hideInternal })).toBeInTheDocument();
    expect(screen.getByPlaceholderText(i18n.t('exploreTrace.attributeFilter'))).toBeInTheDocument();

    cleanup();
    renderPage('/explore?signal=logs');
    expect(facetRail()).toBeVisible();
    expect(screen.getByRole('combobox', { name: i18n.t('explore.queryLabels.logs') })).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: i18n.t('explore.logAuthoring.help') }));
    expect(screen.getByRole('region', { name: i18n.t('explore.logAuthoring.help') })).toHaveTextContent(
      i18n.t('explore.logAuthoring.structuredHelp')
    );
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
    expect((await screen.findAllByText(i18n.t(messageKey))).length).toBeGreaterThan(0);
    expect(screen.queryByText(en.explore.empty.logs)).not.toBeInTheDocument();
  });

  it('places log authoring and Trend before the facet and result area', async () => {
    api.loadLogSignal.mockResolvedValue(logEvidence(logPage('flat log evidence', 'not-a-trace-id')));
    renderPage('/explore?signal=logs');
    expect(await screen.findByRole('row', { name: /flat log evidence/u })).toBeInTheDocument();

    const panel = screen.getByRole('region', { name: en.explore.signals.logs });
    expect(panel).toHaveAttribute('data-layout', 'continuous');
    expect(panel.closest('[data-explore-workspace="true"]')).toHaveAttribute('data-layout', 'continuous');
    const regions = Array.from(panel.querySelectorAll('[data-explore-region]'));
    expect(regions.map(region => region.getAttribute('data-explore-region'))).toEqual(['query', 'results']);
    expect(
      Array.from(panel.querySelectorAll('[data-explore-logs-region]')).map(region =>
        region.getAttribute('data-explore-logs-region')
      )
    ).toEqual(['search', 'authoring', 'trend', 'body']);
    expect(
      Array.from(panel.querySelectorAll('[data-explore-log-region]')).map(region =>
        region.getAttribute('data-explore-log-region')
      )
    ).toEqual(['authoring', 'trend', 'result']);
    expect(
      panel.querySelector('[data-explore-logs-region="trend"] [data-explore-log-region="trend"]')
    ).toBeInTheDocument();
    expect(
      panel.querySelector('[data-explore-logs-region="body"] [data-explore-log-region="result"]')
    ).toBeInTheDocument();
    expect(panel.querySelector('[data-explore-logs-region="authoring"] [role="group"]')).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: i18n.t('explore.logTransactions.groupInto') })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: i18n.t('explore.logPatterns.mode') })).not.toBeInTheDocument();
    expect(
      within(screen.getByRole('form', { name: i18n.t('explore.queryToolbar') })).queryByRole('button', {
        name: i18n.t('explore.logFacets.core.add')
      })
    ).toBeInTheDocument();
    const display = screen.getByRole('group', { name: i18n.t('explore.logAnalysis.representation') });
    for (const view of ['logs', 'timeseries']) {
      expect(within(display).getByRole('button', { name: i18n.t(`explore.logAnalysis.${view}`) })).toBeInTheDocument();
    }
    expect(screen.queryByRole('button', { name: i18n.t('explore.logAnalysis.label') })).not.toBeInTheDocument();
    regions.forEach(region => {
      expect(region.querySelector('.ant-card, [data-surface="card"], [data-hb-card]')).toBeNull();
    });
    await waitFor(() =>
      expect(screen.getByRole('status', { name: 'Explore query updates' })).toHaveTextContent(
        'Query complete. 1 result.'
      )
    );
    fireEvent.click(within(display).getByRole('button', { name: i18n.t('explore.logAnalysis.timeseries') }));
    expect(await screen.findByRole('button', { name: i18n.t('explore.logAnalysis.label') })).toBeInTheDocument();
  });

  it('keeps the facet visibility action available in the basic result view', async () => {
    api.loadLogSignal.mockResolvedValue(logEvidence(logPage('facet visibility evidence', 'not-a-trace-id')));
    renderPage('/explore?signal=logs&start=1000&end=2000');
    expect(await screen.findByRole('row', { name: /facet visibility evidence/u })).toBeInTheDocument();
    const before = locationParams();
    fireEvent.click(screen.getByRole('button', { name: i18n.t('explore.perses.hideFacets') }));
    expect(facetRail()).toHaveAttribute('hidden');
    expect(locationParams()).toEqual(before);
    expect(await screen.findByRole('button', { name: i18n.t('explore.perses.showFacets') })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: i18n.t('explore.perses.showFacets') }));
    expect(facetRail()).toBeVisible();
  });

  it('keeps an explicit Patterns URL visible and lets its owner return to Fields', async () => {
    api.loadLogSignal.mockResolvedValue(logEvidence(logPage('legacy pattern evidence', 'not-a-trace-id')));
    renderPage('/explore?signal=logs&logAggregation=patterns&start=1000&end=2000');
    expect(await screen.findByRole('button', { name: i18n.t('explore.logPatterns.mode') })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
    expect(
      screen.queryByRole('button', { name: i18n.t('explore.logTransactions.transactions') })
    ).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: i18n.t('explore.logTransactions.fields') }));
    fireEvent.click(querySubmitButton());
    await waitFor(() => expect(locationParams().logAggregation).toBe('fields'));
    expect(screen.queryByRole('region', { name: i18n.t('explore.logTransactions.groupInto') })).not.toBeInTheDocument();
  });

  it.each(['patterns', 'calculated'] as const)(
    'shows only one facet action while %s retains historical evidence during refresh',
    async aggregation => {
      const refresh = deferred(logEvidence(logPage('replacement evidence', 'not-a-trace-id')));
      api.loadLogSignal
        .mockResolvedValueOnce(logEvidence(logPage('retained evidence', 'not-a-trace-id')))
        .mockReturnValueOnce(refresh.promise);
      const calculated = encodeURIComponent(
        JSON.stringify({
          version: 1,
          name: 'attempt',
          kind: 'extract',
          source: 'body',
          before: 'attempt ',
          after: ' failed'
        })
      );
      renderPage(
        `/explore?signal=logs&logAggregation=${aggregation}&start=1000&end=2000${aggregation === 'calculated' ? `&logCalculated=${calculated}` : ''}`
      );
      const hide = await screen.findByRole('button', { name: i18n.t('explore.perses.hideFacets') });
      fireEvent.click(hide);
      expect(screen.getAllByRole('button', { name: i18n.t('explore.perses.showFacets') })).toHaveLength(1);
      fireEvent.click(screen.getByRole('button', { name: en.common.refresh }));
      expect(api.loadLogSignal).toHaveBeenCalledTimes(2);
      expect(await screen.findByText(i18n.t('explore.states.refreshing'))).toBeInTheDocument();
      expect(screen.getAllByRole('button', { name: i18n.t('explore.perses.showFacets') })).toHaveLength(1);
      fireEvent.click(screen.getByRole('button', { name: i18n.t('explore.perses.showFacets') }));
      expect(facetRail()).toBeVisible();
      refresh.resolve();
    }
  );

  it('keeps Show Facets available for an invalid applied log analysis', () => {
    const invalid = encodeURIComponent(
      JSON.stringify({
        version: 1,
        representation: 'logs',
        intervalMs: -1,
        limit: 20,
        order: 'count-desc',
        minCount: 1
      })
    );
    renderPage(`/explore?signal=logs&logAnalysis=${invalid}&start=1000&end=2000`);
    fireEvent.click(screen.getByRole('button', { name: i18n.t('explore.perses.hideFacets') }));
    expect(screen.getAllByRole('button', { name: i18n.t('explore.perses.showFacets') })).toHaveLength(1);
    fireEvent.click(screen.getByRole('button', { name: i18n.t('explore.perses.showFacets') }));
    expect(facetRail()).toBeVisible();
  });

  it('keeps column editing in Logs Options and submits history sorting from the column header', async () => {
    api.loadLogSignal.mockResolvedValue(logEvidence(logPage('options evidence', 'not-a-trace-id')));
    renderPage('/explore?signal=logs&start=1000&end=2000');
    expect(await screen.findByRole('row', { name: /options evidence/u })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: i18n.t('explore.logColumns.title') })).not.toBeInTheDocument();
    expect(screen.queryByRole('combobox', { name: i18n.t('explore.logColumns.sort') })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: i18n.t('explore.perses.options') }));
    expect(screen.getByRole('group', { name: i18n.t('explore.logColumns.title') })).toBeInTheDocument();
    expect(screen.queryByRole('combobox', { name: i18n.t('explore.logColumns.sort') })).not.toBeInTheDocument();
    const columns = screen.getByRole('group', { name: i18n.t('explore.logColumns.title') });
    expect(within(columns).getByRole('combobox', { name: i18n.t('explore.logColumns.addColumn') })).toBeInTheDocument();
    fireEvent.keyDown(columns, { key: 'Escape' });
    expect(screen.getByRole('button', { name: i18n.t('explore.perses.options') })).toHaveFocus();
    fireEvent.click(
      screen.getByRole('button', {
        name: i18n.t('explore.logSort.menu', { field: i18n.t('explore.logColumns.fields.time') })
      })
    );
    fireEvent.click(await screen.findByRole('menuitem', { name: i18n.t('explore.logColumns.oldest') }));
    await waitFor(() => expect(locationParams()).toMatchObject({ start: '1000', end: '2000', sort: 'oldest' }));
    await waitFor(() =>
      expect(api.loadLogSignal).toHaveBeenLastCalledWith(
        expect.objectContaining({ start: 1000, end: 2000, sort: 'oldest' }),
        expect.any(AbortSignal)
      )
    );
    expect(screen.getByRole('columnheader', { name: i18n.t('explore.logColumns.fields.time') })).toHaveAttribute(
      'aria-sort',
      'ascending'
    );
  });

  it.each(['metrics', 'traces'] as const)('keeps the Logs flat-stack contract scoped away from %s', signal => {
    renderPage(`/explore?signal=${signal}`);
    const panel = screen.getByRole('region', { name: en.explore.signals[signal] });
    expect(panel.querySelector('[data-explore-log-region]')).toBeNull();
  });

  it('labels retained log evidence during refresh and disables stale drilldowns until replacement succeeds', async () => {
    const refresh = deferred(logEvidence(logPage('fresh evidence', 'fedcba9876543210fedcba9876543210')));
    api.loadLogSignal
      .mockResolvedValueOnce(logEvidence(logPage('cached evidence', '0123456789abcdef0123456789abcdef')))
      .mockReturnValueOnce(refresh.promise);
    renderPage('/explore?signal=logs');
    const cachedRow = await screen.findByRole('row', { name: /cached evidence/u });
    fireEvent.click(cachedRow);
    expect(screen.getByRole('button', { name: i18n.t('explore.perses.openTraceAction') })).toBeEnabled();

    fireEvent.click(screen.getByRole('button', { name: en.common.refresh }));

    expect(await screen.findByText(i18n.t('explore.states.refreshing'))).toBeInTheDocument();
    const retained = screen.getByRole('dialog', { name: i18n.t('explore.perses.logInspector') });
    expect(retained).toHaveTextContent('cached evidence');
    await expectRetainedInspectorNonActionable(retained);
    fireEvent.click(cachedRow);
    expect(screen.getByRole('dialog', { name: i18n.t('explore.perses.logInspector') })).toBe(retained);
    expect(screen.getAllByText(/cached evidence/u).length).toBeGreaterThan(0);

    refresh.resolve();
    await waitFor(() => expect(screen.queryByText(i18n.t('explore.states.refreshing'))).not.toBeInTheDocument());
    const freshRow = await screen.findByRole('row', { name: /fresh evidence/u });
    expect(screen.queryByRole('dialog', { name: i18n.t('explore.perses.logInspector') })).not.toBeInTheDocument();
    fireEvent.click(freshRow);
    const fresh = screen.getByRole('dialog', { name: i18n.t('explore.perses.logInspector') });
    expect(fresh).toHaveFocus();
    expect(fresh).toHaveTextContent('fresh evidence');
    expect(fresh).not.toHaveTextContent('cached evidence');
    const trace = within(fresh).getByRole('button', { name: i18n.t('explore.perses.openTraceAction') });
    expect(trace).toBeEnabled();
    fireEvent.click(trace);
    await waitFor(() => expect(locationParams().traceId).toBe('fedcba9876543210fedcba9876543210'));
  });

  it('keeps refresh failure classification visible while retained evidence remains non-actionable', async () => {
    api.loadLogSignal
      .mockResolvedValueOnce(logEvidence(logPage('cached evidence', '0123456789abcdef0123456789abcdef')))
      .mockRejectedValueOnce(new ApiMessageError('offline', { status: 503 }));
    renderPage('/explore?signal=logs');
    const cachedRow = await screen.findByRole('row', { name: /cached evidence/u });
    fireEvent.click(cachedRow);

    fireEvent.click(screen.getByRole('button', { name: en.common.refresh }));

    expect(await screen.findByText(/Refresh failed/u)).toHaveTextContent(i18n.t('explore.states.transportError'));
    const retained = screen.getByRole('dialog', { name: i18n.t('explore.perses.logInspector') });
    expect(retained).toHaveTextContent('cached evidence');
    await expectRetainedInspectorNonActionable(retained);
    expect(screen.getByTestId('investigation-target')).toHaveTextContent('none');
    const close = within(retained).getByRole('button', { name: i18n.t('explore.perses.closeInspector') });
    close.focus();
    expect(close).toHaveFocus();
    fireEvent.keyDown(close, { key: 'Escape' });
    await waitFor(() => expect(cachedRow).toHaveFocus());
    expect(screen.queryByRole('dialog', { name: i18n.t('explore.perses.logInspector') })).not.toBeInTheDocument();
    fireEvent.click(cachedRow);
    expect(screen.queryByRole('dialog', { name: i18n.t('explore.perses.logInspector') })).not.toBeInTheDocument();
  });

  it('publishes only the current non-empty exact Log page as an investigation target', async () => {
    api.loadLogSignal.mockResolvedValue(logEvidence(logPage('ready evidence', '0123456789abcdef0123456789abcdef')));
    renderPage(
      '/explore?signal=logs&start=1000&end=2000&serviceName=checkout' +
        '&traceId=0123456789abcdef0123456789abcdef' +
        '&severityText=warn&hideNoise=true'
    );

    const readyRow = await screen.findByRole('row', { name: /ready evidence/u });
    await waitFor(() => expect(screen.getByTestId('investigation-target')).not.toHaveTextContent('none'));
    expect(JSON.parse(screen.getByTestId('investigation-target').textContent ?? '')).toEqual({
      log: {
        start: 1_000,
        end: 2_000,
        traceId: '0123456789abcdef0123456789abcdef',
        severityText: 'WARN',
        serviceName: 'checkout',
        hideInternal: false,
        hideNoise: true,
        pageIndex: 0,
        pageSize: 20
      }
    });

    fireEvent.click(readyRow);
    fireEvent.click(screen.getByRole('button', { name: i18n.t('explore.perses.investigateLogAction') }));
    await waitFor(() =>
      expect(locationParams()).toMatchObject({
        signal: 'logs',
        logRecordUid: 'log-ready-evidence',
        start: '1000',
        end: '2000'
      })
    );
  });

  it('submits an inspected field with unfinished search text and existing conditions', async () => {
    const page = logPage('inspectable evidence', '0123456789abcdef0123456789abcdef');
    page.content[0]!.resource = { 'deployment.environment.name': 'prod' };
    api.loadLogSignal.mockResolvedValue(logEvidence(page));
    renderPage(
      '/explore?signal=logs&start=1000&end=2000&resourceFilter=service.version%3D2&attributeFilter=http.route%3Dpay'
    );
    const row = await screen.findByRole('row', { name: /inspectable evidence/u });
    setLogSearchText(
      screen.getByRole('combobox', { name: i18n.t('explore.queryLabels.logs') }),
      'unfinished investigation'
    );
    fireEvent.click(row);
    fireEvent.click(
      screen.getByRole('button', {
        name: i18n.t('explore.logFieldMenu.actions', { field: 'resource["deployment.environment.name"]' })
      })
    );
    fireEvent.click(
      await screen.findByRole('menuitem', {
        name: i18n.t('explore.perses.includeField', { field: 'resource.deployment.environment.name' })
      })
    );
    await waitFor(() =>
      expect(locationParams()).toMatchObject({
        start: '1000',
        end: '2000',
        attributeFilter: 'http.route=pay',
        resourceFilter: 'service.version=2',
        environment: 'prod',
        query: 'unfinished investigation'
      })
    );
    expect(logSearchText(screen.getByRole('combobox', { name: i18n.t('explore.queryLabels.logs') }))).toBe(
      'unfinished investigation'
    );
    await waitFor(() =>
      expect(api.loadLogSignal).toHaveBeenLastCalledWith(
        expect.objectContaining({
          start: 1000,
          end: 2000,
          environment: 'prod',
          query: 'unfinished investigation',
          resourceFilter: 'service.version=2',
          attributeFilter: 'http.route=pay'
        }),
        expect.any(AbortSignal)
      )
    );
  });

  it.each(['group', 'graph'] as const)(
    'runs inspected field %s analysis with the current draft and scope',
    async intent => {
      const page = logPage('analysis pivot evidence', '0123456789abcdef0123456789abcdef');
      page.content[0]!.attributes = { 'proof.value': 4 };
      api.loadLogSignal.mockResolvedValue(logEvidence(page));
      renderPage('/explore?signal=logs&start=1000&end=2000&serviceName=checkout&resourceFilter=service.version%3D2');
      const row = await screen.findByRole('row', { name: /analysis pivot evidence/u });
      setLogSearchText(
        screen.getByRole('combobox', { name: i18n.t('explore.queryLabels.logs') }),
        'pending investigation'
      );
      fireEvent.click(row);
      fireEvent.click(
        screen.getByRole('button', {
          name: i18n.t('explore.logFieldMenu.actions', { field: '@proof.value' })
        })
      );
      fireEvent.click(
        await screen.findByRole('menuitem', {
          name: i18n.t(intent === 'group' ? 'explore.logFieldMenu.groupBy' : 'explore.logFieldMenu.graph', {
            field: '@proof.value'
          })
        })
      );
      await waitFor(() =>
        expect(screen.queryByRole('dialog', { name: i18n.t('explore.perses.logInspector') })).not.toBeInTheDocument()
      );
      await waitFor(() => expect(locationParams()).toHaveProperty('logAnalysis'));
      expect(locationParams()).toMatchObject({
        start: '1000',
        end: '2000',
        serviceName: 'checkout',
        resourceFilter: 'service.version=2',
        query: 'pending investigation'
      });
      const analysis = JSON.parse(locationParams().logAnalysis!);
      expect(analysis.representation).toBe('timeseries');
      if (intent === 'group') expect(analysis.field).toBe('attribute:proof.value');
      else expect(analysis.measure).toEqual({ function: 'avg', field: 'attribute:proof.value' });
      await waitFor(() =>
        expect(api.loadLogSignal).toHaveBeenLastCalledWith(
          expect.objectContaining({
            start: 1000,
            end: 2000,
            serviceName: 'checkout',
            resourceFilter: 'service.version=2',
            query: 'pending investigation'
          }),
          expect.any(AbortSignal)
        )
      );
    }
  );

  it.each(['group', 'graph'] as const)(
    'keeps the applied query and inspected result when %s sees an unclosed draft quote',
    async intent => {
      const page = logPage('analysis pivot evidence', '0123456789abcdef0123456789abcdef');
      page.content[0]!.attributes = { endpoint: '/models' };
      api.loadLogSignal.mockResolvedValue(logEvidence(page));
      renderPage('/explore?signal=logs&start=1000&end=2000&query=applied&searchSyntax=structured-v1');
      fireEvent.click(await screen.findByRole('row', { name: /analysis pivot evidence/u }));
      setLogSearchText(screen.getByRole('combobox', { name: i18n.t('explore.queryLabels.logs') }), '@endpoint:"');
      fireEvent.click(
        screen.getByRole('button', {
          name: i18n.t('explore.logFieldMenu.actions', { field: '@endpoint' })
        })
      );
      fireEvent.click(
        await screen.findByRole('menuitem', {
          name: i18n.t(intent === 'group' ? 'explore.logFieldMenu.groupBy' : 'explore.logFieldMenu.graph', {
            field: '@endpoint'
          })
        })
      );
      expect(locationParams()).toMatchObject({ query: 'applied', searchSyntax: 'structured-v1' });
      expect(locationParams()).not.toHaveProperty('logAnalysis');
      expect(screen.getByRole('dialog', { name: i18n.t('explore.perses.logInspector') })).toBeVisible();
      expect(screen.getByRole('row', { name: /analysis pivot evidence/u })).toBeVisible();
      expect(api.loadLogSignal).toHaveBeenCalledTimes(1);
      expect(logSearchText(screen.getByRole('combobox', { name: i18n.t('explore.queryLabels.logs') }))).toBe(
        '@endpoint:"'
      );
      expect(
        screen.getByRole('button', { name: i18n.t('explore.logFieldMenu.actions', { field: '@endpoint' }) })
      ).toHaveAttribute('aria-expanded', 'true');
      expect(screen.getByRole('menu')).toBeInTheDocument();
      expect(
        within(document.querySelector('[data-explore-logs-region="search"]') as HTMLElement).getByText(
          i18n.t('explore.logAuthoring.syntaxIssue.unclosed_quote')
        )
      ).toBeVisible();
    }
  );

  it('keeps a saved numeric range visible and lets it be cleared without losing scope', async () => {
    api.loadLogSignal.mockResolvedValue(
      logEvidence(logPage('numeric range evidence', '0123456789abcdef0123456789abcdef'))
    );
    const range = JSON.stringify({ version: 1, field: 'attribute:duration', min: 2, max: 6 });
    renderPage(
      '/explore?signal=logs&start=1000&end=2000&serviceName=checkout&logNumericRange=' + encodeURIComponent(range)
    );
    await screen.findByRole('row', { name: /numeric range evidence/u });
    const label = `${i18n.t('explore.logNumericRange.title')}: attribute:duration [2, 6]`;
    expect(screen.getByText(label)).toBeVisible();
    expect(screen.queryByRole('button', { name: i18n.t('explore.logNumericRange.apply') })).not.toBeInTheDocument();
    expect(locationParams().logNumericRange).toBe(range);
    expect(api.loadLogSignal).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole('button', { name: i18n.t('explore.removeAppliedFilter', { filter: label }) }));
    fireEvent.click(screen.getByRole('button', { name: i18n.t('common.query') }));
    await waitFor(() => expect(locationParams()).not.toHaveProperty('logNumericRange'));
    expect(locationParams()).toMatchObject({ start: '1000', end: '2000', serviceName: 'checkout' });
  });

  it('keeps committed service scope locked in inspected field actions', async () => {
    const page = logPage('scoped evidence', '0123456789abcdef0123456789abcdef');
    page.content[0]!.resource = { 'service.name': 'checkout' };
    api.loadLogSignal.mockResolvedValue(logEvidence(page));
    renderPage('/explore?signal=logs&start=1000&end=2000&serviceName=checkout');
    fireEvent.click(await screen.findByRole('row', { name: /scoped evidence/u }));
    fireEvent.click(
      screen.getByRole('button', {
        name: i18n.t('explore.logFieldMenu.actions', { field: 'resource["service.name"]' })
      })
    );
    const menu = await screen.findByRole('menu');
    const exclude = within(menu)
      .getAllByRole('menuitem')
      .find(item =>
        item.textContent?.startsWith(i18n.t('explore.perses.excludeField', { field: 'resource.service.name' }))
      )!;
    expect(exclude).toHaveAttribute('aria-disabled', 'true');
    expect(exclude).toHaveTextContent(i18n.t('explore.perses.scopeLockedFilter'));
    fireEvent.click(exclude);
    expect(locationParams()).toMatchObject({ serviceName: 'checkout', start: '1000', end: '2000' });
    expect(locationParams()).not.toHaveProperty('resourceFilter');
    expect(api.loadLogSignal).toHaveBeenCalledTimes(1);
  });

  it('keeps the exclusion operator when filtering the same inspected field twice', async () => {
    const page = logPage('endpoint evidence', '0123456789abcdef0123456789abcdef');
    page.content[0]!.attributes = { endpoint: '/models' };
    api.loadLogSignal.mockResolvedValue(logEvidence(page));
    renderPage(
      '/explore?signal=logs&start=1000&end=2000&searchSyntax=structured-v1&query=%40event.name%3Acodex.api_request'
    );

    const selectEndpoint = async () => {
      fireEvent.click(await screen.findByRole('row', { name: /endpoint evidence/u }));
      fireEvent.click(
        screen.getByRole('button', {
          name: i18n.t('explore.logFieldMenu.actions', { field: '@endpoint' })
        })
      );
      return screen.findByRole('menu');
    };

    fireEvent.click(
      within(await selectEndpoint()).getByRole('menuitem', {
        name: i18n.t('explore.perses.includeField', { field: '@endpoint' })
      })
    );
    await waitFor(() => expect(locationParams().query).toBe('(@event.name:codex.api_request) AND @endpoint:"/models"'));
    await waitFor(() =>
      expect(api.loadLogSignal).toHaveBeenLastCalledWith(
        expect.objectContaining({
          start: 1000,
          end: 2000,
          searchSyntax: 'structured-v1',
          query: '(@event.name:codex.api_request) AND @endpoint:"/models"'
        }),
        expect.any(AbortSignal)
      )
    );

    fireEvent.click(
      within(await selectEndpoint()).getByRole('menuitem', {
        name: i18n.t('explore.perses.excludeField', { field: '@endpoint' })
      })
    );
    await waitFor(() =>
      expect(locationParams().query).toBe(
        '((@event.name:codex.api_request) AND @endpoint:"/models") AND -@endpoint:"/models"'
      )
    );
    await waitFor(() =>
      expect(api.loadLogSignal).toHaveBeenLastCalledWith(
        expect.objectContaining({
          start: 1000,
          end: 2000,
          searchSyntax: 'structured-v1',
          query: '((@event.name:codex.api_request) AND @endpoint:"/models") AND -@endpoint:"/models"'
        }),
        expect.any(AbortSignal)
      )
    );
  });

  it('does not discard pending unified search when inspecting a log field', async () => {
    const page = logPage('inspectable evidence', '0123456789abcdef0123456789abcdef');
    page.content[0]!.resource = { 'service.name': 'checkout' };
    api.loadLogSignal.mockResolvedValue(logEvidence(page));
    renderPage('/explore?signal=logs&start=1000&end=2000');
    const row = await screen.findByRole('row', { name: /inspectable evidence/u });
    const input = screen.getByRole('combobox', { name: i18n.t('explore.queryLabels.logs') });
    setLogSearchText(input, 'pending search');
    fireEvent.click(row);
    expect(
      screen.queryByRole('button', { name: i18n.t('explore.perses.includeField', { field: 'service.name' }) })
    ).not.toBeInTheDocument();
    expect(api.loadLogSignal).toHaveBeenCalledTimes(1);
    expect(logSearchText(input)).toBe('pending search');
    expect(locationParams()).not.toHaveProperty('query');
    expect(locationParams()).not.toHaveProperty('resourceFilter');
  });

  it('bounds Log row summaries and keeps unavailable Inspector actions inert', async () => {
    const longBody = 'x'.repeat(300);
    const page = logPage(longBody, 'not-a-trace-id');
    page.content.push({ ...page.content[0]!, logRecordUid: null, traceId: null, body: 'no actions' });
    page.totalElements = 2;
    api.loadLogSignal.mockResolvedValueOnce(logEvidence(page));

    renderPage('/explore?signal=logs');

    await screen.findByRole('row', { name: /no actions/u });
    const rows = screen.getAllByRole('row').filter(row => row.hasAttribute('data-log-index'));
    expect(rows[0]?.getAttribute('aria-label')?.length).toBeLessThan(140);
    fireEvent.click(rows[1]!);
    expect(screen.getByRole('button', { name: i18n.t('explore.perses.investigateLogAction') })).toBeDisabled();
    expect(screen.getByRole('button', { name: i18n.t('explore.perses.openTraceAction') })).toBeDisabled();
    expect(document.querySelector('[data-perses-host-interactions]')).toBeNull();
  });

  it.each([true, false])('retains historical result nodes through focused detail (fixed window: %s)', async fixed => {
    api.loadTraceSignal.mockResolvedValueOnce({
      content: [traceRow(fixed ? 1200 : Date.now() - 1000)],
      totalElements: 1,
      totalPages: 1,
      number: 0,
      size: 20
    });
    renderPage(
      '/explore?signal=traces&serviceName=checkout&serviceNamespace=commerce&environment=prod' +
        '&intakeProfileId=collector%3Aeast&collectorId=east&instance=checkout-1&endpoint=%2Fcheckout' +
        (fixed ? '&start=1000&end=2000' : '&windowMode=preset')
    );

    const link = await screen.findByRole('link', { name: /Investigate checkout: POST \/checkout/u });
    expect(screen.getByRole('grid').closest('[data-result-layout="fill"]')).not.toBeNull();
    expect(screen.getByRole('grid').parentElement).not.toHaveClass('MuiDataGrid-autoHeight');
    expect(link).toHaveAttribute('href', expect.stringContaining('returnTo='));
    const retainedGrid = screen.getByRole('grid');
    fireEvent.click(link);

    await waitFor(() =>
      expect(locationParams()).toMatchObject({
        signal: 'traces',
        traceId: '0123456789abcdef0123456789abcdef',
        spanId: '0123456789abcdef',
        start: fixed ? '1000' : expect.any(String),
        end: fixed ? '2000' : expect.any(String),
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
      })
    );
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    expect(retainedGrid).toBeInTheDocument();
    expect(api.loadTraceSignal).toHaveBeenCalledOnce();
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Close' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(screen.getByRole('grid')).toBe(retainedGrid);
    expect(locationParams().traceId).toBeUndefined();
  });

  it.each([
    [undefined, 'unknown'],
    [{ sort: 'newest', coverage: 'window', rowLimit: null, truncated: false }, 'window'],
    [{ sort: 'newest', coverage: 'bounded', rowLimit: 1500, truncated: true }, 'truncated'],
    [{ sort: 'newest', coverage: 'bounded', rowLimit: 1500, truncated: null }, 'boundedUnknown']
  ] as const)(
    'shows server query coverage without inferring completeness from pagination: %s',
    async (query, message) => {
      api.loadTraceSignal.mockResolvedValueOnce({
        content: [],
        totalElements: 0,
        totalPages: 0,
        number: 0,
        size: 20,
        query
      });
      renderPage('/explore?signal=traces&start=1000&end=2000');
      expect(
        await screen.findByText(i18n.t(`exploreTrace.coverage.${message}`, { count: query?.rowLimit ?? undefined }))
      ).toBeInTheDocument();
    }
  );

  it('recovers an out-of-range server page through the native controlled pagination', async () => {
    api.loadTraceSignal
      .mockResolvedValueOnce({ content: [], totalElements: 21, totalPages: 2, number: 2, size: 20 })
      .mockResolvedValueOnce({ content: [traceRow()], totalElements: 21, totalPages: 2, number: 1, size: 20 });
    renderPage('/explore?signal=traces&timeRange=last-30m&page=2&serviceName=checkout&start=1000&end=2000');
    await waitFor(() => expect(locationParams().page).toBe('1'));
    expect(await screen.findByText('21–21 of 21')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /previous page/iu })).toBeEnabled();
    expect(locationParams()).toMatchObject({ serviceName: 'checkout', start: '1000', end: '2000' });
    expect(api.loadTraceSignal).toHaveBeenCalledTimes(2);
  });

  it('keeps an initial zero-total trace result empty without a misleading native footer', async () => {
    api.loadTraceSignal.mockResolvedValueOnce({ content: [], totalElements: 0, totalPages: 0, number: 0, size: 20 });
    renderPage('/explore?signal=traces');
    expect(await screen.findByText(i18n.t('explore.empty.traces'))).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /next page/iu })).not.toBeInTheDocument();
  });

  it('uses one native server pagination control and preserves URL scope while stale pages are inert', async () => {
    const content = Array.from({ length: 20 }, (_, index) => ({
      ...traceRow(),
      traceId: (index + 1).toString(16).padStart(32, '0')
    }));
    api.loadTraceSignal
      .mockResolvedValueOnce({ content, totalElements: 21, totalPages: 2, number: 0, size: 20 })
      .mockResolvedValueOnce({
        content: [{ ...traceRow(), traceId: '22222222222222222222222222222222' }],
        totalElements: 21,
        totalPages: 2,
        number: 1,
        size: 20
      });
    renderPage('/explore?signal=traces&serviceName=checkout&start=1000&end=2000');
    expect(await screen.findByText('1–20 of 21')).toBeInTheDocument();
    expect(screen.queryByRole('navigation', { name: i18n.t('explore.perses.pagination') })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /next page/iu }));
    expect(await screen.findByText('21–21 of 21')).toBeInTheDocument();
    expect(locationParams()).toMatchObject({ page: '1', serviceName: 'checkout', start: '1000', end: '2000' });
    fireEvent.click(screen.getByRole('button', { name: en.common.refresh }));
    await waitFor(() => expect(screen.getByRole('button', { name: /previous page/iu })).toBeDisabled());
    fireEvent.click(screen.getByRole('button', { name: /previous page/iu }));
    expect(locationParams().page).toBe('1');
  });
});

function traceRow(start = 1200) {
  return {
    rootState: 'unique',
    rootSpanCount: 1,
    representativeSpan: {
      spanId: '0123456789abcdef',
      spanName: 'POST /checkout',
      serviceName: 'checkout',
      serviceNamespace: 'commerce',
      startTime: start,
      durationNanos: 1_000_000
    },
    observedStartTime: start,
    observedEndTime: start + Math.ceil(1_000_000 / 1_000_000),
    unattributedServiceStats: null,
    traceId: '0123456789abcdef0123456789abcdef',
    rootSpanId: '0123456789abcdef',
    serviceName: 'checkout',
    serviceNamespace: 'commerce',
    rootSpanName: 'POST /checkout',
    durationNanos: 1_000_000,
    status: 'OK',
    startTime: start,
    errorSpanCount: 0,
    resourceAttributes: {},
    spanCount: 1,
    serviceStats: { checkout: { spanCount: 1, errorCount: 0 } }
  };
}

function logPage(body: string, traceId: string): ExplorePageResult<LogRow> {
  return {
    content: [
      {
        logRecordUid: `log-${body.replace(/\s+/gu, '-')}`,
        timeUnixNano: '1750000000000000000',
        observedTimeUnixNano: null,
        severityNumber: null,
        severityText: 'INFO',
        body,
        attributes: null,
        droppedAttributesCount: null,
        traceId,
        spanId: null,
        traceFlags: null,
        resource: null,
        resourceSchemaUrl: null,
        instrumentationScope: null,
        scopeSchemaUrl: null
      }
    ],
    totalElements: 1,
    totalPages: 1,
    number: 0,
    size: 20
  };
}

function logEvidence(page: ExplorePageResult<LogRow>) {
  return {
    page,
    overview: {
      kind: 'ready' as const,
      data: {
        totalCount: page.totalElements,
        traceCount: 0,
        debugCount: 0,
        infoCount: page.totalElements,
        warnCount: 0,
        errorCount: 0,
        fatalCount: 0
      }
    },
    trend: {
      kind: 'ready' as const,
      data: { start: 1_754_467_200_000, end: 1_754_469_000_000, intervalMs: 60_000, buckets: [] }
    }
  };
}

function deferred<T>(value: T) {
  let resolvePromise!: (value: T) => void;
  const promise = new Promise<T>(resolve => {
    resolvePromise = resolve;
  });
  return { promise, resolve: () => resolvePromise(value) };
}

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

function renderPage(initialEntry: string, authenticated = false) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } }
  });
  return render(
    <I18nextProvider i18n={i18n}>
      <QueryClientProvider client={client}>
        <MemoryRouter initialEntries={[initialEntry]}>
          <GlobalTimeProvider>
            <RouteTimeProvider policy="route_owned" canonicalizeInvalidExact={false}>
              <RuntimeThemeContext.Provider value={{ theme: 'default', setTheme: vi.fn() }}>
                <SessionContext.Provider
                  value={{
                    loading: !authenticated,
                    retry: vi.fn(),
                    session: authenticated
                      ? {
                          authenticated: true,
                          username: 'operator',
                          workspaceId: 'default',
                          roles: ['ADMIN'],
                          expiresAt: null
                        }
                      : undefined
                  }}
                >
                  <App>
                    <ShellInvestigationProvider>
                      <ExplorePage />
                      <LocationProbe />
                      <InvestigationProbe />
                    </ShellInvestigationProvider>
                  </App>
                </SessionContext.Provider>
              </RuntimeThemeContext.Provider>
            </RouteTimeProvider>
          </GlobalTimeProvider>
        </MemoryRouter>
      </QueryClientProvider>
    </I18nextProvider>
  );
}

function InvestigationProbe() {
  const investigation = useShellInvestigation();
  return <output data-testid="investigation-target">{investigation ? JSON.stringify(investigation) : 'none'}</output>;
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

function facetRail() {
  const rail = document.querySelector(
    `[data-explore-logs-region="body"] [aria-label="${i18n.t('explore.addFilters')}"]`
  );
  if (!(rail instanceof HTMLElement)) throw new Error('Logs facet rail is missing');
  return rail;
}

async function selectOption(combobox: HTMLElement, label: string) {
  fireEvent.mouseDown(combobox);
  const options = await screen.findAllByText(label);
  const option = options.at(-1);
  if (!option) throw new Error(`Select option is missing: ${label}`);
  fireEvent.click(option);
}

class ResizeObserverStub {
  constructor(private readonly callback: ResizeObserverCallback) {}
  observe(target: Element) {
    this.callback(
      [{ target, contentRect: { width: 800, height: 360 } as DOMRectReadOnly } as ResizeObserverEntry],
      this
    );
  }
  unobserve() {}
  disconnect() {}
}

async function expectRetainedInspectorNonActionable(inspector: HTMLElement) {
  expect(inspector).toHaveAttribute('aria-busy', 'true');
  expect(within(inspector).getByText(i18n.t('explore.perses.traceActionStale'))).toBeVisible();
  const before = locationParams();
  for (const key of ['copyLog', 'investigateLogAction', 'openTraceAction', 'previousLog', 'nextLog'] as const) {
    const action = within(inspector).getByRole('button', { name: i18n.t(`explore.perses.${key}`) });
    expect(action).toBeDisabled();
    fireEvent.click(action);
  }
  fireEvent.keyDown(inspector, { key: 'ArrowDown' });
  expect(locationParams()).toEqual(before);
  expect(screen.getByTestId('investigation-target')).toHaveTextContent('none');
  fireEvent.click(
    within(inspector).getByRole('button', {
      name: `Field actions: ${i18n.t('explore.logFacets.builtin.severityCategory')}`
    })
  );
  const menu = await screen.findByRole('menu');
  // Analysis may be withheld entirely or shown with an explicit unavailable reason.
  for (const action of within(menu).queryAllByRole('menuitem', { name: /^(Graph |Group by )/u })) {
    expect(action).toHaveAttribute('aria-disabled', 'true');
    fireEvent.click(action);
  }
  expect(within(menu).queryByRole('menuitem', { name: /Include|Exclude/u })).not.toBeInTheDocument();
  expect(
    within(menu).queryByRole('menuitem', { name: i18n.t('explore.logFieldMenu.calculateField') })
  ).not.toBeInTheDocument();
  expect(locationParams()).toEqual(before);
  // Dismiss the field popup without closing the retained inspector.
  fireEvent.click(
    within(inspector).getByRole('button', {
      name: `Field actions: ${i18n.t('explore.logFacets.builtin.severityCategory')}`
    })
  );
}
