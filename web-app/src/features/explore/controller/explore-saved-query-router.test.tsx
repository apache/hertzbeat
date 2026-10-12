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

import { setLogSearchText, logSearchText } from '../components/test-log-search-editor';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { App, ConfigProvider } from 'antd';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { afterEach, beforeAll, beforeEach, expect, it, vi } from 'vitest';
import { I18nextProvider } from 'react-i18next';

import { SessionContext } from '@/core/auth/session-context';
import { initializeI18n, loadLocale, i18n } from '@/core/i18n/i18n';
import { GlobalTimeProvider, RouteTimeProvider } from '@/shared/time';

import { ExplorePage } from '../pages/explore-page';
import { buildSavedQueryPayload, readSavedQuery, type SavedQueryRecord } from '../model/explore-saved-query-model';
import { buildExplorePath, parseExploreQuery } from '../model/explore-model';
import { encodeLogView, parseLogView } from '@/platform/perses';
import { defaultLogSubquery } from '../model/explore-log-subquery';

const api = vi.hoisted(() => ({
  loadSavedQueries: vi.fn(),
  saveQueryRecord: vi.fn(),
  deleteQueryRecord: vi.fn(),
  loadHistory: vi.fn()
}));
vi.mock('../api/explore-saved-query-api', () => api);
vi.mock('../pages/explore-workspace-results', () => ({ ExploreWorkspaceResults: () => <div>Results</div> }));
vi.mock('../api/explore-investigation-api', () => ({
  loadTraceInvestigation: () => new Promise(() => {}),
  loadLogInvestigation: () => new Promise(() => {})
}));
vi.mock('../api/explore-api', async original => ({
  ...(await original<typeof import('../api/explore-api')>()),
  loadMetricSignal: () => new Promise(() => {}),
  loadLogHistoryEvidence: api.loadHistory,
  loadTraceSignal: () => new Promise(() => {})
}));
let records: SavedQueryRecord[] = [];
const routers: ReturnType<typeof createMemoryRouter>[] = [];
beforeAll(async () => {
  await initializeI18n();
  await loadLocale('en-US');
});
beforeEach(() => {
  vi.clearAllMocks();
  api.loadHistory.mockImplementation(() => new Promise(() => {}));
  records = [];
  api.loadSavedQueries.mockImplementation(signal =>
    Promise.resolve(records.filter(record => record.signal === signal))
  );
  api.saveQueryRecord.mockImplementation((record: SavedQueryRecord) => {
    const persisted = { ...record, revision: record.revision == null ? 0 : record.revision + 1 };
    records = [...records.filter(item => item.signal !== record.signal || item.viewKey !== record.viewKey), persisted];
    return Promise.resolve(persisted);
  });
  api.deleteQueryRecord.mockImplementation((signal, key) => {
    records = records.filter(record => record.signal !== signal || record.viewKey !== key);
    return Promise.resolve();
  });
});
afterEach(() => {
  cleanup();
  routers.splice(0).forEach(router => router.dispose());
});

it('blocks unapplied drafts, cancels without writing, and restores the complete query on same-key reopen', async () => {
  records = [
    buildSavedQueryPayload(
      { signal: 'logs', timeRange: 'last-1h', query: 'timeout', severityText: 'ERROR' },
      'saved-1',
      'Timeouts',
      ''
    )
  ];
  const router = renderWorkspace(
    '/explore?signal=logs&query=timeout&timeRange=last-1h&severityText=ERROR&savedView=saved-1'
  );
  const rail = await viewsRail();
  const update = await within(rail).findByRole('button', { name: i18n.t('exploreSaved.saveChanges') });
  expect(update).toBeDisabled();
  setLogSearchText(screen.getByRole('combobox', { name: i18n.t('explore.queryLabels.logs') }), 'draft changed');
  expect(
    await within(await viewsRail()).findByRole('button', { name: i18n.t('exploreSaved.saveChanges') })
  ).toBeDisabled();
  expect(within(rail).getByText(i18n.t('exploreSaved.applyFirst'))).toBeInTheDocument();
  fireEvent.click(within(rail).getByRole('button', { name: 'Timeouts' }));
  fireEvent.click(await screen.findByRole('button', { name: 'OK' }));
  await waitFor(() => expect(router.state.location.hash).toBe('#saved-queries'));
  expect(parseExploreQuery(new URLSearchParams(router.state.location.search))).toMatchObject({
    savedView: 'saved-1',
    query: '"timeout"',
    severityText: 'ERROR'
  });
  expect(logSearchText(screen.getByRole('combobox', { name: i18n.t('explore.queryLabels.logs') }))).toBe('"timeout"');
  fireEvent.click(within(await viewsRail()).getByRole('button', { name: i18n.t('exploreSaved.editView') }));
  fireEvent.change(screen.getByRole('textbox', { name: i18n.t('exploreSaved.name') }), {
    target: { value: 'Canceled name' }
  });
  fireEvent.click(within(await viewsRail()).getByRole('button', { name: i18n.t('common.cancel') }));
  expect(api.saveQueryRecord).not.toHaveBeenCalled();
});

