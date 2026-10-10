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

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { ComponentProps, ReactNode } from 'react';
import { afterEach, expect, it, vi } from 'vitest';
import { ExploreWorkspaceLogFacets } from './explore-workspace-log-facets';
import { DEFAULT_LOG_ANALYSIS, addLogSource, encodeLogAnalysis, migrateLogQuerySet } from '@/platform/perses';
import { readLogAnalysisDraft } from '../model/explore-log-analysis';
import { draftFromQuery } from '../model/explore-submission-model';
import { querySetTimelineContext } from './explore-workspace-log-facet-context';
const { facets, display, valuesDisplay } = vi.hoisted(() => ({
  facets: vi.fn(),
  display: vi.fn(),
  valuesDisplay: vi.fn()
}));
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: { ref?: string }) => (options?.ref ? `${key}:${options.ref}` : key)
  })
}));
vi.mock('../controller/use-log-facets', async original => ({
  ...(await original<typeof import('../controller/use-log-facets')>()),
  useLogFacetCatalog: (...args: unknown[]) => {
    facets(...args);
    const field = (args[0] as { query: string }).query === '@status:error' ? 'b' : 'a';
    return {
      fields: { state: 'ready', data: { fields: [{ id: `attribute:${field}`, source: 'attribute', key: field }] } },
      onCatalogRetry: vi.fn()
    };
  }
}));
vi.mock('../components/explore-log-facets', () => ({
  ExploreLogFacets: (props: { renderValues: (id: string, label: string) => ReactNode }) => {
    display(props);
    return props.renderValues('attribute:status', 'Status');
  }
}));
vi.mock('./explore-workspace-facet-values', () => ({
  ExploreWorkspaceFacetValues: (props: unknown) => {
    valuesDisplay(props);
    return null;
  }
}));
vi.mock('./explore-calculated-facet-values', () => ({ ExploreCalculatedFacetValues: () => null }));
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

