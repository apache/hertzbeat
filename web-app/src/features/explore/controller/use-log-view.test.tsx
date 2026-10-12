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

import { act, cleanup, renderHook } from '@testing-library/react';
import { MemoryRouter, useNavigate, useSearchParams } from 'react-router-dom';
import type { ReactNode } from 'react';
import { afterEach, expect, it, vi } from 'vitest';
import { buildExplorePath, mergeExploreQuery, parseExploreQuery } from '../model/explore-model';
import { useExploreSubmission } from './use-explore-submission';
import { useLogView } from './use-log-view';
import { parseLogView } from '@/platform/perses';
import { SessionContext } from '@/core/auth/session-context';
import type { UiSession } from '@/core/auth/session-api';
import type { LogColumn } from '../model/explore-log-columns';
import { exploreLogPreferenceKey } from '../model/explore-log-display-preferences';
const scope = { username: 'alice', workspaceId: 'workspace-one' };
const session: UiSession = {
  authenticated: true,
  ...scope,
  roles: [],
  expiresAt: null
};
const authWrapper = ({ children }: { children: ReactNode }) => (
  <SessionContext.Provider value={{ session, loading: false, retry: () => undefined }}>
    {children}
  </SessionContext.Provider>
);
function useHarness(availableColumns: LogColumn[] = []) {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const query = parseExploreQuery(params);
  if (query.signal !== 'logs') throw new Error('wrong fixture');
  const submit = useExploreSubmission(query, patch => void navigate(buildExplorePath(mergeExploreQuery(query, patch))));
  const display = useLogView(
    query,
    logView => void navigate(buildExplorePath(mergeExploreQuery(query, { logView }))),
    availableColumns
  );
  return { submit, display, query };
}
afterEach(cleanup);
it('shows an observed host field in new log views without inventing it when unavailable', () => {
  const wrapper = ({ children }: { children: ReactNode }) => (
    <MemoryRouter initialEntries={['/explore?signal=logs&timeRange=last-30m']}>{children}</MemoryRouter>
  );
  const host: LogColumn = { kind: 'field', scope: 'resource', path: ['host.name'] };
  const withHost = renderHook(() => useHarness([host]), { wrapper });
  expect(withHost.result.current.display.logColumns.columns).toContainEqual(host);
  withHost.unmount();
  const withoutHost = renderHook(({ columns }: { columns: LogColumn[] }) => useHarness(columns), {
    wrapper,
    initialProps: { columns: [] as LogColumn[] }
  });
  expect(withoutHost.result.current.display.logColumns.columns).not.toContainEqual(host);
  withoutHost.rerender({ columns: [host] });
  expect(withoutHost.result.current.display.logColumns.columns).toContainEqual(host);
});
it('column navigation retains pending filters and encoded view across rerenders', () => {
  const wrapper = ({ children }: { children: ReactNode }) => (
    <MemoryRouter initialEntries={['/explore?signal=logs&timeRange=last-30m&serviceName=checkout']}>
      {children}
    </MemoryRouter>
  );
  const hook = renderHook(useHarness, { wrapper });
  act(() => hook.result.current.submit.updateField({ field: 'query', value: 'pending error' }));
  act(() => hook.result.current.display.logColumns.onColumnsChange([{ kind: 'message' }, { kind: 'traceId' }]));
  expect(hook.result.current.submit.draft.query).toBe('pending error');
  expect(hook.result.current.query.query).toBeUndefined();
  expect(hook.result.current.query.serviceName).toBe('checkout');
  expect(hook.result.current.display.logColumns.columns).toEqual([{ kind: 'message' }, { kind: 'traceId' }]);
  hook.rerender();
  expect(hook.result.current.display.invalid).toBe(false);
});
it('preserves malformed view until an explicit reset and rejects removing the message', () => {
  const wrapper = ({ children }: { children: ReactNode }) => (
    <MemoryRouter initialEntries={['/explore?signal=logs&timeRange=last-30m&logView=invalid']}>{children}</MemoryRouter>
  );
  const hook = renderHook(useHarness, { wrapper });
  expect(hook.result.current.display.invalid).toBe(true);
  expect(hook.result.current.query.logView).toBe('invalid');
  act(() => hook.result.current.display.logColumns.onColumnsChange([{ kind: 'time' }]));
  expect(hook.result.current.query.logView).toBe('invalid');
  expect(hook.result.current.display.rejected).toBe(true);
  act(() => {
    hook.result.current.display.reset();
  });
  expect(hook.result.current.display.invalid).toBe(false);
  expect(hook.result.current.display.rejected).toBe(false);
});

