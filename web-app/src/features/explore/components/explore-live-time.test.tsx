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

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import type { ComponentProps, ReactNode } from 'react';
import { afterEach, beforeAll, beforeEach, expect, it, vi } from 'vitest';
import { i18n, initializeI18n, loadLocale } from '@/core/i18n/i18n';
import { draftFromQuery } from '../model/explore-submission-model';
import { ExploreLogsHeader } from '../pages/explore-logs-workspace';

vi.mock('../pages/explore-actions', () => ({ ExploreActions: () => null }));

beforeAll(async () => {
  await initializeI18n();
  await loadLocale('en-US');
});
let client: QueryClient;
beforeEach(() => {
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
});
afterEach(() => {
  cleanup();
  client.clear();
});
function Wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

it('omits redundant incoming scope in the real Logs header without changing the historical return window', () => {
  const query = {
    signal: 'logs' as const,
    timeRange: 'last-30m' as const,
    start: 1750000000000,
    end: 1750000010000,
    timeZone: 'UTC',
    live: true
  };
  const updateQuery = vi.fn();
  const controller = {
    query,
    submission: { draft: draftFromQuery(query) },
    updateQuery
  } as unknown as ComponentProps<typeof ExploreLogsHeader>['controller'];
  const view = render(<ExploreLogsHeader controller={controller} t={i18n.t} />, { wrapper: Wrapper });
  expect(screen.queryByText(i18n.t('explore.liveFlow.incoming'))).not.toBeInTheDocument();
  expect(screen.queryByRole('textbox', { name: i18n.t('explore.timeRange') })).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: i18n.t('common.refresh') })).toBeDisabled();

  view.rerender(<ExploreLogsHeader controller={{ ...controller, query: { ...query, live: false } }} t={i18n.t} />);
  expect(screen.queryByText(i18n.t('explore.liveFlow.incoming'))).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: i18n.t('common.refresh') })).toBeEnabled();
  expect(
    screen
      .getAllByRole('textbox', { name: i18n.t('explore.timeRange') })
      .map(input => (input as HTMLInputElement).value)
  ).toEqual(['2025-06-15 15:06:40', '2025-06-15 15:06:50']);
  expect(updateQuery).not.toHaveBeenCalled();
  expect(query.start).toBe(1750000000000);
  expect(query.end).toBe(1750000010000);
});

it('places a text refresh action after History and Live without changing query scope', () => {
  const query = { signal: 'logs' as const, timeRange: 'last-30m' as const };
  const refresh = vi.fn().mockResolvedValue(undefined);
  const updateQuery = vi.fn();
  const controller = {
    query,
    submission: { draft: draftFromQuery(query) },
    refresh,
    updateQuery
  } as unknown as ComponentProps<typeof ExploreLogsHeader>['controller'];
  render(<ExploreLogsHeader controller={controller} t={i18n.t} />, { wrapper: Wrapper });
  const live = screen.getByRole('radio', { name: i18n.t('exploreLog.live') });
  const button = screen.getByRole('button', { name: i18n.t('common.refresh') });
  expect(button).toHaveTextContent(i18n.t('common.refresh'));
  expect(live.compareDocumentPosition(button) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  fireEvent.click(button);
  expect(refresh).toHaveBeenCalledOnce();
  expect(updateQuery).not.toHaveBeenCalled();
});
