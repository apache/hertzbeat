/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { ExploreLogOrderRecovery } from './explore-log-order-recovery';
import { draftFromQuery } from '../model/explore-submission-model';
import { ExploreLogOrderHeader, ExploreLogOrderControls, ExploreCalculatedSortHeader } from './explore-log-order';
import type { TFunction } from 'i18next';
import type { LogColumn } from '../model/explore-log-columns';
afterEach(cleanup);
const t = ((key: string) => key) as TFunction;
it('offers explicit types without changing the applied ordering', async () => {
  const change = vi.fn();
  render(
    <ExploreLogOrderHeader
      column={{ kind: 'field', scope: 'attributes', path: ['duration'] }}
      controls={{ draft: {}, change }}
      t={t}
    />
  );
  fireEvent.click(screen.getByRole('button'));
  fireEvent.click(await screen.findByText('explore.logSort.numberDesc'));
  expect(change).toHaveBeenCalledWith(
    JSON.stringify({ version: 1, field: 'attribute:duration', type: 'number', direction: 'desc' }),
    'newest'
  );
});
it('offers inferred-type ordering for a calculated column', async () => {
  const change = vi.fn();
  render(<ExploreCalculatedSortHeader name="seconds" type="number" controls={{ draft: {}, change }} t={t} />);
  fireEvent.click(screen.getByRole('button', { name: 'explore.logSort.menu' }));
  fireEvent.click(await screen.findByText('explore.logSort.numberAsc'));
  expect(change).toHaveBeenCalledWith(
    JSON.stringify({ version: 1, field: 'calculated:seconds', type: 'number', direction: 'asc' }),
    'newest'
  );
});
it('resets sorting draft to applied without submitting or navigating', () => {
  const change = vi.fn();
  render(
    <ExploreLogOrderControls
      query={{ signal: 'logs', timeRange: 'last-30m', sort: 'oldest' }}
      controls={{ draft: { sort: 'newest' }, change }}
      t={t}
    />
  );
  fireEvent.click(screen.getByRole('button', { name: 'explore.logSort.reset' }));
  expect(change).toHaveBeenCalledWith(undefined, 'oldest');
});
it('offers only text ordering on canonical builtins', async () => {
  const change = vi.fn();
  render(<ExploreLogOrderHeader column={{ kind: 'severity' }} controls={{ draft: {}, change }} t={t} />);
  fireEvent.click(screen.getByRole('button'));
  expect(await screen.findByText('explore.logSort.textAsc')).toBeInTheDocument();
  expect(screen.queryByText('explore.logSort.numberAsc')).not.toBeInTheDocument();
  fireEvent.click(screen.getByText('explore.logSort.textAsc'));
  expect(change).toHaveBeenCalledWith(
    JSON.stringify({ version: 1, field: 'builtin:severityCategory', type: 'text', direction: 'asc' }),
    'newest'
  );
});

it('keeps invalid route sorting recoverable without applying it silently', async () => {
  const query = { signal: 'logs' as const, timeRange: 'last-30m' as const, logSort: '{}' };
  const updateField = vi.fn();
  const submit = vi.fn();
  const applyLogPatch = vi.fn();
  render(
    <ExploreLogOrderRecovery
      query={query}
      submission={{
        draft: draftFromQuery(query),
        updateField,
        submit,
        errors: {},
        applyLogPatch,
        resetDraft: vi.fn(),
        removeFilter: vi.fn(),
        removeFilters: vi.fn()
      }}
      t={t}
    />
  );
  expect(screen.getByRole('alert')).toHaveTextContent('explore.logSort.invalid');
  fireEvent.mouseDown(screen.getByRole('combobox'));
  fireEvent.click(await screen.findByText('explore.logColumns.newest'));
  expect(applyLogPatch).toHaveBeenCalledWith({ logSort: undefined, sort: 'newest' });
  expect(updateField).not.toHaveBeenCalled();
  expect(submit).not.toHaveBeenCalled();
});

it('uses compact pending feedback while retaining complete sort details and reset meaning', () => {
  const logSort = JSON.stringify({ version: 1, field: 'attribute:duration', type: 'number', direction: 'desc' });
  render(
    <ExploreLogOrderControls
      query={{ signal: 'logs', timeRange: 'last-30m', sort: 'oldest' }}
      controls={{ draft: { logSort, sort: 'newest' }, change: vi.fn() }}
      t={t}
    />
  );
  expect(screen.getByRole('status')).toHaveTextContent('explore.logSort.pendingShort');
  expect(screen.getByRole('status')).toHaveAttribute('title', expect.stringContaining('explore.logSort.pending'));
  expect(screen.getByRole('button', { name: 'explore.logSort.reset' })).toHaveAttribute(
    'title',
    'explore.logSort.reset'
  );
  expect(screen.getByRole('button', { name: 'explore.logSort.reset' })).not.toHaveTextContent('explore.logSort.reset');
  expect(screen.getAllByTitle(/attribute:duration/).length).toBeGreaterThan(0);
});

it.each([
  { kind: 'time' },
  { kind: 'severity' },
  { kind: 'field', scope: 'resource', path: ['host.name'] }
] satisfies LogColumn[])('renders a plain Live header for $kind without an inactive sorting arrow', column => {
  const { container } = render(
    <ExploreLogOrderHeader
      live
      column={column}
      labelOverride="Column"
      direction="descending"
      controls={{ draft: {}, change: vi.fn() }}
      t={t}
    />
  );
  expect(screen.getByText('Column')).toHaveAttribute('title', 'explore.logSort.historyOnly');
  expect(screen.queryByRole('button')).not.toBeInTheDocument();
  expect(container.querySelector('svg')).toBeNull();
});