it('keeps old non-wrapping URLs on one line and persists explicit display preferences', () => {
  localStorage.clear();
  const legacy = JSON.stringify({
    version: 1,
    columns: [{ kind: 'time' }, { kind: 'message' }],
    density: 'comfortable',
    wrap: false
  });
  const query = parseExploreQuery(new URLSearchParams({ signal: 'logs', timeRange: 'last-30m', logView: legacy }));
  if (query.signal !== 'logs') throw new Error('wrong fixture');
  const onChange = vi.fn<(encoded: string) => void>();
  const hook = renderHook(() => useLogView(query, onChange), { wrapper: authWrapper });
  expect(hook.result.current.preferences).toMatchObject({
    rowHeight: 'small',
    contentDisplay: 'message',
    showContent: true,
    standardizeHeaders: true,
    showTimeline: true
  });
  act(() =>
    hook.result.current.onPreferencesChange({
      ...hook.result.current.preferences,
      rowHeight: 'large',
      contentDisplay: 'attributes',
      showContent: false,
      showTime: false,
      standardizeHeaders: false,
      showTimeline: false
    })
  );
  expect(onChange).toHaveBeenCalledOnce();
  expect(parseLogView(onChange.mock.calls[0]![0])).toMatchObject({
    rowHeight: 'large',
    contentDisplay: 'attributes',
    showContent: false,
    standardizeHeaders: false,
    showTimeline: false
  });
  expect(JSON.parse(localStorage.getItem(exploreLogPreferenceKey('display', scope))!)).toMatchObject({
    density: 'comfortable',
    wrap: true,
    rowHeight: 'large',
    contentDisplay: 'attributes',
    showContent: false
  });
});

it('restores and updates ordered columns through the authenticated preference key', () => {
  const key = exploreLogPreferenceKey('display', scope);
  localStorage.setItem(
    key,
    JSON.stringify({
      density: 'compact',
      wrap: false,
      showTime: true,
      columnOrder: [{ kind: 'message' }, { kind: 'field', scope: 'attributes', path: ['http.route'] }, { kind: 'time' }]
    })
  );
  const query = parseExploreQuery(new URLSearchParams({ signal: 'logs', timeRange: 'last-30m' }));
  if (query.signal !== 'logs') throw new Error('wrong fixture');
  const hook = renderHook(() => useLogView(query, vi.fn()), { wrapper: authWrapper });
  expect(hook.result.current.logColumns.columns).toEqual([
    { kind: 'message' },
    { kind: 'field', scope: 'attributes', path: ['http.route'] },
    { kind: 'time' }
  ]);

  const changed = [{ kind: 'time' }, { kind: 'message' }, { kind: 'severity' }] as const;
  act(() => hook.result.current.logColumns.onColumnsChange([...changed]));
  expect(JSON.parse(localStorage.getItem(key)!)).toMatchObject({ columnOrder: changed });
});

it('switches display defaults with the authenticated identity while the URL view keeps precedence', () => {
  const aliceKey = exploreLogPreferenceKey('display', scope);
  localStorage.setItem(
    aliceKey,
    JSON.stringify({
      density: 'compact',
      wrap: false,
      showTime: true,
      columnOrder: [{ kind: 'time' }, { kind: 'message' }]
    })
  );
  let activeSession: UiSession = session;
  const wrapper = ({ children }: { children: ReactNode }) => (
    <SessionContext.Provider value={{ session: activeSession, loading: false, retry: () => undefined }}>
      {children}
    </SessionContext.Provider>
  );
  const query = parseExploreQuery(new URLSearchParams({ signal: 'logs', timeRange: 'last-30m' }));
  if (query.signal !== 'logs') throw new Error('wrong fixture');
  const hook = renderHook(() => useLogView(query, vi.fn()), { wrapper });
  expect(hook.result.current.logColumns.columns).toEqual([{ kind: 'time' }, { kind: 'message' }]);

  activeSession = { ...session, username: 'bob' };
  hook.rerender();
  expect(hook.result.current.logColumns.columns).toEqual([
    { kind: 'time' },
    { kind: 'severity' },
    { kind: 'service' },
    { kind: 'message' }
  ]);

  const routeView = JSON.stringify({
    version: 1,
    columns: [{ kind: 'message' }],
    density: 'compact',
    wrap: false,
    rowHeight: 'small'
  });
  const routeQuery = parseExploreQuery(
    new URLSearchParams({ signal: 'logs', timeRange: 'last-30m', logView: routeView })
  );
  if (routeQuery.signal !== 'logs') throw new Error('wrong fixture');
  const routed = renderHook(() => useLogView(routeQuery, vi.fn()), { wrapper });
  expect(routed.result.current.logColumns.columns).toEqual([{ kind: 'message' }]);
});