it('keeps raw field discovery safe and adds server-typed calculated outputs to the existing facet rail', () => {
  const logCalculatedV2 = JSON.stringify({
    version: 2,
    nextFieldSeq: 2,
    fields: [{ id: 'c1', kind: 'formula', name: 'seconds', expression: '@duration_ms / 1000' }]
  });
  const query = {
    signal: 'logs' as const,
    timeRange: 'last-30m' as const,
    query: '#seconds:>=0.5',
    searchSyntax: 'structured-v2' as const,
    logCalculatedV2
  };
  const controller = {
    query,
    result: {
      kind: 'ready',
      signal: 'logs',
      window: { from: 1000, to: 2000 },
      calculated: {
        executed: { calculatedFields: { fields: [{ outputs: [{ name: 'seconds', type: 'number' }] }] } }
      }
    },
    submission: { draft: draftFromQuery(query), updateField: vi.fn(), submit: vi.fn() }
  } as unknown as ComponentProps<typeof ExploreWorkspaceLogFacets>['controller'];
  render(<ExploreWorkspaceLogFacets controller={controller} enabled />);
  expect(
    facets.mock.calls.some(([readQuery]) => readQuery.query === '' && readQuery.searchSyntax === 'structured-v1')
  ).toBe(true);
  expect(display.mock.lastCall?.[0].extraFields).toEqual([{ id: 'calculated:seconds', label: '#seconds' }]);
});
function setup(applied: boolean, offset?: number) {
  const analysis = {
    ...DEFAULT_LOG_ANALYSIS,
    representation: 'table' as const,
    comparison: {
      version: 1 as const,
      search: '@status:error',
      searchSyntax: 'structured-v1' as const,
      ...(offset ? { timeShiftMs: offset } : {})
    }
  };
  const query = {
    signal: 'logs' as const,
    timeRange: 'last-30m' as const,
    query: '@request:yes',
    searchSyntax: 'structured-v1' as const,
    serviceName: 'checkout',
    ...(applied ? { logAnalysis: encodeLogAnalysis(analysis) } : {})
  };
  const draft = { ...draftFromQuery(query), logAnalysis: encodeLogAnalysis(analysis) };
  const updateField = vi.fn();
  const submit = vi.fn();
  const applyLogPatch = vi.fn();
  const controller = {
    query,
    result: { kind: 'ready', signal: 'logs', window: { from: 1000000000, to: 1000001000 } },
    submission: { draft, updateField, submit, applyLogPatch }
  } as unknown as ComponentProps<typeof ExploreWorkspaceLogFacets>['controller'];
  const view = render(<ExploreWorkspaceLogFacets controller={controller} enabled />);
  selectFacetSource('b');
  return { controller, updateField, submit, applyLogPatch, view };
}
function selectFacetSource(source: string) {
  fireEvent.mouseDown(screen.getByRole('combobox', { name: 'explore.logComparison.facetTarget' }));
  const label = source === 'a' || source === 'b' ? source : `explore.logComparison.queryTarget:${source}`;
  fireEvent.click(screen.getAllByText(label).at(-1)!);
}
it('submits a basic facet with the current visible draft text', () => {
  const { controller, updateField, submit, applyLogPatch, view } = setup(false);
  selectFacetSource('a');
  if (controller.submission.draft.signal !== 'logs') throw new Error('Expected logs draft');
  controller.submission.draft.query = 'unfinished text';
  controller.submission.draft.logAnalysis = undefined;
  view.rerender(<ExploreWorkspaceLogFacets controller={controller} enabled />);
  const props = valuesDisplay.mock.lastCall![0] as ComponentProps<
    typeof import('./explore-workspace-facet-values').ExploreWorkspaceFacetValues
  >;
  props.actionForValue({ id: 'attribute:status', source: 'attribute', key: 'status' }, '500', '=').onClick();
  expect(updateField).toHaveBeenCalledWith({ field: 'query', value: expect.stringContaining('unfinished text') });
  expect(submit).toHaveBeenCalledOnce();
  expect(applyLogPatch).not.toHaveBeenCalled();
});
it('quotes legacy search text and upgrades it when a facet is selected', () => {
  const query = { signal: 'logs' as const, timeRange: 'last-30m' as const, query: '' };
  const draft = draftFromQuery(query);
  if (draft.signal !== 'logs') throw new Error('Expected logs draft');
  const applyLogPatch = vi.fn();
  const updateField = vi.fn();
  const submit = vi.fn();
  const controller = {
    query,
    result: { kind: 'ready', signal: 'logs', window: { from: 1000, to: 2000 } },
    submission: { draft, updateField, submit, applyLogPatch }
  } as unknown as ComponentProps<typeof ExploreWorkspaceLogFacets>['controller'];
  const view = render(<ExploreWorkspaceLogFacets controller={controller} enabled />);
  const actionForValue = () =>
    (
      valuesDisplay.mock.lastCall![0] as ComponentProps<
        typeof import('./explore-workspace-facet-values').ExploreWorkspaceFacetValues
      >
    ).actionForValue({ id: 'builtin:severityCategory', source: 'builtin', key: 'severityCategory' }, 'INFO', '!=');
  draft.query = 'unfinished literal text';
  view.rerender(<ExploreWorkspaceLogFacets controller={controller} enabled />);
  expect(actionForValue().disabled).toBe(false);
  actionForValue().onClick();
  expect(updateField).toHaveBeenCalledWith({ field: 'query', value: '"unfinished literal text" AND -status:"INFO"' });
  expect(submit).toHaveBeenCalledOnce();
  updateField.mockClear();
  submit.mockClear();
  draft.query = '';
  view.rerender(<ExploreWorkspaceLogFacets controller={controller} enabled />);
  expect(actionForValue().disabled).toBe(false);
  actionForValue().onClick();
  expect(updateField).toHaveBeenCalledWith({ field: 'query', value: '-status:"INFO"' });
  expect(updateField).toHaveBeenCalledWith({ field: 'searchSyntax', value: 'structured-v1' });
  expect(submit).toHaveBeenCalledOnce();
});
it('uses applied b counts and edits only b while keeping common filters', () => {
  const { controller, updateField } = setup(true);
  expect(facets).toHaveBeenLastCalledWith(
    expect.objectContaining({ query: '@status:error', serviceName: 'checkout' }),
    controller.result,
    true,
    undefined,
    true
  );
  const props = valuesDisplay.mock.lastCall![0] as ComponentProps<
    typeof import('./explore-workspace-facet-values').ExploreWorkspaceFacetValues
  >;
  props.actionForValue({ id: 'attribute:status', source: 'attribute', key: 'status' }, '500', '=').onClick();
  const update = updateField.mock.lastCall![0] as { field: string; value: string };
  expect(update.field).toBe('logAnalysis');
  expect(readLogAnalysisDraft(update.value)?.comparison?.search).toContain('500');
  expect(controller.query).toMatchObject({ query: '@request:yes', serviceName: 'checkout' });
});
it('never presents a counts as a newly drafted b source', () => {
  const { controller } = setup(false);
  expect(facets).toHaveBeenLastCalledWith(controller.query, controller.result, false, undefined, true);
  const props = valuesDisplay.mock.lastCall![0] as ComponentProps<
    typeof import('./explore-workspace-facet-values').ExploreWorkspaceFacetValues
  >;
  expect(
    props.actionForValue({ id: 'attribute:status', source: 'attribute', key: 'status' }, '500', '=').disabled
  ).toBe(true);
});

