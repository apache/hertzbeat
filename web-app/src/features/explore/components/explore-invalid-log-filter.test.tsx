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

import { EditorView } from '@codemirror/view';
import { useRecentLogSearches } from '../controller/use-recent-log-searches';

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeAll, expect, it, vi } from 'vitest';
import { I18nextProvider } from 'react-i18next';
import { MemoryRouter } from 'react-router-dom';
import { i18n, initializeI18n, loadLocale } from '@/core/i18n/i18n';
import { useExploreSubmission } from '../controller/use-explore-submission';
import { useLogQueryBuilder } from '../controller/use-log-query-builder';
import { ExploreQueryBar } from './explore-query-bar';
import { ExploreResultPanel } from '../pages/explore-result-panel';

beforeAll(async () => {
  await initializeI18n();
  await loadLocale('en-US');
});
afterEach(() => {
  cleanup();
  localStorage.clear();
});
it('offers filter correction rather than Retry and focuses Code without changing draft or submitting', async () => {
  const navigate = vi.fn();
  const retry = vi.fn().mockResolvedValue(undefined);
  function Subject() {
    const query = {
      signal: 'logs',
      timeRange: 'last-30m',
      resourceFilter: 'service.name = "checkout"',
      attributeFilter: 'http.route = "/pay"'
    } as const;
    const submission = useExploreSubmission(query, navigate);
    const history = useRecentLogSearches();
    const editor = useLogQueryBuilder(submission);
    return (
      <ExploreQueryBar
        history={history}
        query={query}
        t={i18n.t}
        updateQuery={navigate}
        updateScope={navigate}
        refresh={retry}
        time={null}
        submission={submission}
        editor={editor}
        results={
          <ExploreResultPanel query={query} result={{ kind: 'invalid_filter' }} retry={retry} openPath={navigate} />
        }
      />
    );
  }
  render(
    <I18nextProvider i18n={i18n}>
      <MemoryRouter>
        <Subject />
      </MemoryRouter>
    </I18nextProvider>
  );
  expect(screen.queryByRole('button', { name: i18n.t('common.retry') })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: i18n.t('explore.logQueryBuilder.checkFilter') }));
  const resource = await screen.findByRole('textbox', { name: i18n.t('explore.logQueryBuilder.resourceCode') });
  await waitFor(() => expect(resource).toHaveFocus());
  expect(resource).toHaveValue('service.name = "checkout"');
  expect(screen.getByRole('textbox', { name: i18n.t('explore.logQueryBuilder.attributeCode') })).toHaveValue(
    'http.route = "/pay"'
  );
  expect(navigate).not.toHaveBeenCalled();
  expect(retry).not.toHaveBeenCalled();
});

it('reviews the submitted syntax range and never replaces or submits a newer draft', () => {
  const navigate = vi.fn();
  function Subject() {
    const query = { signal: 'logs', timeRange: 'last-30m', query: 'service:', searchSyntax: 'structured-v1' } as const;
    const submission = useExploreSubmission(query, navigate);
    const editor = useLogQueryBuilder(submission);
    const history = useRecentLogSearches();
    return (
      <ExploreQueryBar
        history={history}
        query={query}
        t={i18n.t}
        updateQuery={navigate}
        updateScope={navigate}
        refresh={navigate}
        time={null}
        submission={submission}
        editor={editor}
        results={
          <ExploreResultPanel
            query={query}
            result={{
              kind: 'invalid_filter',
              syntaxDiagnostic: {
                issue: 'missing_value',
                start: 8,
                end: 8,
                expression: 'service:'
              }
            }}
            retry={navigate}
            openPath={navigate}
          />
        }
      />
    );
  }
  render(
    <I18nextProvider i18n={i18n}>
      <MemoryRouter>
        <Subject />
      </MemoryRouter>
    </I18nextProvider>
  );
  const input = screen.getByRole('combobox', { name: i18n.t('explore.queryLabels.logs') });
  expect(i18n.exists('explore.recovery.reviewQuery')).toBe(true);
  expect(
    screen.getByText(
      i18n.t('explore.logAuthoring.syntaxIssueAt', {
        position: 9,
        issue: i18n.t('explore.logAuthoring.syntaxIssue.missing_value')
      })
    )
  ).toBeVisible();
  fireEvent.click(screen.getByRole('button', { name: i18n.t('explore.recovery.reviewQuery') }));
  expect(input).toHaveFocus();
  expect(EditorView.findFromDOM(input)?.state.selection.main.head).toBe(8);
  const editor = EditorView.findFromDOM(input)!;
  editor.dispatch({ changes: { from: 8, insert: 'checkout' }, selection: { anchor: 2 } });
  fireEvent.click(screen.getByRole('button', { name: i18n.t('explore.recovery.reviewQuery') }));
  expect(editor.state.doc.toString()).toBe('service:checkout');
  expect(editor.state.selection.main.head).toBe(2);
  expect(navigate).not.toHaveBeenCalled();
});