it('keeps the last accepted personal column order when a rejected URL view is submitted', () => {
  const saved = {
    density: 'compact',
    wrap: false,
    showTime: true,
    columnOrder: [{ kind: 'time' }, { kind: 'message' }]
  };
  const key = exploreLogPreferenceKey('display', scope);
  localStorage.setItem(key, JSON.stringify(saved));
  const query = parseExploreQuery(new URLSearchParams({ signal: 'logs', timeRange: 'last-30m' }));
  if (query.signal !== 'logs') throw new Error('wrong fixture');
  const onChange = vi.fn();
  const hook = renderHook(() => useLogView(query, onChange), { wrapper: authWrapper });
  const invalidColumns: LogColumn[] = [
    { kind: 'message' },
    ...Array.from({ length: 8 }, (_, index) => ({
      kind: 'field' as const,
      scope: 'resource' as const,
      path: [`field${index}`]
    }))
  ];

  act(() => hook.result.current.logColumns.onColumnsChange(invalidColumns));

  expect(hook.result.current.rejected).toBe(true);
  expect(onChange).not.toHaveBeenCalled();
  expect(JSON.parse(localStorage.getItem(key)!)).toMatchObject(saved);
});

it.each([false, true])('normalizes optional preferences in legacy views without changing columns (wrap=%s)', wrap => {
  localStorage.clear();
  const columns: LogColumn[] = [{ kind: 'traceId' }, { kind: 'message' }];
  const query = parseExploreQuery(
    new URLSearchParams({
      signal: 'logs',
      timeRange: 'last-30m',
      logView: JSON.stringify({ version: 1, columns, density: 'comfortable', wrap })
    })
  );
  if (query.signal !== 'logs') throw new Error('wrong fixture');
  const onChange = vi.fn<(encoded: string) => void>();
  const hook = renderHook(() => useLogView(query, onChange), { wrapper: authWrapper });
  expect(hook.result.current.preferences).toEqual({
    density: 'comfortable',
    wrap,
    showTime: false,
    rowHeight: wrap ? 'large' : 'small',
    contentDisplay: 'message',
    showContent: true,
    standardizeHeaders: true,
    showTimeline: true,
    columnOrder: columns
  });
  expect(hook.result.current.preferences.columnOrder).toBe(hook.result.current.logColumns.columns);
  expect(onChange).not.toHaveBeenCalled();
  expect(localStorage.getItem(exploreLogPreferenceKey('display', scope))).toBeNull();
  act(() => hook.result.current.onPreferencesChange({ density: 'comfortable', wrap: false, showTime: true }));
  expect(parseLogView(onChange.mock.calls[0]![0])).toEqual({
    version: 1,
    density: 'compact',
    wrap: false,
    rowHeight: 'small',
    contentDisplay: 'message',
    showContent: true,
    standardizeHeaders: true,
    showTimeline: true,
    columns: [{ kind: 'time' }, ...columns]
  });
  expect(JSON.parse(localStorage.getItem(exploreLogPreferenceKey('display', scope))!)).toEqual({
    density: 'compact',
    wrap: false,
    showTime: true,
    rowHeight: 'small',
    contentDisplay: 'message',
    showContent: true,
    standardizeHeaders: true,
    showTimeline: true,
    columnOrder: [{ kind: 'time' }, ...columns]
  });
});
