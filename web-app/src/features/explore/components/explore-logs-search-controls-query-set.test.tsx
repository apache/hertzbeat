/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License.  You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

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