it('saves a Logs view in the rail and updates it only after the applied query changes', async () => {
  const router = renderWorkspace('/explore?signal=logs&timeRange=last-30m&query=service%3Acodex-app-server');
  const rail = await viewsRail();
  fireEvent.click(within(rail).getByRole('button', { name: i18n.t('exploreSaved.saveAs') }));
  fireEvent.change(within(rail).getByRole('textbox', { name: i18n.t('exploreSaved.name') }), {
    target: { value: 'Codex logs' }
  });
  fireEvent.click(within(rail).getByRole('button', { name: i18n.t('common.save') }));
  await waitFor(() => expect(api.saveQueryRecord).toHaveBeenCalledOnce());
  const saved = api.saveQueryRecord.mock.calls[0]![0] as SavedQueryRecord;
  await waitFor(() => expect(router.state.location.search).toContain(`savedView=${saved.viewKey}`));
  expect(router.state.location.hash).toBe('#saved-queries');
  expect(
    await within(await viewsRail()).findByRole('button', { name: i18n.t('exploreSaved.saveChanges') })
  ).toBeDisabled();

  setLogSearchText(
    screen.getByRole('combobox', { name: i18n.t('explore.queryLabels.logs') }),
    'service:codex-app-server error'
  );
  fireEvent.click(screen.getByRole('button', { name: i18n.t('common.query') }));
  await waitFor(() => expect(router.state.location.search).toContain('error'));
  await waitFor(() =>
    expect(
      within(screen.getByRole('complementary', { name: i18n.t('exploreSaved.views') })).getByRole('button', {
        name: i18n.t('exploreSaved.saveChanges')
      })
    ).toBeEnabled()
  );
  fireEvent.click(within(await viewsRail()).getByRole('button', { name: i18n.t('exploreSaved.saveChanges') }));
  await waitFor(() => expect(api.saveQueryRecord).toHaveBeenCalledTimes(2));
  expect(api.saveQueryRecord.mock.calls[1]![0]).toMatchObject({ viewKey: saved.viewKey, revision: 0 });
});

it('reuses the creation identity after a received write loses its response', async () => {
  renderWorkspace('/explore?signal=metrics&query=cpu&timeRange=last-30m');
  const menu = await openQueryActions();
  fireEvent.click(within(menu).getByRole('button', { name: i18n.t('exploreSaved.save') }));
  fireEvent.change(screen.getByRole('textbox', { name: i18n.t('exploreSaved.name') }), { target: { value: 'CPU' } });
  api.saveQueryRecord.mockRejectedValueOnce(new Error('Response lost'));
  fireEvent.click(within(editorDialog()).getByRole('button', { name: /Save$/ }));
  await screen.findByText(i18n.t('exploreSaved.writeFailed'));
  expect(screen.getByRole('textbox', { name: i18n.t('exploreSaved.name') })).toHaveValue('CPU');
  const first = api.saveQueryRecord.mock.calls[0]![0] as SavedQueryRecord;
  fireEvent.click(within(editorDialog()).getByRole('button', { name: /Save$/ }));
  await waitFor(() => expect(api.saveQueryRecord).toHaveBeenCalledTimes(2));
  expect(api.saveQueryRecord.mock.calls[1]![0]).toMatchObject({ signal: first.signal, viewKey: first.viewKey });
});

