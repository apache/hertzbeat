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

import { useState } from 'react';
import { EditorView } from '@codemirror/view';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeAll, expect, it, vi } from 'vitest';
import { ConfigProvider } from 'antd';
import { i18n, initializeI18n, loadLocale } from '@/core/i18n/i18n';
import { ExploreLogSearchInput } from './explore-log-search-input';
import { useExploreSubmitFocus } from './use-metric-submit-focus';
import { draftFromQuery, type ExploreSubmissionViewModel } from '../model/explore-submission-model';

beforeAll(async () => {
  Range.prototype.getClientRects = () => ({
    length: 0,
    item: () => null,
    [Symbol.iterator]: () => [][Symbol.iterator]()
  });
  await initializeI18n();
  await loadLocale('en-US');
});
afterEach(cleanup);

function Subject() {
  const [value, setValue] = useState('service:"');
  const [rejected, setRejected] = useState(false);
  const submission = {
    draft: draftFromQuery({ signal: 'logs', timeRange: 'last-30m' }),
    errors: rejected ? { query: 'unclosed_quote' } : {},
    submit: vi.fn(),
    updateField: vi.fn(),
    resetDraft: vi.fn(),
    applyLogPatch: vi.fn(),
    removeFilter: vi.fn(),
    removeFilters: vi.fn()
  } as ExploreSubmissionViewModel;
  const recent = draftFromQuery({ signal: 'logs', timeRange: 'last-30m', query: 'service:api' });
  if (recent.signal !== 'logs') throw new Error('Expected logs draft');
  const { queryRef, requestFocus } = useExploreSubmitFocus(submission);
  return (
    <ConfigProvider theme={{ token: { motion: false } }}>
      <div ref={queryRef}>
        <form
          onSubmit={event => {
            event.preventDefault();
            setRejected(true);
            requestFocus();
          }}
        >
          <ExploreLogSearchInput
            value={value}
            syntax="structured-v1"
            invalid={rejected}
            errorId="query-error"
            onChange={setValue}
            t={i18n.t.bind(i18n)}
            recentQueries={[{ ...recent, executedAt: 1 }]}
          />
          <button type="submit">Query fixture</button>
          {rejected && (
            <div id="query-error" role="alert">
              Invalid query fixture
            </div>
          )}
        </form>
      </div>
    </ConfigProvider>
  );
}

it.each(['mouse', 'Enter'])(
  'keeps rejected %s submission focused with suggestions closed, then allows explicit suggestions and editing',
  async mode => {
    render(<Subject />);
    const input = screen.getByRole('combobox');
    const view = EditorView.findFromDOM(input)!;
    act(() => view.focus());
    await screen.findByRole('button', { name: 'service:api' });
    if (mode === 'mouse') {
      act(() => screen.getByRole('button', { name: 'Query fixture' }).focus());
      fireEvent.click(screen.getByRole('button', { name: 'Query fixture' }));
    } else fireEvent.keyDown(input, { key: 'Enter' });
    expect(input).toHaveFocus();
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toHaveAttribute('aria-describedby', 'query-error');
    expect(screen.getByRole('alert')).toBeVisible();
    await waitFor(() => expect(input).toHaveAttribute('aria-expanded', 'false'));
    expect(screen.queryByRole('button', { name: 'service:api' })).toBeNull();
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    await waitFor(() => expect(input).toHaveAttribute('aria-expanded', 'true'));
    await waitFor(() => expect(screen.getByRole('button', { name: 'service:api' })).toBeVisible());
    fireEvent.keyDown(input, { key: 'Escape' });
    act(() => view.dispatch({ changes: { from: view.state.doc.length, insert: 'a' } }));
    await waitFor(() => expect(input).toHaveAttribute('aria-expanded', 'true'));
  }
);
