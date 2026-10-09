/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, expect, it } from 'vitest';
import type { TFunction } from 'i18next';
import { ComparisonTable } from './explore-log-comparison-table';
import { AdditionalMeasureCells, AdditionalComparisonCells } from './explore-log-additional-measure-cells';
const t = ((key: string) => key) as TFunction;
const measure = { function: 'avg' as const, field: 'attribute:duration' };
afterEach(cleanup);
it('shows unavailable values and sample provenance per source without fake zero', () => {
  const noSamples = { state: 'no_samples' as const, value: null, sampleCount: 0 };
  const group = {
    keys: [],
    a: { count: 2, additionalMeasurements: [{ state: 'ready' as const, value: 7, sampleCount: 2 }] },
    b: { count: 0, additionalMeasurements: [noSamples] },
    buckets: []
  };
  const view = render(
    <table>
      <tbody>
        <tr>
          <AdditionalComparisonCells measures={[measure]} group={group} visible={['a', 'b']} t={t} />
        </tr>
      </tbody>
    </table>
  );
  expect(screen.getByText('a:')).toBeVisible();
  expect(screen.getByText('b:')).toBeVisible();
  expect(screen.getByText('7')).toBeVisible();
  expect(screen.getByText('explore.logAnalysis.no_samples')).toBeVisible();
  expect(screen.getAllByText('explore.logAnalysis.sampleCount')).toHaveLength(2);
  view.rerender(
    <table>
      <tbody>
        <tr>
          <AdditionalMeasureCells
            measures={[{ ...measure, function: 'p95' }]}
            values={[{ state: 'non_finite', value: null, sampleCount: 2 }]}
            t={t}
          />
        </tr>
      </tbody>
    </table>
  );
  expect(screen.getByText('explore.logAnalysis.percentileUnavailable')).toBeVisible();
});

it('hides configured extra columns in formula-only display without changing their definitions', () => {
  const data = {
    window: { start: 1000, end: 2000 },
    analysis: {
      field: null,
      view: 'groups' as const,
      limit: 20,
      order: 'count-desc' as const,
      minCount: 1,
      measure: undefined,
      grouping: null,
      additionalMeasures: [measure]
    },
    matchingA: 1,
    matchingB: 1,
    truncated: false,
    intervalMs: null,
    formula: 'a/b',
    groups: [
      {
        keys: [],
        a: { count: 1, additionalMeasurements: [{ state: 'ready' as const, value: 7, sampleCount: 1 }] },
        b: { count: 1, additionalMeasurements: [{ state: 'ready' as const, value: 8, sampleCount: 1 }] },
        buckets: []
      }
    ]
  };
  const view = render(<ComparisonTable data={data} visible={['formula']} t={t} />);
  expect(screen.queryByTitle('avg(attribute:duration)')).not.toBeInTheDocument();
  expect(screen.queryByText('7')).not.toBeInTheDocument();
  view.rerender(<ComparisonTable data={data} visible={['a', 'formula']} t={t} />);
  expect(screen.getByTitle('avg(attribute:duration)')).toBeVisible();
  expect(screen.getByText('7')).toBeVisible();
  expect(screen.queryByText('8')).not.toBeInTheDocument();
});