it('uses owned relative b endpoints for both facet requests and retains them while offset is only draft', () => {
  const { controller, view } = setup(true, 3600000);
  expect(facets.mock.lastCall?.[0]).toMatchObject({ start: 996400000, end: 996401000, query: '@status:error' });
  const draft = controller.submission.draft;
  if (draft.signal !== 'logs') throw new Error('Expected logs draft');
  const analysis = readLogAnalysisDraft(draft.logAnalysis)!;
  draft.logAnalysis = JSON.stringify({ ...analysis, comparison: { ...analysis.comparison, timeShiftMs: 86400000 } });
  view.rerender(<ExploreWorkspaceLogFacets controller={controller} enabled />);
  expect(facets.mock.lastCall?.[0]).toMatchObject({ start: 996400000, end: 996401000 });
  expect(facets.mock.lastCall?.[2]).toBe(true);
});
it('refuses shifted b facets without owned a evidence or with underflow', () => {
  const { controller, view } = setup(true, 3600000);
  controller.result = { kind: 'loading' };
  view.rerender(<ExploreWorkspaceLogFacets controller={controller} enabled />);
  expect(facets.mock.lastCall?.[2]).toBe(false);
  if (controller.query.signal !== 'logs') throw new Error('Expected logs query');
  controller.query = { ...controller.query, start: 1000, end: 2000 };
  view.rerender(<ExploreWorkspaceLogFacets controller={controller} enabled />);
  expect(facets.mock.lastCall?.[2]).toBe(false);
});
it('uses explicit applied endpoints and keeps offset when b facet edits its draft expression', () => {
  const { controller, view, updateField } = setup(true, 3600000);
  if (controller.query.signal !== 'logs') throw new Error('Expected logs query');
  controller.query = { ...controller.query, start: 2000000000, end: 2000001000 };
  view.rerender(<ExploreWorkspaceLogFacets controller={controller} enabled />);
  expect(facets.mock.lastCall?.[0]).toMatchObject({ start: 1996400000, end: 1996401000 });
  const props = valuesDisplay.mock.lastCall![0] as ComponentProps<
    typeof import('./explore-workspace-facet-values').ExploreWorkspaceFacetValues
  >;
  props.actionForValue({ id: 'attribute:status', source: 'attribute', key: 'status' }, '500', '=').onClick();
  expect(
    readLogAnalysisDraft((updateField.mock.lastCall![0] as { value: string }).value)?.comparison?.timeShiftMs
  ).toBe(3600000);
});

it('does not mount numeric range authoring when value facets select shifted b', () => {
  setup(true, 3600000);
  expect(facets).toHaveBeenCalledTimes(2);
});

it('queries only the selected facet source', () => {
  setup(true, 3600000);
  expect(facets.mock.lastCall?.[0]).toMatchObject({ query: '@status:error' });
  expect(facets.mock.lastCall?.[4]).toBe(true);
  selectFacetSource('a');
  expect(facets.mock.lastCall?.[0]).toMatchObject({ query: '@request:yes' });
  expect(facets.mock.lastCall?.[4]).toBe(false);
});

