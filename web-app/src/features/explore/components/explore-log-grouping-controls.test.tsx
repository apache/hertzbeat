/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import type { TFunction } from 'i18next';
import { ExploreLogGroupingControls } from './explore-log-grouping-controls';
import { ExploreLogAnalysisRepresentations } from './explore-log-analysis-controls';
import { DEFAULT_LOG_ANALYSIS } from '@/platform/perses';
afterEach(cleanup);
const t = ((key: string, options?: { index?: number }) =>
  options?.index ? `${key} ${options.index}` : key) as TFunction;
const fields = ['a', 'b', 'c'].map(key => ({ id: `attribute:${key}`, source: 'attribute' as const, key }));
it('adds a draft dimension without shrinking existing limits and disables over-budget options', () => {
  const onChange = vi.fn();
  const { rerender } = render(
    <ExploreLogGroupingControls
      value={{ ...DEFAULT_LOG_ANALYSIS, representation: 'table', field: 'attribute:a' }}
      fields={fields}
      onChange={onChange}
      t={t}
    />
  );
  fireEvent.click(screen.getByRole('button', { name: 'explore.logAnalysis.addGrouping' }));
  const next = {
    ...DEFAULT_LOG_ANALYSIS,
    representation: 'table' as const,
    grouping: {
      version: 1 as const,
      dimensions: [
        { field: 'attribute:a', limit: 20 },
        { field: 'attribute:b', limit: 1 }
      ]
    }
  };
  expect(onChange).toHaveBeenCalledExactlyOnceWith(next);
  rerender(<ExploreLogGroupingControls value={next} fields={fields} onChange={onChange} t={t} />);
  fireEvent.mouseDown(screen.getByRole('combobox', { name: 'explore.logAnalysis.dimensionLimit 2' }));
  expect(screen.getByTitle('10')).toHaveClass('ant-select-item-option-disabled');
  fireEvent.click(screen.getByRole('button', { name: 'explore.logAnalysis.moveGrouping 2' }));
  expect(onChange).toHaveBeenLastCalledWith({
    ...next,
    grouping: { version: 1, dimensions: [...next.grouping.dimensions].reverse() }
  });
  fireEvent.click(screen.getByRole('button', { name: 'explore.logAnalysis.removeGrouping 2' }));
  expect(onChange).toHaveBeenLastCalledWith({ ...DEFAULT_LOG_ANALYSIS, representation: 'table', field: 'attribute:a' });
});
it('offers only Logs and Timeseries result representations', () => {
  render(<ExploreLogAnalysisRepresentations value="logs" onChange={vi.fn()} t={t} />);
  expect(screen.getByRole('button', { name: 'explore.logAnalysis.logs' })).toBeVisible();
  expect(screen.getByRole('button', { name: 'explore.logAnalysis.timeseries' })).toBeVisible();
  expect(screen.queryByRole('button', { name: 'explore.logAnalysis.table' })).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'explore.logAnalysis.toplist' })).not.toBeInTheDocument();
});
