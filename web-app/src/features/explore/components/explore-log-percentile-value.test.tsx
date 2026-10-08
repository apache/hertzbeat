/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, expect, it } from 'vitest';
import type { TFunction } from 'i18next';
import { LogMeasureValue } from './explore-log-measure-value';
const t = ((key: string) => key) as TFunction;
afterEach(cleanup);
it('does not claim that an extreme-population percentile is infinite', () => {
  const view = render(
    <LogMeasureValue measurement={{ state: 'non_finite', sampleCount: 3, value: null }} approximate t={t} />
  );
  expect(screen.getByText('explore.logAnalysis.percentileUnavailable')).toBeVisible();
  view.rerender(
    <LogMeasureValue measurement={{ state: 'no_samples', sampleCount: 0, value: null }} approximate t={t} />
  );
  expect(screen.getByText('explore.logAnalysis.no_samples')).toBeVisible();
  view.rerender(<LogMeasureValue measurement={{ state: 'non_finite', sampleCount: 3, value: null }} t={t} />);
  expect(screen.getByText('explore.logAnalysis.non_finite')).toBeVisible();
});
