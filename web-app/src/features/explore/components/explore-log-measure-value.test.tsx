/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, expect, it } from 'vitest';
import type { TFunction } from 'i18next';
import { LogMeasureValue, LogAnalysisRankBar } from './explore-log-measure-value';
afterEach(cleanup);
const t = ((key: string) => key) as TFunction;
it('shows no_samples distinctly from a ready zero', () => {
  render(
    <>
      <LogMeasureValue measurement={{ state: 'no_samples', sampleCount: 0, value: null }} t={t} />
      <LogMeasureValue measurement={{ state: 'ready', sampleCount: 1, value: 0 }} t={t} />
    </>
  );
  expect(screen.getByText('explore.logAnalysis.no_samples')).toBeVisible();
  expect(screen.getByText('0')).toBeVisible();
});
it('shows six significant digits while preserving the exact measurement in the title', () => {
  render(<LogMeasureValue measurement={{ state: 'ready', sampleCount: 2, value: 89.04944444444445 }} t={t} />);
  expect(screen.getByText('89.0494')).toHaveAttribute('title', '89.04944444444445');
});
it('positions a negative bar left of zero without fabricating unavailable bars', () => {
  const group = {
    kind: 'all' as const,
    value: null,
    count: 2,
    buckets: [],
    measurement: { state: 'ready' as const, sampleCount: 2, value: -2 }
  };
  const data = {
    window: { start: 1, end: 2 },
    field: null,
    view: 'groups' as const,
    limit: 20,
    order: 'measure-desc' as const,
    minCount: 1,
    matchingTotal: 2,
    truncated: false,
    intervalMs: null,
    measure: { function: 'avg' as const, field: 'attribute:x' },
    groups: [group]
  };
  const { container, rerender } = render(<LogAnalysisRankBar group={group} data={data} />);
  expect(container.querySelectorAll('span')[1]).toHaveStyle({ left: '0%', width: '100%' });
  rerender(
    <LogAnalysisRankBar
      group={{ ...group, measurement: { state: 'no_samples', sampleCount: 0, value: null } }}
      data={data}
    />
  );
  expect(container).toBeEmptyDOMElement();
});
it('keeps extreme finite measurements readable', () => {
  const group = {
    kind: 'value' as const,
    value: 'negative',
    count: 1,
    buckets: [],
    measurement: { state: 'ready' as const, sampleCount: 1, value: -1e308 }
  };
  const data = {
    window: { start: 1, end: 2 },
    field: null,
    view: 'groups' as const,
    limit: 20,
    order: 'measure-desc' as const,
    minCount: 1,
    matchingTotal: 2,
    truncated: false,
    intervalMs: null,
    measure: { function: 'avg' as const, field: 'attribute:x' },
    groups: [group, { ...group, value: 'positive', measurement: { ...group.measurement, value: 1e308 } }]
  };
  const { container } = render(
    <>
      <LogAnalysisRankBar group={group} data={data} />
      <LogMeasureValue measurement={group.measurement} t={t} />
    </>
  );
  expect(container.querySelectorAll('span')[1]).toHaveStyle({ left: '0%', width: '50%' });
  const value = screen.getByTitle('-1e+308');
  expect(value.textContent.length).toBeLessThan(20);
  expect(value).not.toHaveTextContent(/^0$/);
});
