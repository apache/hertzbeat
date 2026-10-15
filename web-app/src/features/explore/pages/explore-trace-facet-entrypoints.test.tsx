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
import type { ReactNode } from 'react';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';
import { afterEach, beforeAll, expect, it, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { I18nextProvider } from 'react-i18next';
import { i18n, initializeI18n, loadLocale } from '@/core/i18n/i18n';
import { useTraceAnalytics } from '../controller/use-trace-analytics';
import { draftFromQuery } from '../model/explore-submission-model';
import type { TraceExploreQuery } from '../model/explore-query';
import type { useExplorePageController } from '../controller/use-explore-page-controller';
import { ExploreWorkspaceTraceFacets } from './explore-workspace-trace-facets';
import { ExploreTraceWorkspaceResults } from './explore-trace-workspace-results';

vi.mock('antd', () => ({
  Select: ({
    options,
    onChange,
    value,
    ...props
  }: {
    options: { value: string; label: string }[];
    onChange: (value: string) => void;
    value: string;
    disabled?: boolean;
    'aria-label': string;
  }) => (
    <select
      disabled={props.disabled}
      aria-label={props['aria-label']}
      value={value}
      onChange={event => onChange(event.target.value)}
    >
      {options.map(option => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  ),
  Segmented: ({
    options,
    onChange,
    value,
    ...props
  }: {
    options: { value: string; label: string }[];
    onChange: (value: string) => void;
    value: string;
    disabled?: boolean;
    'aria-label': string;
  }) => (
    <select
      disabled={props.disabled}
      aria-label={props['aria-label']}
      value={value}
      onChange={event => onChange(event.target.value)}
    >
      {options.map(option => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  )
}));
vi.mock('../components/explore-trace-facets', () => ({
  ExploreTraceFacets: ({
    controls,
    action
  }: {
    controls: ReactNode;
    action: (value: string) => { run: () => void };
  }) => (
    <>
      {controls}
      <button onClick={() => action('checkout').run()}>Sidebar checkout</button>
    </>
  )
}));
vi.mock('../components/explore-trace-groups', () => ({
  ExploreTraceGroups: ({ onGroup }: { onGroup?: (value: string) => void }) => (
    <button onClick={() => onGroup?.('payment')}>Result payment</button>
  )
}));
vi.mock('../components/explore-trace-histogram', () => ({ ExploreTraceHistogram: () => null }));
vi.mock('../components/explore-trace-columns', () => ({ ExploreTraceColumns: () => null }));
vi.mock('../api/explore-trace-analytics-api', async importOriginal => ({
  ...(await importOriginal<typeof import('../api/explore-trace-analytics-api')>()),
  loadTraceAnalytics: vi.fn(() => Promise.resolve({}))
}));
beforeAll(async () => {
  await initializeI18n();
  await loadLocale('en-US');
});
afterEach(cleanup);

function Fixture({ initial = '' }: { initial?: string }) {
  const [query, setQuery] = useState<TraceExploreQuery>({
    signal: 'traces',
    timeRange: 'last-30m',
    start: 1000,
    end: 2000,
    resourceFilter: initial
  });
  const [draft, setDraft] = useState(() => draftFromQuery(query));
  const result = { kind: 'ready' as const };
  const analytics = useTraceAnalytics(
    query,
    result as Parameters<typeof useTraceAnalytics>[1],
    traceView => setQuery(value => ({ ...value, traceView })),
    draft
  );
  // Partial fixture isolates two actual page entry points; native smoke covers the full controller.
  const controller = {
    query,
    result,
    submission: {
      draft,
      updateField: ({ field, value }: { field: string; value: string }) =>
        setDraft(previous => ({ ...previous, [field]: value }))
    }
  } as unknown as ReturnType<typeof useExplorePageController>;
  return (
    <>
      <ExploreWorkspaceTraceFacets controller={controller} analytics={analytics} />
      <ExploreTraceWorkspaceResults controller={controller} analytics={analytics}>
        <span>List</span>
      </ExploreTraceWorkspaceResults>
      <output aria-label="Filter draft">{draft.signal === 'traces' ? draft.resourceFilter : ''}</output>
      <button
        onClick={() => {
          const restored = { ...query, resourceFilter: 'service.name NOT IN ("historical")' };
          setQuery(restored);
          setDraft(draftFromQuery(restored));
        }}
      >
        Restore history
      </button>
    </>
  );
}
function setup(initial = '') {
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <I18nextProvider i18n={i18n}>
        <Fixture initial={initial} />
      </I18nextProvider>
    </QueryClientProvider>
  );
}
function mode(value: string) {
  fireEvent.change(screen.getByRole('combobox', { name: 'Facet match mode' }), { target: { value } });
}
function groups() {
  fireEvent.change(screen.getByRole('combobox', { name: 'View' }), { target: { value: 'groups' } });
}
function filter() {
  return screen.getByLabelText('Filter draft').textContent;
}
it('uses the empty sidebar exclusion mode for the first result value and the next sidebar value', async () => {
  setup();
  await waitFor(() => expect(screen.getByRole('combobox', { name: 'Facet match mode' })).toBeEnabled());
  mode('exclude');
  groups();
  fireEvent.click(screen.getByText('Result payment'));
  expect(filter()).toBe('service.name NOT IN ("payment")');
  fireEvent.click(screen.getByText('Sidebar checkout'));
  expect(filter()).toBe('service.name NOT IN ("payment", "checkout")');
});
it('preserves empty exclusion across list/groups and restores saved mode after history', async () => {
  setup();
  await waitFor(() => expect(screen.getByRole('combobox', { name: 'Facet match mode' })).toBeEnabled());
  mode('exclude');
  groups();
  fireEvent.change(screen.getByRole('combobox', { name: 'View' }), { target: { value: 'list' } });
  groups();
  fireEvent.click(screen.getByText('Result payment'));
  expect(filter()).toBe('service.name NOT IN ("payment")');
  fireEvent.click(screen.getByText('Restore history'));
  expect(screen.getByRole('combobox', { name: 'Facet match mode' })).toHaveValue('exclude');
  fireEvent.click(screen.getByText('Result payment'));
  expect(filter()).toBe('service.name NOT IN ("historical", "payment")');
});
it('uses the existing group mode at both entrances and resets to include after clear', async () => {
  setup('service.name NOT IN ("existing")');
  await waitFor(() => expect(screen.getByRole('combobox', { name: 'Facet match mode' })).toBeEnabled());
  groups();
  fireEvent.click(screen.getByText('Result payment'));
  expect(filter()).toBe('service.name NOT IN ("existing", "payment")');
  fireEvent.click(screen.getByRole('button', { name: 'Clear Service group' }));
  expect(filter()).toBe('');
  expect(screen.getByRole('combobox', { name: 'Facet match mode' })).toHaveValue('include');
  fireEvent.click(screen.getByText('Result payment'));
  expect(filter()).toBe('service.name IN ("payment")');
});