it('retains failed edit input, suppresses repeat saves, and restores the successful retry with clean actions', async () => {
  const query = parseExploreQuery(
    new URLSearchParams('signal=logs&query=service:checkout&start=100000&end=200000&timeZone=UTC')
  );
  if (query.signal !== 'logs') throw new Error('Expected Logs fixture');
  query.logView = encodeLogView({
    version: 1,
    columns: [{ kind: 'time' }, { kind: 'message' }, { kind: 'traceId' }],
    density: 'compact',
    wrap: false
  });
  records = [{ ...buildSavedQueryPayload(query, 'edit-proof', 'Original view', 'Original description'), revision: 2 }];
  const router = renderWorkspace(`${buildExplorePath({ ...query, savedView: 'edit-proof' })}#saved-queries`);
  const rail = await viewsRail();
  fireEvent.click(await within(rail).findByRole('button', { name: i18n.t('exploreSaved.editView') }));
  fireEvent.change(within(rail).getByRole('textbox', { name: i18n.t('exploreSaved.name') }), {
    target: { value: 'Renamed view' }
  });
  fireEvent.change(within(rail).getByRole('textbox', { name: i18n.t('exploreSaved.description') }), {
    target: { value: 'Retained draft' }
  });
  const failure = deferredSavedWrite(),
    retry = deferredSavedWrite();
  api.saveQueryRecord.mockReturnValueOnce(failure.promise).mockReturnValueOnce(retry.promise);
  const save = within(rail).getByRole('button', { name: i18n.t('common.save') });
  const location = router.state.location;
  fireEvent.click(save);
  fireEvent.click(save);
  expect(api.saveQueryRecord).toHaveBeenCalledOnce();
  expect(within(rail).getByRole('textbox', { name: i18n.t('exploreSaved.name') })).toBeDisabled();
  await act(async () => {
    failure.reject(new Error('Synthetic failed edit'));
    await failure.promise.catch(() => undefined);
  });
  await within(rail).findByText(i18n.t('exploreSaved.writeFailed'));
  expect(within(rail).getByRole('textbox', { name: i18n.t('exploreSaved.name') })).toHaveValue('Renamed view');
  expect(within(rail).getByRole('textbox', { name: i18n.t('exploreSaved.description') })).toHaveValue('Retained draft');
  expect(records[0]).toMatchObject({ label: 'Original view', revision: 2 });
  expect(router.state.location).toEqual(location);
  fireEvent.click(save);
  fireEvent.click(save);
  expect(api.saveQueryRecord).toHaveBeenCalledTimes(2);
  const submitted = api.saveQueryRecord.mock.calls[1]![0] as SavedQueryRecord;
  records = [{ ...submitted, revision: 3 }];
  await act(async () => {
    retry.resolve(records[0]!);
    await retry.promise;
  });
  await waitFor(() =>
    expect(within(rail).queryByRole('textbox', { name: i18n.t('exploreSaved.name') })).not.toBeInTheDocument()
  );
  await within(rail).findByRole('button', { name: 'Renamed view' });
  expect(within(rail).getByRole('button', { name: i18n.t('exploreSaved.saveChanges') })).toBeDisabled();
  expect(router.state.location).toEqual(location);
  await act(() => router.navigate('/explore?signal=logs&savedView=edit-proof'));
  await waitFor(() =>
    expect(parseExploreQuery(new URLSearchParams(router.state.location.search))).toMatchObject({
      query: query.query,
      start: 100000,
      end: 200000,
      timeZone: 'UTC',
      logView: query.logView
    })
  );
  const restored = parseExploreQuery(new URLSearchParams(router.state.location.search));
  if (restored.signal !== 'logs') throw new Error('Expected restored Logs view');
  expect(parseLogView(restored.logView!).columns).toEqual([{ kind: 'time' }, { kind: 'message' }, { kind: 'traceId' }]);
});

