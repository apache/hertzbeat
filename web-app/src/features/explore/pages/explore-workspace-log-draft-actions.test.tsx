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

import { cleanup, render } from '@testing-library/react';
import type { ComponentProps } from 'react';
import type { TFunction } from 'i18next';
import { afterEach, expect, it, vi } from 'vitest';
import { draftFromQuery } from '../model/explore-submission-model';
import type { LogExploreQuery } from '../model/explore-query';
import { ExploreWorkspaceResults } from './explore-workspace-results';

const captures = vi.hoisted(() => ({ result: vi.fn() }));
vi.mock('../controller/use-metric-inventory', () => ({ useMetricInventory: () => ({}) }));
vi.mock('./explore-log-workspace-results', () => ({
  ExploreLogWorkspaceResults: ({ children }: { children: React.ReactNode }) => children
}));
vi.mock('./explore-result-panel', () => ({
  ExploreResultPanel: (props: unknown) => {
    captures.result(props);
    return null;
  }
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

function controller(kind: 'ready' | 'live' = 'ready') {
  const query: LogExploreQuery = {
    signal: 'logs',
    timeRange: 'last-30m',
    query: 'service:orders',
    searchSyntax: 'structured-v1',
    entityId: 'entity-1'
  };
  const draft = draftFromQuery(query);
  if (draft.signal !== 'logs') throw new Error('Expected logs draft');
  draft.query = 'service:orders audit_pending_probe';
  const submitted = vi.fn();
  const updateField = vi.fn(({ field, value }: { field: keyof typeof draft; value: unknown }) => {
    Object.assign(draft, { [field]: value });
  });
  const applyLogPatch = vi.fn();
  const value = {
    query,
    result: { kind },
    submission: {
      draft,
      updateField,
      submit: () => {
        submitted({ ...draft });
      },
      applyLogPatch
    },
    refresh: vi.fn(),
    openPath: vi.fn(),
    updateQuery: vi.fn()
  } as unknown as ComponentProps<typeof ExploreWorkspaceResults>['controller'];
  return { value, submitted, updateField, applyLogPatch };
}

it.each(['ready', 'live'] as const)('submits pending search with inspector include and exclude in %s logs', kind => {
  const state = controller(kind);
  render(
    <ExploreWorkspaceResults
      controller={state.value}
      t={((key: string) => key) as TFunction}
      inspectorAnalysis={{ controls: {} } as never}
    />
  );
  const props = captures.result.mock.lastCall![0] as ComponentProps<
    typeof import('./explore-result-panel').ExploreResultPanel
  >;
  expect(props.onAddLogFilter?.({ scope: 'attribute', key: 'http.status_code', value: '500' }, '=')).toBe(true);
  expect(props.onAddLogFilter?.({ scope: 'attribute', key: 'region', value: 'east' }, '!=')).toBe(true);
  expect(state.submitted).toHaveBeenCalledTimes(2);
  expect(state.submitted.mock.lastCall![0].query).toContain('audit_pending_probe');
  expect(state.submitted.mock.lastCall![0].query).toContain('@http.status_code:"500"');
  expect(state.submitted.mock.lastCall![0].query).toContain('-@region:"east"');
  expect(state.applyLogPatch).not.toHaveBeenCalled();
  expect(props.onAddLogFilter?.({ scope: 'resource', key: 'hertzbeat.entity_id', value: 'other' }, '=')).toBe(false);
  expect(state.submitted).toHaveBeenCalledTimes(2);
});

it('replaces editable search without dropping entity and time context', () => {
  const state = controller();
  render(
    <ExploreWorkspaceResults
      controller={state.value}
      t={((key: string) => key) as TFunction}
      inspectorAnalysis={{ controls: {} } as never}
    />
  );
  const props = captures.result.mock.lastCall![0] as ComponentProps<
    typeof import('./explore-result-panel').ExploreResultPanel
  >;
  expect(props.onAddLogFilter?.({ scope: 'attribute', key: 'region', value: 'east' }, '=', 'replace')).toBe(true);
  expect(state.submitted).toHaveBeenCalledWith(
    expect.objectContaining({
      query: '@region:"east"',
      searchSyntax: 'structured-v1'
    })
  );
  expect(state.value.query).toMatchObject({ entityId: 'entity-1', timeRange: 'last-30m' });
});
