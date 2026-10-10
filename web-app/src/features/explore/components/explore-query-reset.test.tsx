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

import { useRecentLogSearches } from '../controller/use-recent-log-searches';
/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeAll, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { i18n, initializeI18n, loadLocale } from '@/core/i18n/i18n';
import { useExploreSubmission } from '../controller/use-explore-submission';
import { useLogQueryBuilder } from '../controller/use-log-query-builder';
import type { ExploreQueryPatch } from '../model/explore-model';
import { ExploreQueryBar } from './explore-query-bar';
import { ExploreQueryActions } from './explore-query-command';

beforeAll(async () => {
  await initializeI18n();
  await loadLocale('en-US');
});
afterEach(cleanup);

it('discards an incomplete condition without applying a query or changing scope', () => {
  const navigate = vi.fn<(patch: ExploreQueryPatch) => void>();
  render(
    <MemoryRouter>
      <Subject navigate={navigate} />
    </MemoryRouter>
  );
  fireEvent.click(screen.getByRole('button', { name: i18n.t('explore.logQueryBuilder.addCondition') }));
  fireEvent.click(screen.getByRole('button', { name: i18n.t('explore.resetChanges') }));
  expect(screen.queryByRole('button', { name: i18n.t('explore.resetChanges') })).not.toBeInTheDocument();
  expect(navigate).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: i18n.t('common.query') }));
  expect(navigate).toHaveBeenCalledTimes(1);
});

it('keeps the Logs query action at the right edge without a refresh action', () => {
  render(
    <MemoryRouter>
      <Subject navigate={vi.fn()} compact />
    </MemoryRouter>
  );
  const actions = document.querySelector('[data-log-query-actions]');
  expect(actions?.lastElementChild).toHaveAccessibleName(i18n.t('common.query'));
  expect(screen.queryByRole('button', { name: i18n.t('common.refresh') })).not.toBeInTheDocument();
});

it('lets a narrow result workspace reveal filters without submitting a query', () => {
  const navigate = vi.fn<(patch: ExploreQueryPatch) => void>();
  const { container } = render(
    <MemoryRouter>
      <Subject navigate={navigate} showResults />
    </MemoryRouter>
  );
  const toggle = container.querySelector<HTMLButtonElement>('[aria-controls="explore-log-filters"]');
  const filters = screen.getByRole('form', { name: i18n.t('explore.addFilters') });
  expect(toggle).toHaveTextContent(i18n.t('explore.addFilters'));
  expect(toggle).toHaveAttribute('aria-expanded', 'false');
  expect(filters).toHaveAttribute('data-mobile-open', 'false');
  fireEvent.click(toggle!);
  expect(toggle).toHaveAttribute('aria-expanded', 'true');
  expect(filters).toHaveAttribute('data-mobile-open', 'true');
  expect(navigate).not.toHaveBeenCalled();
});

function Subject({
  navigate,
  showResults = false,
  compact = false
}: {
  navigate: (patch: ExploreQueryPatch) => void;
  showResults?: boolean;
  compact?: boolean;
}) {
  const query = { signal: 'logs', timeRange: 'last-30m', serviceName: 'checkout' } as const;
  const submission = useExploreSubmission(query, navigate);
  const history = useRecentLogSearches();
  const editor = useLogQueryBuilder(submission);
  if (compact) {
    return (
      <ExploreQueryActions
        query={query}
        submission={submission}
        editor={editor}
        refresh={vi.fn().mockResolvedValue(undefined)}
        t={i18n.t}
        compactReset
      />
    );
  }
  return (
    <ExploreQueryBar
      history={history}
      query={query}
      t={i18n.t}
      updateQuery={navigate}
      updateScope={navigate}
      refresh={vi.fn().mockResolvedValue(undefined)}
      time={null}
      submission={submission}
      editor={editor}
      results={showResults ? <div data-explore-region="results">Results</div> : undefined}
    />
  );
}