it('keeps a query applied during a pending save dirty until that newer query is saved', async () => {
  const query = parseExploreQuery(new URLSearchParams('signal=logs&searchSyntax=structured-v1&query=service:original'));
  records = [{ ...buildSavedQueryPayload(query, 'pending-query', 'Pending view', ''), revision: 2 }];
  const router = renderWorkspace(`${buildExplorePath({ ...query, savedView: 'pending-query' })}#saved-queries`);
  const rail = await viewsRail();
  const input = screen.getByRole('combobox', { name: i18n.t('explore.queryLabels.logs') });
  setLogSearchText(input, 'service:first');
  fireEvent.click(screen.getByRole('button', { name: i18n.t('common.query') }));
  const saveChanges = await within(rail).findByRole('button', { name: i18n.t('exploreSaved.saveChanges') });
  await waitFor(() => expect(saveChanges).toBeEnabled());
  const pending = deferredSavedWrite();
  api.saveQueryRecord.mockReturnValueOnce(pending.promise);
  fireEvent.click(saveChanges);
  expect(api.saveQueryRecord).toHaveBeenCalledOnce();
  const first = api.saveQueryRecord.mock.calls[0]![0] as SavedQueryRecord;
  expect(readSavedQuery(first)).toMatchObject({ kind: 'ready', query: { query: 'service:first' } });
  expect(saveChanges).toBeDisabled();
  setLogSearchText(input, 'service:second');
  const apply = screen.getByRole('button', { name: i18n.t('common.query') });
  expect(apply).toBeEnabled();
  fireEvent.click(apply);
  await waitFor(() =>
    expect(parseExploreQuery(new URLSearchParams(router.state.location.search))).toMatchObject({
      query: 'service:second'
    })
  );
  const secondLocation = router.state.location;
  records = [{ ...first, revision: 3 }];
  await act(async () => {
    pending.resolve(records[0]!);
    await pending.promise;
  });
  await waitFor(() => expect(saveChanges).toBeEnabled());
  expect(router.state.location).toEqual(secondLocation);
  expect(logSearchText(input)).toBe('service:second');
  expect(readSavedQuery(records[0]!)).toMatchObject({ kind: 'ready', query: { query: 'service:first' } });
  const secondPending = deferredSavedWrite();
  api.saveQueryRecord.mockReturnValueOnce(secondPending.promise);
  const loadsBeforeSecond = api.loadSavedQueries.mock.calls.filter(([signal]) => signal === 'logs').length;
  fireEvent.click(saveChanges);
  await waitFor(() => expect(api.saveQueryRecord).toHaveBeenCalledTimes(2));
  const second = api.saveQueryRecord.mock.calls[1]![0] as SavedQueryRecord;
  expect(second).toMatchObject({ viewKey: 'pending-query', revision: 3 });
  expect(readSavedQuery(second)).toMatchObject({ kind: 'ready', query: { query: 'service:second' } });
  expect(within(rail).getByRole('button', { name: 'Pending view' })).toBeDisabled();
  records = [{ ...second, revision: 4 }];
  await act(async () => {
    secondPending.resolve(records[0]!);
    await secondPending.promise;
  });
  // Row admission is disabled while busy; editor admission also guards the pending ref.
  await waitFor(() => expect(within(rail).getByRole('button', { name: 'Pending view' })).toBeEnabled());
  await within(rail).findByText('service:second', { exact: true });
  const logLoadIndexes = api.loadSavedQueries.mock.calls.flatMap(([signal], index) =>
    signal === 'logs' ? [index] : []
  );
  expect(logLoadIndexes.length).toBeGreaterThan(loadsBeforeSecond);
  expect(await api.loadSavedQueries.mock.results[logLoadIndexes.at(-1)!]!.value).toEqual([{ ...second, revision: 4 }]);
  await waitFor(() => expect(saveChanges).toBeDisabled());
  fireEvent.click(within(rail).getByRole('button', { name: i18n.t('exploreSaved.editView') }));
  expect(within(rail).getByRole('textbox', { name: i18n.t('exploreSaved.name') })).toBeEnabled();
  fireEvent.click(within(rail).getByRole('button', { name: i18n.t('common.cancel') }));
  expect(api.saveQueryRecord).toHaveBeenCalledTimes(2);
});

