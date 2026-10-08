/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeAll, expect, it, vi } from 'vitest';
import { i18n, initializeI18n, loadLocale } from '@/core/i18n/i18n';
import en from '@/assets/i18n/en-us.json';
import zh from '@/assets/i18n/zh-cn.json';
import tw from '@/assets/i18n/zh-tw.json';
import ja from '@/assets/i18n/ja-jp.json';
import pt from '@/assets/i18n/pt-br.json';
import { draftFromQuery } from '../model/explore-submission-model';
import { ExploreAdvancedFilters, ExploreGuidedFilters } from './explore-advanced-filters';

const t = i18n.t;
beforeAll(async () => {
  await initializeI18n();
  await loadLocale('en-US');
});
const draft = draftFromQuery({ signal: 'metrics', metricPlan: '', timeRange: 'last-30m', query: 'cpu' });
afterEach(cleanup);

it('shows aggregation, grouping and temporal controls beside scope without changing implicit defaults', () => {
  const updateField = vi.fn();
  render(<ExploreGuidedFilters draft={draft} errors={{}} updateField={updateField} t={t} />);
  expect(screen.getByRole('combobox', { name: t('exploreMetric.aggregation') }).closest('.ant-select')).toBeVisible();
  expect(screen.getByRole('textbox', { name: t('exploreMetric.groupBy') })).toBeVisible();
  expect(
    screen.getByRole('combobox', { name: t('exploreMetric.temporalAggregation') }).closest('.ant-select')
  ).toBeVisible();
  expect(screen.getByText(t('exploreMetric.defaultSum'))).toBeVisible();
  expect(screen.getByText(t('exploreMetric.defaultRaw'))).toBeVisible();
  expect(updateField).not.toHaveBeenCalled();
  fireEvent.change(screen.getByRole('textbox', { name: t('exploreMetric.groupBy') }), { target: { value: 'le' } });
  expect(updateField).toHaveBeenCalledWith({ field: 'groupBy', value: 'le' });
});

it('keeps matcher/step advanced and opens a step error while aggregation is already visible', () => {
  const view = render(<ExploreAdvancedFilters draft={draft} errors={{}} updateField={vi.fn()} t={t} />);
  expect(view.container.querySelector('details')).not.toHaveAttribute('open');
  expect(screen.queryByRole('combobox', { name: t('exploreMetric.aggregation') })).not.toBeInTheDocument();
  view.rerender(
    <ExploreAdvancedFilters draft={draft} errors={{ stepSeconds: 'invalid_step' }} updateField={vi.fn()} t={t} />
  );
  expect(view.container.querySelector('details')).toHaveAttribute('open');
  expect(screen.getByRole('textbox', { name: t('exploreMetric.step') })).toHaveAttribute('aria-invalid', 'true');
  expect(screen.getByRole('textbox', { name: t('exploreMetric.filter') })).toBeVisible();
  view.rerender(<ExploreAdvancedFilters draft={draft} errors={{}} updateField={vi.fn()} t={t} />);
  expect(view.container.querySelector('details')).toHaveAttribute('open');
});

it('explains count and fixed temporal lookback only when selected and leaves trace controls unchanged', () => {
  const view = render(
    <ExploreGuidedFilters
      draft={{
        ...draft,
        signal: 'metrics',
        metricPlan: '',
        aggregation: 'count',
        temporalAggregation: 'rate',
        metricFilter: '',
        groupBy: '',
        stepSeconds: ''
      }}
      errors={{}}
      updateField={vi.fn()}
      t={t}
    />
  );
  const help = screen.getByText(t('exploreMetric.countSeriesHint')).closest('details');
  expect(help).not.toHaveAttribute('open');
  help?.setAttribute('open', '');
  expect(screen.getByText(t('exploreMetric.countSeriesHint'))).toBeVisible();
  expect(screen.getByText(t('exploreMetric.temporalWindowHint'))).toBeVisible();
  view.rerender(
    <ExploreGuidedFilters
      draft={draftFromQuery({ signal: 'traces', timeRange: 'last-30m' })}
      errors={{}}
      updateField={vi.fn()}
      t={t}
    />
  );
  expect(screen.queryByRole('combobox', { name: t('exploreMetric.aggregation') })).not.toBeInTheDocument();
});

it('keeps default and semantic guidance translated in every runtime catalog', () => {
  for (const catalog of [en, zh, tw, ja, pt]) {
    for (const key of [
      'defaultSum',
      'defaultRaw',
      'identityGroupingHint',
      'temporalWindowHint',
      'countSeriesHint'
    ] as const) {
      expect(catalog.exploreMetric[key]).toEqual(expect.any(String));
      expect(catalog.exploreMetric[key].trim()).not.toBe('');
    }
  }
});
