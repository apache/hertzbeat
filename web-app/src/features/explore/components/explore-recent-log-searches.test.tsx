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
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeAll, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { i18n, initializeI18n, loadLocale } from '@/core/i18n/i18n';
import { SessionContext } from '@/core/auth/session-context';
import { useExploreSubmission } from '../controller/use-explore-submission';
import { useLogQueryBuilder } from '../controller/use-log-query-builder';
import { ExploreQueryBar } from './explore-query-bar';
import { addRecentLogSearch, recentLogSearchKey } from '../model/explore-recent-log-searches';
import type { LogExploreQuery } from '../model/explore-query';
import { draftFromQuery } from '../model/explore-submission-model';

beforeAll(async () => {
  await initializeI18n();
  await loadLocale('en-US');
  expect(i18n.exists('explore.recentLogs.title')).toBe(true);
});
afterEach(() => {
  cleanup();
  sessionStorage.clear();
  vi.restoreAllMocks();
});
const navigate = vi.fn();
function Subject({ currentQuery }: { currentQuery?: LogExploreQuery | undefined }) {
  const query =
    currentQuery ??
    ({
      signal: 'logs',
      timeRange: 'last-30m',
      serviceName: 'old-service',
      environment: 'old-env',
      severityText: 'WARN'
    } as const);
  const submission = useExploreSubmission(query, navigate);
  const history = useRecentLogSearches();
  const editor = useLogQueryBuilder(submission);
  return (
    <>
      <output data-testid="draft">{JSON.stringify(submission.draft)}</output>
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
      />
    </>
  );
}
function mount(username = 'operator', currentQuery?: LogExploreQuery) {
  return render(
    <SessionContext.Provider
      value={{
        loading: false,
        retry: vi.fn(),
        session: { authenticated: true, username, workspaceId: 'workspace', roles: [], expiresAt: null }
      }}
    >
      <MemoryRouter>
        <Subject currentQuery={currentQuery} />
      </MemoryRouter>
    </SessionContext.Provider>
  );
}
it('restores all filters into draft, clears absent filters, and records only on explicit submit', async () => {
  navigate.mockClear();
  const history = addRecentLogSearch(
    [],
    draftFromQuery({
      signal: 'logs',
      timeRange: 'last-30m',
      query: 'failure',
      serviceName: 'checkout',
      resourceFilter: 'region = "east"'
    })
  );
  const key = recentLogSearchKey('workspace', 'operator');
  sessionStorage.setItem(key, JSON.stringify(history));
  mount();
  fireEvent.click(screen.getByRole('button', { name: i18n.t('explore.recentLogs.title') }));
  fireEvent.click(await screen.findByRole('button', { name: 'failure' }));
  const restored = JSON.parse(screen.getByTestId('draft').textContent);
  expect(restored).toMatchObject({
    query: 'failure',
    serviceName: 'checkout',
    environment: '',
    severityText: '',
    resourceFilter: 'region = "east"'
  });
  expect(navigate).not.toHaveBeenCalled();
  expect(JSON.parse(sessionStorage.getItem(key)!)).toEqual(history);
  fireEvent.click(screen.getByRole('button', { name: i18n.t('common.query') }));
  expect(navigate).toHaveBeenCalledTimes(1);
  await waitFor(() =>
    expect(JSON.parse(sessionStorage.getItem(key)!)[0].executedAt).toBeGreaterThanOrEqual(history[0]!.executedAt)
  );
});
it('does not expose another account history and survives denied storage', () => {
  sessionStorage.setItem(
    recentLogSearchKey('workspace', 'operator'),
    JSON.stringify(addRecentLogSearch([], draftFromQuery({ signal: 'logs', timeRange: 'last-30m', query: 'private' })))
  );
  mount('other');
  fireEvent.click(screen.getByRole('button', { name: i18n.t('explore.recentLogs.title') }));
  expect(screen.queryByRole('button', { name: 'private' })).not.toBeInTheDocument();
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
    throw new Error('Denied');
  });
  expect(() => fireEvent.click(screen.getByRole('button', { name: i18n.t('common.query') }))).not.toThrow();
});
it('focuses search on opening and returns focus on Escape', async () => {
  mount();
  const trigger = screen.getByRole('button', { name: i18n.t('explore.recentLogs.title') });
  fireEvent.click(trigger);
  const search = await screen.findByRole('searchbox', { name: i18n.t('explore.recentLogs.search') });
  await waitFor(() => expect(search).toHaveFocus());
  fireEvent.keyDown(search, { key: 'Escape' });
  await waitFor(() => expect(trigger).toHaveAttribute('aria-expanded', 'false'));
  await waitFor(() => expect(trigger).toHaveFocus());
});