function deferredSavedWrite() {
  let resolve!: (record: SavedQueryRecord) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<SavedQueryRecord>((done, fail) => {
    resolve = done;
    reject = fail;
  });
  return { promise, resolve, reject };
}

it('keeps the directory hash through canonicalization and a refreshed route mount', async () => {
  const router = renderWorkspace('/explore#saved-queries');
  await waitFor(() => expect(router.state.location.search).toBe('?signal=metrics&timeRange=last-30m'));
  expect(await screen.findByRole('dialog', { name: i18n.t('exploreSaved.directory') })).toBeVisible();
  const target = router.state.location.pathname + router.state.location.search + router.state.location.hash;
  cleanup();
  router.dispose();
  renderWorkspace(target);
  expect(await screen.findByRole('dialog', { name: i18n.t('exploreSaved.directory') })).toBeVisible();
});

it('does not expose write actions to a guest', async () => {
  records = [buildSavedQueryPayload({ signal: 'logs', timeRange: 'last-30m' }, 'shared', 'Shared', '')];
  renderWorkspace('/explore?signal=logs#saved-queries', ['GUEST']);
  await screen.findByText('Shared');
  expect(screen.queryByRole('button', { name: i18n.t('exploreSaved.save') })).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: i18n.t('common.delete') })).not.toBeInTheDocument();
  expect(api.saveQueryRecord).not.toHaveBeenCalled();
  expect(api.deleteQueryRecord).not.toHaveBeenCalled();
});

it('shows selected-record loading without claiming that the record is unavailable', async () => {
  api.loadSavedQueries.mockImplementation(() => new Promise(() => {}));
  renderWorkspace('/explore?signal=logs&savedView=pending');
  const rail = await viewsRail();
  expect(await within(rail).findByText(i18n.t('exploreSaved.states.loading'))).toBeInTheDocument();
  expect(within(rail).queryByText(i18n.t('exploreSaved.activeUnavailable'))).not.toBeInTheDocument();
  expect(within(rail).getByRole('button', { name: i18n.t('exploreSaved.saveAs') })).toBeDisabled();
});

it('restores a saved subquery from an ID-only deep link', async () => {
  const logSubquery = JSON.stringify(defaultLogSubquery());
  records = [
    buildSavedQueryPayload(
      {
        signal: 'logs',
        timeRange: 'last-1h',
        searchSyntax: 'structured-v1',
        query: 'service:codex-app-server',
        logSubquery
      },
      'subquery-view',
      'Subquery view',
      ''
    )
  ];
  expect(readSavedQuery(records[0]!).kind).toBe('ready');
  const router = renderWorkspace('/explore?signal=logs&timeRange=last-30m&savedView=subquery-view');
  await waitFor(() =>
    expect(parseExploreQuery(new URLSearchParams(router.state.location.search))).toMatchObject({
      timeRange: 'last-1h',
      query: 'service:codex-app-server',
      logSubquery,
      savedView: 'subquery-view'
    })
  );
  expect(await screen.findByRole('group', { name: i18n.t('explore.logSubquery.label') })).toBeInTheDocument();
});

it('blocks an ID-only saved reference join after the feature is retired', async () => {
  const logReferenceJoin = JSON.stringify({
    version: 1,
    tableId: 'owners',
    tableVersion: 4,
    mainField: 'builtin:serviceName',
    operator: 'not_in',
    referenceKey: 'id',
    showColumns: []
  });
  records = [
    {
      signal: 'logs',
      viewKey: 'reference-view',
      label: 'Reference view',
      route: '/explore?signal=logs',
      payload: JSON.stringify({
        version: 1,
        query: {
          signal: 'logs',
          timeRange: 'last-1h',
          searchSyntax: 'structured-v1',
          query: 'service:codex-app-server',
          logReferenceJoin
        }
      })
    }
  ];
  expect(readSavedQuery(records[0]!)).toMatchObject({ kind: 'unavailable', reason: 'retiredReferenceJoin' });
  const router = renderWorkspace('/explore?signal=logs&savedView=reference-view');
  await waitFor(() =>
    expect(parseExploreQuery(new URLSearchParams(router.state.location.search))).toMatchObject({
      logReferenceJoin: 'retired'
    })
  );
  expect((await screen.findAllByText(i18n.t('explore.retiredReferenceJoin'))).length).toBeGreaterThan(0);
  expect(screen.queryByText(i18n.t('explore.handoffInvalid'))).not.toBeInTheDocument();
  expect(api.loadHistory).not.toHaveBeenCalled();
  expect(api.saveQueryRecord).not.toHaveBeenCalled();
});