it('discovers facets from the selected applied query-set source and edits only that draft source', () => {
  const querySet = migrateLogQuerySet(DEFAULT_LOG_ANALYSIS, 'service:one', 'structured-v1');
  const withB = addLogSource(querySet);
  const withC = addLogSource(withB);
  withC.queries[1]!.search = 'service:two';
  withC.queries[2]!.search = '@event.name:executed';
  withC.queries[2]!.timeShiftMs = 3600000;
  const analysis = encodeLogAnalysis({ ...DEFAULT_LOG_ANALYSIS, representation: 'timeseries', querySet: withC });
  const query = {
    signal: 'logs' as const,
    timeRange: 'last-30m' as const,
    query: '',
    searchSyntax: 'structured-v1' as const,
    serviceName: 'checkout',
    logAnalysis: analysis
  };
  const draft = draftFromQuery(query);
  if (draft.signal !== 'logs') throw new Error('Expected logs draft');
  draft.logAnalysis = encodeLogAnalysis({
    ...DEFAULT_LOG_ANALYSIS,
    representation: 'timeseries',
    querySet: {
      ...withC,
      queries: withC.queries.map(source => (source.refId === 'c' ? { ...source, search: '@event.name:draft' } : source))
    }
  });
  const updateField = vi.fn();
  const submit = vi.fn();
  const controller = {
    query,
    result: { kind: 'ready', signal: 'logs', window: { from: 1000000000, to: 1000001000 } },
    submission: { draft, updateField, submit }
  } as unknown as ComponentProps<typeof ExploreWorkspaceLogFacets>['controller'];
  render(<ExploreWorkspaceLogFacets controller={controller} enabled />);
  selectFacetSource('c');
  expect(facets.mock.lastCall?.[0]).toMatchObject({
    query: '@event.name:executed',
    serviceName: 'checkout',
    start: 996400000,
    end: 996401000
  });
  const values = valuesDisplay.mock.lastCall![0] as ComponentProps<
    typeof import('./explore-workspace-facet-values').ExploreWorkspaceFacetValues
  >;
  values.actionForValue({ id: 'attribute:status', source: 'attribute', key: 'status' }, '500', '=').onClick();
  const update = updateField.mock.lastCall![0] as { field: string; value: string };
  expect(update.field).toBe('logAnalysis');
  const next = readLogAnalysisDraft(update.value)?.querySet;
  expect(next?.queries.map(source => source.search)).toEqual([
    'service:one',
    'service:two',
    '@event.name:draft AND -@status:"500"'
  ]);
  expect(submit).toHaveBeenCalledOnce();
  expect(query.query).toBe('');
  expect(query.serviceName).toBe('checkout');
  expect(
    values.actionForValue({ id: 'builtin:serviceName', source: 'builtin', key: 'serviceName' }, 'checkout', '=')
      .disabled
  ).toBe(true);
});

it('targets the newest query source by default and localizes its label', () => {
  const querySet = addLogSource(migrateLogQuerySet(DEFAULT_LOG_ANALYSIS, 'service:one', 'structured-v1'));
  const query = {
    signal: 'logs' as const,
    timeRange: 'last-30m' as const,
    query: '',
    searchSyntax: 'structured-v1' as const,
    logAnalysis: encodeLogAnalysis({ ...DEFAULT_LOG_ANALYSIS, representation: 'timeseries', querySet })
  };
  const draft = draftFromQuery(query);
  const controller = {
    query,
    result: { kind: 'ready', signal: 'logs', window: { from: 1000, to: 2000 } },
    submission: { draft, updateField: vi.fn(), submit: vi.fn() }
  } as unknown as ComponentProps<typeof ExploreWorkspaceLogFacets>['controller'];
  render(<ExploreWorkspaceLogFacets controller={controller} enabled />);
  expect(screen.getByTitle('explore.logComparison.queryTarget:b')).toBeInTheDocument();
});

