/* Licensed to the Apache Software Foundation (ASF) under one or more contributor license agreements. See NOTICE. */
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeAll, expect, it, vi } from 'vitest';
import { i18n, initializeI18n, loadLocale } from '@/core/i18n/i18n';
import { ExploreMetricCatalog } from './explore-metric-catalog';
import { ExploreActiveFilters } from './explore-active-filters';
import { ExploreWorkflowGuide } from './explore-workflow-guide';
import { DEFAULT_TRACE_VIEW, encodeTraceView } from '../model/explore-trace-view';
import type { MetricInventoryViewModel } from '../model/explore-metric-inventory';
beforeAll(async () => {
  await initializeI18n();
  await loadLocale('en-US');
});
afterEach(cleanup);
it('clears only a failed catalog search without selecting or executing a metric', () => {
  const setSearch = vi.fn(),
    select = vi.fn();
  const model: MetricInventoryViewModel = {
    search: 'unmatched',
    state: 'ready',
    data: undefined,
    retry: vi.fn(),
    setSearch
  };
  render(<ExploreMetricCatalog model={model} draftMetric="" committedMetric={undefined} select={select} t={i18n.t} />);
  expect(screen.getAllByText(i18n.t('explore.novice.catalogNoMatch'))).not.toHaveLength(0);
  fireEvent.click(screen.getByRole('button', { name: i18n.t('explore.novice.clearSearch') }));
  expect(setSearch).toHaveBeenCalledExactlyOnceWith('');
  expect(select).not.toHaveBeenCalled();
});
it('shows source-backed identity and temporality for the selected metric without claiming a sample unit', () => {
  const model: MetricInventoryViewModel = {
    search: '',
    state: 'ready',
    retry: vi.fn(),
    setSearch: vi.fn(),
    data: {
      context: null,
      source: 'greptime-inventory',
      limit: 100,
      truncated: false,
      items: [
        {
          metricName: 'requests_total',
          family: 'throughput',
          metadata: {
            state: 'available',
            source: 'opentelemetry',
            quality: 'declared',
            originalName: 'requests',
            declaredType: 'counter',
            declaredUnit: '1',
            temporality: 'cumulative',
            description: null,
            sampleRole: 'unknown',
            sampleUnit: null
          }
        }
      ]
    }
  };
  render(
    <ExploreMetricCatalog
      model={model}
      draftMetric="requests_total"
      committedMetric="requests_total"
      select={vi.fn()}
      t={i18n.t}
    />
  );
  fireEvent.click(screen.getByText(i18n.t('explore.metricComposition.metricInfo')));
  expect(screen.getByText('opentelemetry')).toBeInTheDocument();
  expect(screen.getByText('requests')).toBeInTheDocument();
  expect(screen.getByText('cumulative')).toBeInTheDocument();
  expect(screen.getByText(i18n.t('explore.metricComposition.metadataIntervalUnavailable'))).toBeInTheDocument();
  expect(screen.getByText(/not sample units/u)).toBeInTheDocument();
});
it('marks unavailable catalog metadata explicitly instead of showing invented values', () => {
  const model: MetricInventoryViewModel = {
    search: '',
    state: 'ready',
    retry: vi.fn(),
    setSearch: vi.fn(),
    data: {
      context: null,
      source: 'greptime-inventory',
      limit: 100,
      truncated: false,
      items: [
        {
          metricName: 'unknown_metric',
          family: null,
          metadata: {
            state: 'unavailable',
            source: null,
            quality: null,
            originalName: null,
            declaredType: null,
            declaredUnit: null,
            temporality: null,
            description: null,
            sampleRole: 'unknown',
            sampleUnit: null
          }
        }
      ]
    }
  };
  render(
    <ExploreMetricCatalog
      model={model}
      draftMetric="unknown_metric"
      committedMetric={undefined}
      select={vi.fn()}
      t={i18n.t}
    />
  );
  fireEvent.click(screen.getByText(i18n.t('explore.metricComposition.metricInfo')));
  expect(screen.getByText(i18n.t('explore.metricComposition.metadataUnavailable'))).toBeInTheDocument();
});
it.each(['matched_spans', 'matched_traces'] as const)(
  'names the applied error population %s and preserves removal',
  population => {
    const removeFilter = vi.fn(() => true);
    render(
      <ExploreActiveFilters
        query={{
          signal: 'traces',
          timeRange: 'last-30m',
          errorOnly: true,
          traceView: encodeTraceView({ ...DEFAULT_TRACE_VIEW, population })
        }}
        t={i18n.t}
        updateQuery={vi.fn()}
        removeFilter={removeFilter}
      />
    );
    const label = i18n.t(
      population === 'matched_spans' ? 'exploreTrace.errorSpansOnly' : 'exploreTrace.errorTracesOnly'
    );
    expect(screen.getByText(label)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: i18n.t('explore.removeAppliedFilter', { filter: label }) }));
    expect(removeFilter).toHaveBeenCalledExactlyOnceWith('errorOnly');
  }
);
it.each(['metrics', 'logs', 'traces'] as const)(
  'includes signal-specific interpretation in the existing %s guide',
  signal => {
    render(<ExploreWorkflowGuide query={{ signal, timeRange: 'last-30m' }} t={i18n.t} />);
    fireEvent.click(screen.getByText(i18n.t('explore.workflowGuide.summary')));
    expect(screen.getByText(i18n.t(`explore.novice.${signal}.meaning`))).toBeInTheDocument();
  }
);
it.each(['loading', 'permission', 'error'] as const)('does not mislabel %s as an empty catalog search', state => {
  const model: MetricInventoryViewModel = {
    search: 'unmatched',
    state,
    data: undefined,
    retry: vi.fn(),
    setSearch: vi.fn()
  };
  render(<ExploreMetricCatalog model={model} draftMetric="" committedMetric={undefined} select={vi.fn()} t={i18n.t} />);
  expect(screen.queryByRole('button', { name: i18n.t('explore.novice.clearSearch') })).not.toBeInTheDocument();
});
it.each(['en-US', 'zh-CN', 'zh-TW', 'ja-JP', 'pt-BR'] as const)(
  'loads novice and recovery guidance in %s',
  async locale => {
    await loadLocale(locale);
    for (const key of ['catalogNoMatch', 'clearSearch', 'metrics.meaning', 'logs.meaning', 'traces.meaning'])
      expect(i18n.exists(`explore.novice.${key}`, { lng: locale })).toBe(true);
    for (const key of ['metrics', 'logs', 'traces', 'reviewQuery'])
      expect(i18n.exists(`explore.recovery.${key}`, { lng: locale })).toBe(true);
    for (const key of [
      'metadataSource',
      'metadataOriginalName',
      'metadataTemporality',
      'metadataInterval',
      'metadataIntervalUnavailable',
      'metadataUnavailable'
    ])
      expect(i18n.exists(`explore.metricComposition.${key}`, { lng: locale })).toBe(true);
    await loadLocale('en-US');
  }
);
