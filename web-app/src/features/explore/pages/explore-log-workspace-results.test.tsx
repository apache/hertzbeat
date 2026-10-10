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

import { draftFromQuery } from '../model/explore-submission-model';
/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import type { TFunction } from 'i18next';
import type { useExplorePageController } from '../controller/use-explore-page-controller';
import { DEFAULT_LOG_ANALYSIS, encodeLogAnalysis } from '@/platform/perses';
import { ExploreLogWorkspaceResults } from './explore-log-workspace-results';
const load = vi.hoisted(() =>
  vi.fn<(...args: unknown[]) => unknown>(() => ({ state: 'ready', data: undefined, retry: vi.fn() }))
);
vi.mock('../controller/use-log-analysis', () => ({ useLogAnalysis: load }));
vi.mock('../controller/use-log-comparison', () => ({
  useLogComparison: () => ({ state: 'idle', data: undefined, retry: vi.fn() })
}));
vi.mock('../controller/use-log-query-set', () => ({
  useLogQuerySet: () => ({ state: 'idle', data: undefined, retry: vi.fn() })
}));
vi.mock('../controller/use-log-facets', () => ({
  useLogFacets: () => ({ fields: { state: 'ready', data: { fields: [] } } })
}));
vi.mock('../components/explore-log-analysis-result', () => ({
  ExploreLogAnalysisResult: ({
    representation,
    onTimeWindowChange,
    onUseAuto
  }: {
    representation: string;
    onUseAuto?: () => void;
    onTimeWindowChange?: (window: { from: number; to: number }) => void;
  }) => (
    <>
      <output>{representation}</output>
      <button onClick={onUseAuto}>Use Auto</button>
      <button disabled={!onTimeWindowChange} onClick={() => onTimeWindowChange?.({ from: 1200, to: 2200 })}>
        Select interval
      </button>
      <button onClick={() => onTimeWindowChange?.({ from: 500, to: 3500 })}>Outside interval</button>
    </>
  )
}));
vi.mock('../components/explore-log-comparison-result', () => ({
  ExploreLogComparisonResult: ({ onUseAuto }: { onUseAuto?: () => void }) => (
    <button onClick={onUseAuto}>Use Auto</button>
  )
}));
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});
const t = ((key: string) => key) as TFunction;
function controller(applied?: string, draft = applied, live = false) {
  const query = {
    signal: 'logs' as const,
    timeRange: 'last-30m' as const,
    start: 1000,
    end: 3000,
    logAnalysis: applied,
    live
  };
  return {
    query,
    submission: {
      draft: { ...draftFromQuery(query), logAnalysis: draft, query: 'pending search' },
      updateField: vi.fn(),
      applyLogPatch: vi.fn(),
      submit: vi.fn(),
      errors: {}
    },
    result: { kind: 'ready', signal: 'logs', window: { from: 1000, to: 3000 } }
  } as unknown as ReturnType<typeof useExplorePageController>;
}
it('keeps applied logs visible while a different analysis representation is only a draft', () => {
  const draft = encodeLogAnalysis({ ...DEFAULT_LOG_ANALYSIS, representation: 'toplist' });
  const subject = controller(undefined, draft);
  render(
    <ExploreLogWorkspaceResults controller={subject} t={t}>
      Applied logs
    </ExploreLogWorkspaceResults>
  );
  expect(screen.getByText('Applied logs')).toBeInTheDocument();
  expect(screen.queryByText('toplist')).not.toBeInTheDocument();
  expect(subject.submission.draft).toMatchObject({ logAnalysis: draft });
  expect(subject.submission.updateField).not.toHaveBeenCalled();
});
it('renders committed analysis but suppresses invalid applied descriptors', () => {
  const applied = encodeLogAnalysis({ ...DEFAULT_LOG_ANALYSIS, representation: 'toplist' });
  const { rerender } = render(
    <ExploreLogWorkspaceResults controller={controller(applied)} t={t}>
      Applied logs
    </ExploreLogWorkspaceResults>
  );
  expect(screen.getByText('toplist')).toBeInTheDocument();
  expect(screen.queryByText('Applied logs')).not.toBeInTheDocument();
  rerender(
    <ExploreLogWorkspaceResults controller={controller('{broken')} t={t}>
      Applied logs
    </ExploreLogWorkspaceResults>
  );
  expect(screen.queryByText('toplist')).not.toBeInTheDocument();
  expect(screen.queryByText('Applied logs')).not.toBeInTheDocument();
  expect(load.mock.calls.at(-1)?.[3]).toBe(false);
});
it('keeps live delivery independent from historical analysis', () => {
  render(
    <ExploreLogWorkspaceResults controller={controller(undefined, undefined, true)} t={t}>
      Live logs
    </ExploreLogWorkspaceResults>
  );
  expect(screen.getByText('Live logs')).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'explore.logAnalysis.toplist' })).not.toBeInTheDocument();
});

it('bounds time selection to applied evidence and disables it for a changed draft', () => {
  const subject = controller(encodeLogAnalysis({ ...DEFAULT_LOG_ANALYSIS, representation: 'timeseries' }));
  subject.submission.draft = draftFromQuery(subject.query);
  subject.updateQuery = vi.fn();
  const { rerender } = render(
    <ExploreLogWorkspaceResults controller={subject} t={t}>
      Logs
    </ExploreLogWorkspaceResults>
  );
  fireEvent.click(screen.getByRole('button', { name: 'Outside interval' }));
  expect(subject.updateQuery).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Select interval' }));
  expect(subject.updateQuery).toHaveBeenCalledWith({
    start: 1200,
    end: 2200,
    windowMode: undefined,
    pageIndex: undefined,
    autoRefreshMs: undefined
  });
  subject.submission.draft = { ...subject.submission.draft, query: 'unapplied' };
  rerender(
    <ExploreLogWorkspaceResults controller={subject} t={t}>
      Logs
    </ExploreLogWorkspaceResults>
  );
  expect(screen.getByRole('button', { name: 'Select interval' })).toBeDisabled();
});

it.each([false, true])('applies automatic interval and queries applied analysis (comparison=%s)', compared => {
  const applied = {
    ...DEFAULT_LOG_ANALYSIS,
    representation: 'timeseries' as const,
    intervalMs: 1000,
    ...(compared ? { comparison: { version: 1 as const, search: 'status:error' } } : {})
  };
  const dirtyDraft = encodeLogAnalysis({ ...applied, limit: 10 });
  const subject = controller(encodeLogAnalysis(applied), dirtyDraft);
  render(
    <ExploreLogWorkspaceResults controller={subject} t={t}>
      Logs
    </ExploreLogWorkspaceResults>
  );
  fireEvent.click(screen.getByRole('button', { name: 'Use Auto' }));
  const [recoveryPatch] = vi.mocked(subject.submission.applyLogPatch).mock.calls[0]!;
  expect(JSON.parse(recoveryPatch.logAnalysis as string)).toEqual({ ...applied, intervalMs: undefined });
  expect(subject.submission.submit).not.toHaveBeenCalled();
  expect(subject.submission.updateField).not.toHaveBeenCalled();
  expect(subject.submission.draft).toMatchObject({ query: 'pending search', logAnalysis: dirtyDraft });
  expect(load.mock.calls.at(-1)?.[1]).toEqual(applied);
});