it('projects the applied timeline source into shared scope with its shifted exact window', () => {
  const querySet = migrateLogQuerySet(DEFAULT_LOG_ANALYSIS, 'service:one', 'structured-v1');
  const withB = addLogSource(querySet);
  withB.queries[1]!.search = '@event.name:request';
  withB.queries[1]!.timeShiftMs = 3_600_000;
  const query = {
    signal: 'logs' as const,
    timeRange: 'last-30m' as const,
    query: 'main search',
    searchSyntax: 'structured-v1' as const,
    serviceName: 'shared-service',
    logAnalysis: encodeLogAnalysis({ ...DEFAULT_LOG_ANALYSIS, representation: 'timeseries', querySet: withB })
  };
  const draft = draftFromQuery(query);
  const controller = {
    query: { ...query, start: 1_754_467_200_000, end: 1_754_468_100_000 },
    result: { kind: 'ready', signal: 'logs', window: { from: 1_754_467_200_000, to: 1_754_468_100_000 } },
    submission: { draft, updateField: vi.fn(), submit: vi.fn() }
  } as unknown as ComponentProps<typeof ExploreWorkspaceLogFacets>['controller'];

  const sourceB = querySetTimelineContext(controller, 'b');
  const sourceA = querySetTimelineContext(controller, 'a');
  expect(sourceB.query).toMatchObject({
    serviceName: 'shared-service',
    query: '@event.name:request',
    searchSyntax: 'structured-v1',
    start: 1_754_463_600_000,
    end: 1_754_464_500_000,
    logAnalysis: undefined,
    logCalculatedV2: undefined
  });
  expect(sourceA.query?.query).toBe('service:one');
  expect(sourceB.draftSource?.refId).toBe('b');
});

it('falls back when the selected draft source is deleted and keeps unexecuted targets idle', () => {
  const querySet = migrateLogQuerySet(DEFAULT_LOG_ANALYSIS, 'service:one', 'structured-v1');
  const withB = addLogSource(querySet);
  const withC = addLogSource(withB);
  withC.queries[2]!.search = '@event.name:third';
  const appliedAnalysis = encodeLogAnalysis({ ...DEFAULT_LOG_ANALYSIS, representation: 'timeseries', querySet: withC });
  expect(readLogAnalysisDraft(appliedAnalysis)?.querySet?.queries[0]?.search).toBe('service:one');
  const query = {
    signal: 'logs' as const,
    timeRange: 'last-30m' as const,
    query: '',
    searchSyntax: 'structured-v1' as const,
    logAnalysis: appliedAnalysis
  };
  const draft = draftFromQuery(query);
  if (draft.signal !== 'logs') throw new Error('Expected logs draft');
  const controller = {
    query,
    result: { kind: 'ready', signal: 'logs', window: { from: 1000000000, to: 1000001000 } },
    submission: { draft, updateField: vi.fn(), submit: vi.fn() }
  } as unknown as ComponentProps<typeof ExploreWorkspaceLogFacets>['controller'];
  const view = render(<ExploreWorkspaceLogFacets controller={controller} enabled />);
  selectFacetSource('c');
  expect(facets.mock.lastCall?.[0]).toMatchObject({ query: '@event.name:third' });
  draft.logAnalysis = encodeLogAnalysis({
    ...DEFAULT_LOG_ANALYSIS,
    representation: 'timeseries',
    querySet: { ...withC, queries: withC.queries.slice(0, 2) }
  });
  view.rerender(<ExploreWorkspaceLogFacets controller={controller} enabled />);
  expect(facets.mock.lastCall?.[0]).toMatchObject({ query: 'service:one' });

  query.logAnalysis = encodeLogAnalysis({ ...DEFAULT_LOG_ANALYSIS, representation: 'timeseries', querySet: withB });
  const withDraftOnly = { ...withB, queries: [...withB.queries, withC.queries[2]!], nextSourceOrdinal: 3 };
  draft.logAnalysis = encodeLogAnalysis({
    ...DEFAULT_LOG_ANALYSIS,
    representation: 'timeseries',
    querySet: withDraftOnly
  });
  view.rerender(<ExploreWorkspaceLogFacets controller={controller} enabled />);
  selectFacetSource('c');
  expect(facets.mock.lastCall?.[2]).toBe(false);
});
