/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import { act, renderHook } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { draftFromQuery, type ExploreSubmissionViewModel } from '../model/explore-submission-model';
import { useMetricPlanEditor } from './use-metric-plan-editor';
const suggestions = vi.hoisted(() => vi.fn(() => ({ state: 'idle', items: [], truncated: false })));
vi.mock('./use-metric-label-suggestions', () => ({ useMetricLabelSuggestions: suggestions }));
const query = { signal: 'metrics' as const, timeRange: 'last-30m' as const, serviceName: 'old', query: 'cpu' };
function submission(): ExploreSubmissionViewModel {
  return {
    draft: { ...draftFromQuery(query), serviceName: 'pending' },
    errors: {},
    updateField: vi.fn(),
    submit: vi.fn(),
    applyLogPatch: vi.fn(),
    resetDraft: vi.fn(),
    removeFilter: vi.fn(),
    removeFilters: vi.fn()
  };
}
it('keeps a selected label when focus moves inside the same query row', () => {
  const { result } = renderHook(() => useMetricPlanEditor(submission(), query, { from: 1000, to: 2000 }));
  act(() => {
    if (result.current && !result.current.invalid) result.current.onSelectedLabelChange('host');
  });
  act(() => {
    if (result.current && !result.current.invalid) result.current.onActiveRefChange('a');
  });
  expect(result.current && !result.current.invalid && result.current.selectedLabel).toBe('host');
  expect(suggestions).toHaveBeenLastCalledWith(
    expect.objectContaining({ serviceName: 'pending', query: 'cpu' }),
    { from: 1000, to: 2000 },
    'host'
  );
});
it('serializes a legacy raw-default source without an invalid empty enum', () => {
  const model = submission();
  const { result } = renderHook(() => useMetricPlanEditor(model));
  act(() => {
    if (result.current && !result.current.invalid) result.current.select('memory');
  });
  const update = vi.mocked(model.updateField).mock.calls[0]?.[0];
  expect(update?.field).toBe('metricPlan');
  expect(JSON.parse(String(update?.value)).queries[0]).toMatchObject({ metric: 'memory', refId: 'a' });
  expect(JSON.parse(String(update?.value)).queries[0].temporalAggregation).toBeUndefined();
});

it('distinguishes pristine virtual selection from structured or rejected authoring', () => {
  const model = submission();
  model.draft = draftFromQuery({ signal: 'metrics', timeRange: 'last-30m' });
  const { result, rerender } = renderHook(() => useMetricPlanEditor(model));
  expect(result.current && !result.current.invalid && result.current.pristine).toBe(true);
  model.errors = { metricPlan: 'invalid_metric_plan' };
  rerender();
  expect(result.current && !result.current.invalid && result.current.pristine).toBe(false);
  model.errors = {};
  if (model.draft.signal !== 'metrics') throw new Error('Expected metrics draft');
  model.draft = {
    ...model.draft,
    metricPlan: JSON.stringify({ version: 1, queries: [{ refId: 'a', metric: '' }], formulas: [] })
  };
  rerender();
  expect(result.current && !result.current.invalid && result.current.pristine).toBe(false);
});

it('keeps discovery ownership stable when only presentation URL state changes', () => {
  const draft = submission();
  const window = { from: 1000, to: 2000 };
  const { result, rerender } = renderHook(
    ({ metricView }) => useMetricPlanEditor(draft, { ...query, metricView }, window),
    { initialProps: { metricView: undefined as string | undefined } }
  );
  const initial = result.current && !result.current.invalid ? result.current.discoveryIdentity : undefined;
  rerender({ metricView: JSON.stringify({ mode: 'chart', hidden: [], chart: { display: 'bar' } }) });
  expect(result.current && !result.current.invalid && result.current.discoveryIdentity).toBe(initial);
});