it('blocks a legacy reference join URL without silently querying all logs', async () => {
  renderWorkspace('/explore?signal=logs&timeRange=last-1h&logReferenceJoin=legacy');
  expect((await screen.findAllByText(i18n.t('explore.retiredReferenceJoin'))).length).toBeGreaterThan(0);
  expect(screen.queryByText(i18n.t('explore.handoffInvalid'))).not.toBeInTheDocument();
  expect(api.loadHistory).not.toHaveBeenCalled();
  expect(within(await viewsRail()).getByRole('button', { name: i18n.t('exploreSaved.saveAs') })).toBeDisabled();
});

it('keeps unconvertible originals inspectable while another signal catalog fails', async () => {
  const original: SavedQueryRecord = {
    id: 4,
    signal: 'logs',
    viewKey: 'legacy-unknown',
    label: 'Legacy original',
    route: '/log/manage?search=timeout&groupBy=severityText',
    querySnapshot: 'Original summary',
    payload: '{"createdAt":1788630000000}',
    updateTime: '2026-09-05T12:00:00Z'
  };
  records = [original];
  api.loadSavedQueries.mockImplementation(signal =>
    signal === 'metrics'
      ? Promise.reject(new Error('Unavailable'))
      : Promise.resolve(records.filter(record => record.signal === signal))
  );
  renderWorkspace('/explore?signal=logs&savedView=legacy-unknown#saved-queries');
  const rail = await viewsRail();
  expect(await within(rail).findByRole('button', { name: 'Legacy original' })).toBeDisabled();
  expect(within(rail).getByText(i18n.t('exploreSaved.reasons.legacyUnsupported'))).toBeVisible();
  expect(within(rail).getByRole('button', { name: i18n.t('exploreSaved.saveChanges') })).toBeDisabled();
  expect(within(rail).getByText(i18n.t('exploreSaved.activeUnavailable'))).toBeInTheDocument();
  fireEvent.click(within(rail).getByRole('button', { name: i18n.t('exploreSaved.inspect') }));
  const originalDialog = screen.getByText(i18n.t('exploreSaved.original')).closest('[role="dialog"]')!;
  expect(originalDialog.querySelector('pre')?.textContent).toBe(JSON.stringify(original, null, 2));
  expect(records).toEqual([original]);
  expect(api.saveQueryRecord).not.toHaveBeenCalled();
  expect(api.deleteQueryRecord).not.toHaveBeenCalled();
});