it('restores legacy records over a different analysis and sorting without inheriting them or executing', async () => {
  navigate.mockClear();
  const old = { ...draftFromQuery({ signal: 'logs', timeRange: 'last-30m', query: 'legacy' }), executedAt: 1000 };
  for (const key of ['sort', 'logSort', 'logAnalysis']) Reflect.deleteProperty(old, key);
  sessionStorage.setItem(recentLogSearchKey('workspace', 'operator'), JSON.stringify([old]));
  const logAnalysis = JSON.stringify({
    version: 1,
    representation: 'table',
    limit: 20,
    order: 'count-desc',
    minCount: 1
  });
  const logSort = JSON.stringify({ version: 1, field: 'attribute:duration', type: 'number', direction: 'desc' });
  const logNumericRange = JSON.stringify({ version: 1, field: 'attribute:duration', min: 10, max: 50 });
  mount('operator', {
    signal: 'logs',
    timeRange: 'last-30m',
    live: true,
    logAnalysis,
    logSort,
    logNumericRange,
    start: 1000,
    end: 2000
  });
  fireEvent.click(screen.getByRole('button', { name: i18n.t('explore.recentLogs.title') }));
  expect(await screen.findByText(i18n.t('explore.recentLogs.hint'))).toBeInTheDocument();
  expect(await screen.findByText(i18n.t('explore.recentLogs.statusUnknown'))).toBeInTheDocument();
  fireEvent.click(await screen.findByRole('button', { name: 'legacy' }));
  const restored = JSON.parse(screen.getByTestId('draft').textContent);
  expect(restored.logAnalysis).toBeUndefined();
  expect(restored.logSort).toBeUndefined();
  expect(restored.logNumericRange).toBeUndefined();
  expect(restored.sort).toBe('newest');
  expect(navigate).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: i18n.t('common.query') }));
  expect(navigate).toHaveBeenCalledWith(
    expect.objectContaining({ logAnalysis: undefined, logSort: undefined, logNumericRange: undefined, sort: 'newest' })
  );
  expect(navigate.mock.calls[0]![0]).not.toHaveProperty('live');
  expect(navigate.mock.calls[0]![0]).not.toHaveProperty('start');
});

it('restores a stored comparison and custom sort as a draft with readable syntax and analysis summaries', async () => {
  navigate.mockClear();
  const logAnalysis = JSON.stringify({
    version: 1,
    representation: 'timeseries',
    limit: 20,
    order: 'measure-desc',
    minCount: 1,
    measure: { function: 'p95', field: 'attribute:duration' },
    comparison: {
      version: 1,
      search: 'status:ERROR',
      searchSyntax: 'structured-v1',
      timeShiftMs: 3600000,
      formula: 'b/a'
    }
  });
  const logSort = JSON.stringify({ version: 1, field: 'attribute:duration', type: 'number', direction: 'desc' });
  const history = addRecentLogSearch(
    [],
    draftFromQuery({
      signal: 'logs',
      timeRange: 'last-30m',
      query: 'comparison',
      searchSyntax: 'structured-v1',
      logAnalysis,
      logSort
    }),
    1000
  );
  sessionStorage.setItem(recentLogSearchKey('workspace', 'operator'), JSON.stringify(history));
  mount('operator', { signal: 'logs', timeRange: 'last-15m', query: 'other', sort: 'oldest' });
  fireEvent.click(screen.getByRole('button', { name: i18n.t('explore.recentLogs.title') }));
  const item = await screen.findByRole('button', { name: 'comparison' });
  const summary = item.parentElement!;
  expect(summary).toHaveTextContent(i18n.t('explore.logAuthoring.structured'));
  expect(summary).toHaveTextContent(i18n.t('explore.logAnalysis.p95'));
  expect(summary).toHaveTextContent(i18n.t('explore.recentLogs.comparisonSummary'));
  expect(summary.textContent).not.toContain('explore.');
  expect(summary.textContent).not.toContain('{');
  fireEvent.click(item);
  expect(JSON.parse(screen.getByTestId('draft').textContent)).toMatchObject({
    logAnalysis,
    logSort,
    sort: 'newest',
    query: 'comparison'
  });
  expect(navigate).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: i18n.t('common.query') }));
  expect(navigate).toHaveBeenCalledWith(expect.objectContaining({ logAnalysis, logSort, sort: 'newest' }));
  expect(navigate.mock.calls[0]![0]).not.toHaveProperty('timeRange');
});

it('makes the bounded recent-query region keyboard focusable and keeps Escape recovery', async () => {
  sessionStorage.setItem(
    recentLogSearchKey('workspace', 'operator'),
    JSON.stringify(
      addRecentLogSearch([], draftFromQuery({ signal: 'logs', timeRange: 'last-30m', query: 'last action proof' }))
    )
  );
  mount();
  const trigger = screen.getByRole('button', { name: i18n.t('explore.recentLogs.title') });
  fireEvent.click(trigger);
  const region = await screen.findByRole('region', { name: i18n.t('explore.recentLogs.title') });
  region.focus();
  expect(region).toHaveFocus();
  const clear = screen.getByRole('button', { name: i18n.t('explore.recentLogs.clear') });
  clear.focus();
  expect(clear).toHaveFocus();
  fireEvent.click(clear);
  expect(clear).toBeDisabled();
  expect(JSON.parse(sessionStorage.getItem(recentLogSearchKey('workspace', 'operator'))!)).toEqual([]);
  fireEvent.keyDown(region, { key: 'Escape' });
  expect(trigger).toHaveAttribute('aria-expanded', 'false');
  expect(trigger).toHaveFocus();
});
