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

import { I18nextProvider } from 'react-i18next';
import type { ReactNode } from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeAll, expect, it, vi } from 'vitest';
import { i18n, initializeI18n, loadLocale } from '@/core/i18n/i18n';
import { draftFromQuery } from '../model/explore-submission-model';
import { DEFAULT_TRACE_VIEW, encodeTraceView } from '../model/explore-trace-view';
import { ExploreGuidedFilters } from './explore-advanced-filters';
import { ExploreTraceHistogram } from './explore-trace-histogram';
vi.mock('@/platform/perses', async original => ({
  ...(await original<typeof import('@/platform/perses')>()),
  HertzBeatMetricTimeSeriesResult: () => null
}));
beforeAll(async () => {
  await initializeI18n();
  await loadLocale('en-US');
});
afterEach(cleanup);
function wrapper({ children }: { children: ReactNode }) {
  return <I18nextProvider i18n={i18n}>{children}</I18nextProvider>;
}
it('labels ordering and errors from the applied population while preserving draft values', () => {
  const draft = draftFromQuery({ signal: 'traces', timeRange: 'last-30m', sort: 'duration_desc', errorOnly: true });
  const props = { draft, errors: {}, updateField: vi.fn(), t: i18n.t };
  const view = render(
    <ExploreGuidedFilters
      {...props}
      appliedTraceView={encodeTraceView({ ...DEFAULT_TRACE_VIEW, population: 'matched_spans' })}
    />
  );
  expect(screen.getByText('Span duration, longest first')).toBeInTheDocument();
  expect(screen.getByRole('checkbox', { name: 'Error spans only' })).toBeChecked();
  view.rerender(<ExploreGuidedFilters {...props} appliedTraceView={encodeTraceView(DEFAULT_TRACE_VIEW)} />);
  expect(screen.getByText('Root duration, longest first')).toBeInTheDocument();
  expect(screen.getByRole('checkbox', { name: 'Error traces only' })).toBeChecked();
  expect(props.updateField).not.toHaveBeenCalled();
});
it('explains matching-trace bucket attribution only for trace population', () => {
  const data = {
    state: 'ready' as const,
    population: 'matched_traces' as const,
    window: { start: 1000, end: 2000, endExclusive: false },
    coverage: { mode: 'window' as const, rowLimit: null, scannedRows: null, truncated: false },
    data: {
      totalCount: 1,
      errorCount: 0,
      intervalMs: 1000,
      buckets: [{ start: 1000, end: 2000, endExclusive: false, count: 1, errorCount: 0 }]
    }
  };
  const props = { retry: vi.fn(), onWindowChange: vi.fn() };
  const view = render(<ExploreTraceHistogram {...props} load={{ state: 'ready', data }} />, { wrapper });
  const hint =
    'Each trace is counted at its first matching span in this window. A narrower window may match the trace again through another span.';
  expect(screen.getByText(hint)).toBeInTheDocument();
  view.rerender(
    <ExploreTraceHistogram {...props} load={{ state: 'ready', data: { ...data, population: 'matched_spans' } }} />
  );
  expect(screen.queryByText(hint)).not.toBeInTheDocument();
});