it.each(['logs', 'traces'] as const)('keeps the saved lifecycle available after reopening focused %s', async signal => {
  const focused = signal === 'logs' ? { logRecordUid: 'record-1' } : { traceId: '1234567890abcdef1234567890abcdef' };
  records = [
    buildSavedQueryPayload(
      { signal, timeRange: 'last-1h', start: 1750000000000, end: 1750000060000, timeZone: 'UTC', ...focused },
      'focused',
      'Focused',
      ''
    )
  ];
  const router = renderWorkspace(`/explore?signal=${signal}#saved-queries`);
  if (signal === 'logs') {
    fireEvent.click(await within(await viewsRail()).findByRole('button', { name: 'Focused' }));
  } else {
    fireEvent.click(await screen.findByRole('button', { name: i18n.t('exploreSaved.open') }));
  }
  await waitFor(() =>
    expect(parseExploreQuery(new URLSearchParams(router.state.location.search))).toMatchObject({
      savedView: 'focused',
      ...focused
    })
  );
  if (signal === 'logs') {
    const trigger = await screen.findByRole('button', { name: 'Focused', expanded: true });
    const rail = within(await viewsRail());
    expect(rail.getByRole('button', { name: i18n.t('exploreSaved.saveChanges') })).toBeDisabled();
    expect(rail.getByRole('button', { name: i18n.t('exploreSaved.saveAs') })).toBeEnabled();
    fireEvent.click(rail.getByRole('button', { name: i18n.t('exploreSaved.editView') }));
    expect(await screen.findByRole('textbox', { name: i18n.t('exploreSaved.name') })).toHaveValue('Focused');
    fireEvent.click(screen.getByRole('button', { name: i18n.t('common.cancel') }));
    fireEvent.click(trigger);
    expect(screen.queryByRole('complementary', { name: i18n.t('exploreSaved.views') })).not.toBeInTheDocument();
  } else {
    const actions = await openQueryActions();
    await waitFor(() =>
      expect(within(actions).getByRole('button', { name: i18n.t('exploreSaved.update') })).toBeEnabled()
    );
    expect(within(actions).getByRole('button', { name: i18n.t('exploreSaved.saveAs') })).toBeEnabled();
    fireEvent.click(within(actions).getByRole('button', { name: i18n.t('exploreSaved.directory') }));
    expect(await screen.findByRole('button', { name: i18n.t('exploreSaved.open') })).toBeEnabled();
  }
});

it('updates the active shared key, saves a separate copy, and deletes only that copy', async () => {
  records = [
    {
      ...buildSavedQueryPayload({ signal: 'metrics', timeRange: 'last-30m', query: 'cpu' }, 'original', 'CPU', ''),
      revision: 0
    }
  ];
  const router = renderWorkspace('/explore?signal=metrics&query=cpu&timeRange=last-30m&savedView=original');
  let menu = await openQueryActions();
  await waitFor(() => expect(within(menu).getByRole('button', { name: i18n.t('exploreSaved.update') })).toBeEnabled());
  fireEvent.keyDown(menu, { key: 'Escape' });
  fireEvent.change(screen.getByRole('textbox', { name: i18n.t('explore.metricComposition.metric', { ref: 'a' }) }), {
    target: { value: 'memory' }
  });
  fireEvent.click(screen.getByRole('button', { name: i18n.t('common.query') }));
  await waitFor(() => expect(router.state.location.search).toContain('query=memory'));
  const appliedLocation = router.state.location.key;
  menu = await openQueryActions();
  fireEvent.click(within(menu).getByRole('button', { name: i18n.t('exploreSaved.update') }));
  fireEvent.change(screen.getByRole('textbox', { name: i18n.t('exploreSaved.description') }), {
    target: { value: ' Updated ' }
  });
  fireEvent.click(within(editorDialog()).getByRole('button', { name: /Save$/ }));
  await waitFor(() => expect(api.saveQueryRecord).toHaveBeenCalledOnce());
  expect(api.saveQueryRecord.mock.calls[0]![0]).toMatchObject({
    viewKey: 'original',
    description: 'Updated',
    revision: 0
  });
  await waitFor(() =>
    expect(screen.queryByRole('textbox', { name: i18n.t('exploreSaved.name') })).not.toBeInTheDocument()
  );
  menu = await openQueryActions();
  await waitFor(() => expect(within(menu).getByRole('button', { name: i18n.t('exploreSaved.saveAs') })).toBeEnabled());
  expect(router.state.location.key).toBe(appliedLocation);
  fireEvent.click(within(menu).getByRole('button', { name: i18n.t('exploreSaved.saveAs') }));
  fireEvent.change(screen.getByRole('textbox', { name: i18n.t('exploreSaved.name') }), {
    target: { value: 'Memory copy' }
  });
  fireEvent.click(within(editorDialog()).getByRole('button', { name: /Save$/ }));
  await waitFor(() => expect(api.saveQueryRecord).toHaveBeenCalledTimes(2));
  const copy = api.saveQueryRecord.mock.calls[1]![0] as SavedQueryRecord;
  expect(copy.viewKey).not.toBe('original');
  expect(copy.label).toBe('Memory copy');
  await waitFor(() =>
    expect(parseExploreQuery(new URLSearchParams(router.state.location.search)).savedView).toBe(copy.viewKey)
  );
  await waitFor(() =>
    expect(screen.queryByRole('textbox', { name: i18n.t('exploreSaved.name') })).not.toBeInTheDocument()
  );
  menu = await openQueryActions();
  await within(menu).findByText(i18n.t('exploreSaved.active', { name: 'Memory copy' }));
  expect(records.find(record => record.viewKey === 'original')?.label).toBe('CPU');
  fireEvent.click(within(menu).getByRole('button', { name: i18n.t('exploreSaved.directory') }));
  const row = (await screen.findByText('Memory copy', { selector: 'strong' })).closest('li')!;
  fireEvent.click(within(row).getByRole('button', { name: i18n.t('common.delete') }));
  fireEvent.click(await screen.findByRole('button', { name: 'OK' }));
  await waitFor(() => expect(api.deleteQueryRecord).toHaveBeenCalledWith('metrics', copy.viewKey, 0));
  expect(records.map(record => record.viewKey)).toEqual(['original']);
});

