/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { TFunction } from 'i18next';
import { ExploreLogComparisonEditor } from './explore-log-comparison-editor';
import { draftFromQuery, type ExploreDraftFieldUpdate } from '../model/explore-submission-model';
import { DEFAULT_LOG_ANALYSIS } from '@/platform/perses';
const t = ((key: string) => key) as TFunction;
afterEach(cleanup);
it('copies a into b without submitting or changing a', () => {
  const draft = draftFromQuery({
    signal: 'logs',
    timeRange: 'last-30m',
    query: 'status:WARN',
    searchSyntax: 'structured-v1'
  });
  if (draft.signal !== 'logs') throw new Error('Expected logs');
  const updateField = vi.fn<(update: ExploreDraftFieldUpdate) => void>();
  render(<ExploreLogComparisonEditor draft={draft} updateField={updateField} t={t} />);
  fireEvent.click(screen.getByRole('button', { name: 'explore.logComparison.add' }));
  expect(updateField).toHaveBeenCalledTimes(1);
  const change = updateField.mock.calls[0]![0];
  expect(change.field).toBe('logAnalysis');
  if (typeof change.value !== 'string') throw new Error('Expected text update');
  expect(JSON.parse(change.value)).toMatchObject({
    representation: 'table',
    comparison: { version: 1, search: 'status:WARN', searchSyntax: 'structured-v1' }
  });
});
it('keeps invalid formula draft editable and removes b with its dependent formula explicitly', () => {
  const draft = draftFromQuery({
    signal: 'logs',
    timeRange: 'last-30m',
    query: '',
    logAnalysis: JSON.stringify({
      ...DEFAULT_LOG_ANALYSIS,
      representation: 'table',
      comparison: { version: 1, search: '', formula: 'a/' }
    })
  });
  if (draft.signal !== 'logs') throw new Error('Expected logs');
  const updateField = vi.fn<(update: ExploreDraftFieldUpdate) => void>();
  render(<ExploreLogComparisonEditor draft={draft} updateField={updateField} t={t} />);
  expect(screen.getByRole('textbox', { name: 'explore.logComparison.formula' })).toHaveValue('a/');
  fireEvent.click(screen.getByRole('button', { name: 'explore.logComparison.remove' }));
  const change = updateField.mock.calls[0]![0];
  if (typeof change.value !== 'string') throw new Error('Expected text update');
  expect(JSON.parse(change.value)).not.toHaveProperty('comparison');
});
