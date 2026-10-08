/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { EditorView } from '@codemirror/view';
import type { TFunction } from 'i18next';
import { afterEach, expect, it, vi } from 'vitest';
import { DEFAULT_LOG_ANALYSIS } from '@/platform/perses';
import { draftFromQuery } from '../model/explore-submission-model';
import { ExploreLogsSearchControls } from './explore-logs-search-controls';

afterEach(cleanup);
const t = ((key: string) => key) as TFunction;

it('binds the main search input to the first retained source after deleting a', () => {
  const analysis = JSON.stringify({
    ...DEFAULT_LOG_ANALYSIS,
    representation: 'timeseries',
    querySet: {
      version: 2,
      queries: [
        {
          refId: 'b',
          alias: 'b',
          visible: true,
          search: 'worker',
          analysis: { limit: 20, order: 'count-desc', minCount: 1 }
        }
      ],
      formulas: [],
      nextSourceOrdinal: 2,
      nextFormulaSeq: 1
    }
  });
  const draft = draftFromQuery({ signal: 'logs', timeRange: 'last-30m', query: 'stale', logAnalysis: analysis });
  if (draft.signal !== 'logs') throw new Error('Expected Logs draft');
  const updateField = vi.fn();
  const submit = vi.fn();
  render(
    <form
      onSubmit={event => {
        event.preventDefault();
        submit();
      }}
    >
      <ExploreLogsSearchControls
        draft={draft}
        t={t}
        updateField={updateField}
        recent={null}
        onBlurSubmit={false}
        suggestions={undefined}
        actions={null}
        draftPending={false}
      />
    </form>
  );
  const editor = EditorView.findFromDOM(screen.getByRole('combobox', { name: 'explore.queryLabels.logs' }))!;
  expect(editor.state.doc.toString()).toBe('worker');
  expect(screen.getByText('b')).toBeVisible();
  act(() => editor.dispatch({ changes: { from: 6, insert: 's' } }));
  const update = updateField.mock.lastCall?.[0];
  expect(update.field).toBe('logAnalysis');
  expect(JSON.parse(update.value as string).querySet.queries[0]).toMatchObject({ refId: 'b', search: 'workers' });
  fireEvent.click(screen.getByRole('button', { name: 'explore.logAdd.alias' }));
  fireEvent.keyDown(screen.getByRole('textbox', { name: 'explore.logAdd.alias' }), { key: 'Enter' });
  expect(submit).toHaveBeenCalledTimes(1);
});
