/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import type { TFunction } from 'i18next';
import { ExploreLogComparisonTimeShiftControl } from './explore-log-comparison-timeshift-control';
import { formatComparisonTimestamp } from '../model/explore-log-timeshift';
import { ExploreLogComparisonFacetWindow } from './explore-log-comparison-windows';
import { ExploreLogFacetSourceControls } from './explore-log-facet-source-controls';
const t = ((key: string) => key) as TFunction;
afterEach(cleanup);
it('stages offset changes and resets by omission while preserving b query and formula', () => {
  const comparison = { version: 1 as const, search: 'error', formula: 'a/b', timeShiftMs: 3600000 };
  const change = vi.fn();
  render(<ExploreLogComparisonTimeShiftControl comparison={comparison} change={change} t={t} />);
  fireEvent.mouseDown(screen.getByRole('combobox'));
  fireEvent.click(screen.getByText('explore.logComparison.dayEarlier'));
  expect(change).toHaveBeenLastCalledWith({ ...comparison, timeShiftMs: 86400000 });
  fireEvent.mouseDown(screen.getByRole('combobox'));
  fireEvent.click(screen.getByText('explore.logComparison.sameWindow'));
  expect(change).toHaveBeenLastCalledWith({ ...comparison, timeShiftMs: undefined });
});
it('retains unsupported numeric drafts for explicit reset', () => {
  render(
    <ExploreLogComparisonTimeShiftControl
      comparison={{ version: 1, search: '', timeShiftMs: 123 }}
      change={vi.fn()}
      t={t}
    />
  );
  expect(screen.getByText('123')).toBeVisible();
});
it('formats exact full dates with timezone and millisecond precision', () => {
  expect(formatComparisonTimestamp(0, 'UTC')).toBe('1970-01-01 00:00:00.000 Z');
  render(<ExploreLogComparisonFacetWindow window={{ from: 1000, to: 2000 }} source="b" timeZone="UTC" t={t} />);
  expect(screen.getByTitle('explore.logComparison.appliedFacetWindow')).toBeVisible();
});
it('switches the comparison facet source through the workbench dropdown', () => {
  const onTarget = vi.fn();
  const { container } = render(
    <ExploreLogFacetSourceControls
      current={{ version: 1, search: '' }}
      source="a"
      window={undefined}
      timeZone="UTC"
      draftSyntax="structured-v1"
      onTarget={onTarget}
      t={t}
    />
  );
  expect(container.querySelector('select')).not.toBeInTheDocument();
  fireEvent.mouseDown(screen.getByRole('combobox', { name: 'explore.logComparison.facetTarget' }));
  fireEvent.click(screen.getByTitle('b'));
  expect(onTarget).toHaveBeenCalledWith('b');
});