function renderWorkspace(path: string, roles = ['USER']) {
  const router = createMemoryRouter(
    [
      {
        path: '/explore',
        element: (
          <RouteTimeProvider policy="route_owned" canonicalizeInvalidExact={false}>
            <ExplorePage />
          </RouteTimeProvider>
        )
      }
    ],
    { initialEntries: [path] }
  );
  routers.push(router);
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <SessionContext.Provider
      value={{
        session: { authenticated: true, username: 'operator', roles, workspaceId: 'default', expiresAt: null },
        loading: false,
        retry: () => {}
      }}
    >
      <I18nextProvider i18n={i18n}>
        <QueryClientProvider client={client}>
          <GlobalTimeProvider>
            <ConfigProvider theme={{ token: { motion: false } }}>
              <App>
                <RouterProvider router={router} />
              </App>
            </ConfigProvider>
          </GlobalTimeProvider>
        </QueryClientProvider>
      </I18nextProvider>
    </SessionContext.Provider>
  );
  return router;
}

function editorDialog() {
  return screen.getByRole('textbox', { name: i18n.t('exploreSaved.name') }).closest('[role="dialog"]') as HTMLElement;
}

async function viewsRail() {
  const trigger = document.querySelector<HTMLButtonElement>('[aria-controls="explore-logs-views"]');
  expect(trigger).not.toBeNull();
  if (trigger?.getAttribute('aria-expanded') !== 'true') fireEvent.click(trigger!);
  return screen.findByRole('complementary', { name: i18n.t('exploreSaved.views') });
}

async function openQueryActions() {
  const trigger = document.querySelector('[data-signal-view-trigger]');
  expect(trigger?.tagName).toBe('BUTTON');
  fireEvent.click(trigger!);
  return screen.findByRole('dialog', { name: i18n.t('exploreSaved.queryActions') });
}

it('preserves a Logs metadata draft across Escape directory hash toggles without a write', async () => {
  renderWorkspace('/explore?signal=logs&timeRange=last-30m');
  const rail = await viewsRail();
  fireEvent.click(within(rail).getByRole('button', { name: i18n.t('exploreSaved.saveAs') }));
  fireEvent.change(within(rail).getByRole('textbox', { name: i18n.t('exploreSaved.name') }), {
    target: { value: 'Unsaved view draft' }
  });
  const input = within(rail).getByRole('textbox', { name: i18n.t('exploreSaved.name') });
  fireEvent.keyDown(input, { key: 'Escape' });
  await waitFor(() =>
    expect(screen.queryByRole('complementary', { name: i18n.t('exploreSaved.views') })).not.toBeInTheDocument()
  );
  const trigger = screen.getByRole('button', { name: i18n.t('exploreSaved.myView'), expanded: false });
  expect(trigger).toHaveFocus();
  fireEvent.click(trigger);
  expect(await screen.findByRole('textbox', { name: i18n.t('exploreSaved.name') })).toHaveValue('Unsaved view draft');
  expect(api.saveQueryRecord).not.toHaveBeenCalled();
});
