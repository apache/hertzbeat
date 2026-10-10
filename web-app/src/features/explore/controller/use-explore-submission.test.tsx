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

import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { MemoryRouter, useNavigate, useSearchParams } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

import { parseExploreQuery, type ExploreQuery, type ExploreQueryPatch } from '../model/explore-model';
import { useExploreSubmission } from './use-explore-submission';
import { DEFAULT_LOG_ANALYSIS, encodeLogAnalysis } from '@/platform/perses';
import { applyLogRepresentationChange } from '../model/explore-log-representation-change';

describe('useExploreSubmission', () => {
  it.each([
    {
      query: { signal: 'metrics', timeRange: 'last-30m' } as ExploreQuery,
      changes: [
        { field: 'query', value: ' rate(up[5m]) ' },
        { field: 'aggregation', value: 'SUM' },
        { field: 'stepSeconds', value: '60' }
      ],
      patch: { query: 'rate(up[5m])', aggregation: 'sum', step: '60' }
    },
    {
      query: { signal: 'logs', timeRange: 'last-30m' } as ExploreQuery,
      changes: [
        { field: 'severityText', value: ' ERROR ' },
        { field: 'spanId', value: ' span-1 ' }
      ],
      patch: { severityText: 'ERROR', spanId: 'span-1' }
    },
    {
      query: { signal: 'traces', timeRange: 'last-30m' } as ExploreQuery,
      changes: [
        { field: 'minDurationMs', value: ' 10 ' },
        { field: 'maxDurationMs', value: ' 20 ' },
        { field: 'attributeFilter', value: ' http.route=/checkout ' },
        { field: 'errorOnly', value: true }
      ],
      patch: { minDurationMs: 10, maxDurationMs: 20, attributeFilter: 'http.route=/checkout', errorOnly: true }
    }
  ])('submits a typed $query.signal patch and normalizes its draft', ({ query, changes, patch }) => {
    const submit = vi.fn();
    const { result } = renderSubmission(query, submit);

    act(() => changes.forEach(change => result.current.updateField(change as never)));
    act(() => result.current.submit());

    expect(submit).toHaveBeenCalledWith(expect.objectContaining(patch));
    expect(result.current.draft).toEqual(expect.objectContaining(patchToDraft(patch)));
  });

  it('blocks invalid fields and exposes field errors without submitting', () => {
    const submit = vi.fn();
    const { result } = renderSubmission({ signal: 'metrics', timeRange: 'last-30m' }, submit);

    act(() => {
      result.current.updateField({ field: 'aggregation', value: 'p95' });
      result.current.updateField({ field: 'stepSeconds', value: '0' });
    });
    act(() => result.current.submit());

    expect(submit).not.toHaveBeenCalled();
    expect(result.current.errors).toEqual({
      aggregation: 'unsupported_aggregation',
      stepSeconds: 'invalid_step'
    });
  });

  it('clears a duration relation error when either bound changes without clearing unrelated errors', () => {
    const { result } = renderSubmission({ signal: 'traces', timeRange: 'last-30m' });

    act(() => {
      result.current.updateField({ field: 'minDurationMs', value: '200' });
      result.current.updateField({ field: 'maxDurationMs', value: '100' });
    });
    act(() => result.current.submit());
    expect(result.current.errors).toEqual({ maxDurationMs: 'min_exceeds_max' });

    act(() => result.current.updateField({ field: 'minDurationMs', value: '50' }));
    expect(result.current.errors).toEqual({});

    act(() => {
      result.current.updateField({ field: 'minDurationMs', value: 'invalid-min' });
      result.current.updateField({ field: 'maxDurationMs', value: 'invalid-max' });
    });
    act(() => result.current.submit());
    expect(result.current.errors).toEqual({
      minDurationMs: 'invalid_duration',
      maxDurationMs: 'invalid_duration'
    });

    act(() => result.current.updateField({ field: 'minDurationMs', value: '25' }));
    expect(result.current.errors).toEqual({ maxDurationMs: 'invalid_duration' });
  });

  it('resets pending edits and validation to committed values without submitting', () => {
    const submit = vi.fn();
    const { result } = renderSubmission({ signal: 'metrics', timeRange: 'last-30m', query: 'up' }, submit);
    act(() => result.current.updateField({ field: 'aggregation', value: 'invalid' }));
    act(() => result.current.submit());
    expect(result.current.errors).not.toEqual({});
    act(() => result.current.resetDraft());
    expect(result.current.draft).toMatchObject({ query: 'up' });
    expect(result.current.errors).toEqual({});
    expect(submit).not.toHaveBeenCalled();
  });

  it('does not restore a removed field when Query follows in the same action batch', () => {
    const submit = vi.fn();
    const { result } = renderSubmission({ signal: 'logs', timeRange: 'last-30m', severityText: 'ERROR' }, submit);
    act(() => {
      result.current.removeFilters(['severityText']);
      result.current.submit();
    });
    expect(submit.mock.lastCall?.[0]).toMatchObject({ severityText: undefined });
  });

  it('clears multiple committed filters with one patch and preserves unrelated pending fields', () => {
    const submit = vi.fn();
    const { result } = renderSubmission(
      {
        signal: 'logs',
        timeRange: 'last-30m',
        severityText: 'ERROR',
        attributeFilter: 'status=500',
        query: 'committed'
      },
      submit
    );
    act(() => result.current.updateField({ field: 'query', value: 'pending' }));
    act(() => {
      result.current.removeFilters(['severityText', 'attributeFilter']);
    });
    expect(submit).toHaveBeenCalledExactlyOnceWith({
      severityText: undefined,
      attributeFilter: undefined,
      pageIndex: undefined
    });
    expect(result.current.draft).toMatchObject({ query: 'pending', severityText: '', attributeFilter: '' });
  });

  it('clears an active form filter in both the draft and submitted patch', () => {
    const submit = vi.fn();
    const { result } = renderSubmission(
      {
        signal: 'logs',
        timeRange: 'last-30m',
        severityText: 'ERROR'
      },
      submit
    );

    act(() => {
      result.current.removeFilter('severityText');
    });

    expect(result.current.draft).toEqual(expect.objectContaining({ signal: 'logs', severityText: '' }));
    expect(submit).toHaveBeenCalledWith({ severityText: undefined, pageIndex: undefined });
  });

  it('preserves dirty fields for unrelated query updates and resets on signal or POP history changes', async () => {
    const submit = vi.fn();
    const { result, rerender } = renderSubmission(
      { signal: 'metrics', timeRange: 'last-30m', query: 'committed', end: 100 },
      submit
    );
    act(() => result.current.updateField({ field: 'query', value: 'local draft' }));
    rerender({ query: { signal: 'metrics', timeRange: 'last-30m', query: 'committed', end: 200 }, submit });
    expect(result.current.draft.query).toBe('local draft');

    rerender({ query: { signal: 'logs', timeRange: 'last-30m', query: 'logs' }, submit });
    expect(result.current.draft).toEqual(expect.objectContaining({ signal: 'logs', query: 'logs' }));
    expect(result.current.draft).not.toHaveProperty('metricFilter');

    const history = renderHistorySubmission();
    act(() => history.result.current.updateField({ field: 'query', value: 'history draft' }));
    act(() => {
      void history.result.current.navigate(-1);
    });
    await waitFor(() => expect(history.result.current.query.query).toBe('previous'));
    expect(history.result.current.draft.query).toBe('previous');
  });
});

function renderSubmission(query: ExploreQuery, submit = vi.fn()) {
  const wrapper = ({ children }: { children: ReactNode }) => <MemoryRouter>{children}</MemoryRouter>;
  return renderHook(({ query: current, submit: onSubmit }) => useExploreSubmission(current, onSubmit), {
    initialProps: { query, submit },
    wrapper
  });
}

function renderHistorySubmission() {
  const wrapper = ({ children }: { children: ReactNode }) => (
    <MemoryRouter
      initialEntries={['/explore?signal=metrics&query=previous', '/explore?signal=metrics&query=current']}
      initialIndex={1}
    >
      {children}
    </MemoryRouter>
  );
  return renderHook(
    () => {
      const [params] = useSearchParams();
      const query = parseExploreQuery(params);
      return { ...useExploreSubmission(query, vi.fn()), query, navigate: useNavigate() };
    },
    { wrapper }
  );
}

function patchToDraft(patch: ExploreQueryPatch) {
  const { step, ...fields } = patch;
  return {
    ...fields,
    ...(step == null ? {} : { stepSeconds: step }),
    ...(patch.minDurationMs == null ? {} : { minDurationMs: String(patch.minDurationMs) }),
    ...(patch.maxDurationMs == null ? {} : { maxDurationMs: String(patch.maxDurationMs) })
  };
}

it('explicit selector clear retains unrelated draft text and prevents later reapplication', () => {
  const submit = vi.fn();
  const query = {
    signal: 'logs',
    timeRange: 'last-30m',
    query: 'applied',
    logGroupSelection: JSON.stringify({ version: 1, groups: [{ field: 'attribute:x', kind: 'missing' }] })
  } as const;
  const { result } = renderSubmission(query, submit);
  act(() => result.current.updateField({ field: 'query', value: 'draft OR text' }));
  act(() => {
    result.current.removeFilter('logGroupSelection');
  });
  expect(result.current.draft).toMatchObject({ query: 'draft OR text', logGroupSelection: undefined });
  expect(submit).toHaveBeenLastCalledWith({ logGroupSelection: undefined, pageIndex: undefined });
  act(() => result.current.submit());
  expect(submit).toHaveBeenLastCalledWith(
    expect.objectContaining({ query: 'draft OR text', logGroupSelection: undefined })
  );
});

it('applies a log facet against committed search and retains unfinished text after URL sync', () => {
  const submit = vi.fn();
  const query = { signal: 'logs', timeRange: 'last-30m', query: 'applied', searchSyntax: 'structured-v1' } as const;
  const { result, rerender } = renderSubmission(query, submit);
  act(() => result.current.updateField({ field: 'query', value: 'unfinished text' }));
  act(() => {
    result.current.applyLogPatch({ query: '(applied) AND @status:"error"' });
  });
  expect(submit).toHaveBeenCalledExactlyOnceWith({ query: '(applied) AND @status:"error"', pageIndex: undefined });
  rerender({ query: { ...query, query: '(applied) AND @status:"error"' }, submit });
  expect(result.current.draft.query).toBe('unfinished text');
  act(() => result.current.submit());
  expect(submit).toHaveBeenLastCalledWith(expect.objectContaining({ query: 'unfinished text' }));
});

it('commits an empty literal search and syntax upgrade as one immediate facet action', () => {
  const submit = vi.fn();
  const query = { signal: 'logs', timeRange: 'last-30m', query: '' } as const;
  const { result, rerender } = renderSubmission(query, submit);
  act(() => {
    expect(result.current.applyLogPatch({ query: '-status:"INFO"', searchSyntax: 'structured-v1' })).toBe(true);
  });
  expect(submit).toHaveBeenCalledExactlyOnceWith({
    query: '-status:"INFO"',
    searchSyntax: 'structured-v1',
    pageIndex: undefined
  });
  rerender({ query: { ...query, query: '-status:"INFO"', searchSyntax: 'structured-v1' }, submit });
  expect(result.current.draft).toMatchObject({ query: '-status:"INFO"', searchSyntax: 'structured-v1' });
});

it('rejects an immediate log change when committed legacy analysis is invalid', () => {
  const submit = vi.fn();
  const { result } = renderSubmission({ signal: 'logs', timeRange: 'last-30m', logAnalysis: '{broken' }, submit);
  act(() => {
    result.current.applyLogPatch({ severityCategory: 'ERROR' });
  });
  expect(submit).not.toHaveBeenCalled();
  expect(result.current.errors).toHaveProperty('logAnalysis', 'invalid_log_analysis');
});

it('clears an unfinished numeric range when Clear matches the already empty route', () => {
  const submit = vi.fn();
  const { result } = renderSubmission({ signal: 'logs', timeRange: 'last-30m' }, submit);
  act(() =>
    result.current.updateField({
      field: 'logNumericRange',
      value: '{"version":1,"field":"attribute:x","min":1,"max":2}'
    })
  );
  act(() => {
    result.current.applyLogPatch({ logNumericRange: undefined });
  });
  expect(result.current.draft).toHaveProperty('logNumericRange', undefined);
  expect(submit).toHaveBeenCalledWith({ logNumericRange: undefined, pageIndex: undefined });
});

it('applies ordering without submitting a pending search or changing exact time', () => {
  const submit = vi.fn();
  const query = { signal: 'logs', timeRange: 'last-30m', query: 'applied', start: 1000, end: 2000 } as const;
  const { result, rerender } = renderSubmission(query, submit);
  act(() => result.current.updateField({ field: 'query', value: 'pending' }));
  act(() => {
    result.current.applyLogPatch({ sort: 'oldest' });
  });
  expect(submit).toHaveBeenCalledWith({ sort: 'oldest', pageIndex: undefined });
  rerender({ query: { ...query, sort: 'oldest' }, submit });
  expect(result.current.draft).toMatchObject({ query: 'pending', sort: 'oldest' });
});

it('applies inline log grouping against the committed scope and keeps pending query text local', () => {
  const submit = vi.fn();
  const analysis = { ...DEFAULT_LOG_ANALYSIS, representation: 'table' as const };
  const query = {
    signal: 'logs',
    timeRange: 'last-30m',
    query: 'status:error',
    serviceName: 'checkout',
    start: 1000,
    end: 2000,
    logAnalysis: encodeLogAnalysis(analysis)
  } as const;
  const { result, rerender } = renderSubmission(query, submit);
  const grouped = encodeLogAnalysis({ ...analysis, field: 'attribute:status' });
  act(() => result.current.updateField({ field: 'query', value: 'pending query' }));
  act(() => {
    result.current.applyLogPatch({ logAnalysis: grouped });
  });
  expect(submit).toHaveBeenCalledExactlyOnceWith({ logAnalysis: grouped, pageIndex: undefined });
  rerender({ query: { ...query, logAnalysis: grouped }, submit });
  expect(result.current.draft).toMatchObject({
    query: 'pending query',
    serviceName: 'checkout',
    logAnalysis: grouped
  });
});

it('applies a representation switch immediately without submitting a pending query or changing scope', () => {
  const submit = vi.fn();
  const analysis = { ...DEFAULT_LOG_ANALYSIS, representation: 'logs' as const };
  const query = {
    signal: 'logs',
    timeRange: 'last-30m',
    query: 'status:error',
    serviceName: 'checkout',
    start: 1000,
    end: 2000,
    logAnalysis: encodeLogAnalysis(analysis)
  } as const;
  const { result, rerender } = renderSubmission(query, submit);
  act(() => result.current.updateField({ field: 'query', value: 'unfinished query' }));
  act(() => {
    applyLogRepresentationChange(query.logAnalysis, 'timeseries', result.current.applyLogPatch);
  });
  const updatedAnalysis = encodeLogAnalysis({ ...analysis, representation: 'timeseries' });
  expect(submit).toHaveBeenCalledExactlyOnceWith({ logAnalysis: updatedAnalysis, pageIndex: undefined });
  rerender({ query: { ...query, logAnalysis: updatedAnalysis }, submit });
  expect(result.current.draft).toMatchObject({
    query: 'unfinished query',
    serviceName: 'checkout',
    logAnalysis: updatedAnalysis
  });
});

it('restores numeric presentation and applied scope on back and forward, clearing pending edits', async () => {
  const view = JSON.stringify({ mode: 'number', hidden: ['b'], numberCalculation: 'avg' });
  const route = (query: string, metricView: string) =>
    '/explore?' +
    new URLSearchParams({
      signal: 'metrics',
      query,
      serviceName: 'checkout',
      start: '1000',
      end: '2000',
      metricView
    }).toString();
  const wrapper = ({ children }: { children: ReactNode }) => (
    <MemoryRouter
      initialEntries={[route('previous', view), route('current', JSON.stringify({ mode: 'chart', hidden: [] }))]}
      initialIndex={1}
    >
      {children}
    </MemoryRouter>
  );
  const history = renderHook(
    () => {
      const [params] = useSearchParams();
      const query = parseExploreQuery(params);
      return { ...useExploreSubmission(query, vi.fn()), query, navigate: useNavigate() };
    },
    { wrapper }
  );
  act(() => history.result.current.updateField({ field: 'query', value: 'unfinished' }));
  act(() => {
    void history.result.current.navigate(-1);
  });
  await waitFor(() => expect(history.result.current.query.query).toBe('previous'));
  expect(history.result.current.query).toMatchObject({
    metricView: view,
    serviceName: 'checkout',
    start: 1000,
    end: 2000
  });
  expect(history.result.current.draft.query).toBe('previous');
  act(() => history.result.current.updateField({ field: 'query', value: 'another unfinished' }));
  act(() => {
    void history.result.current.navigate(1);
  });
  await waitFor(() => expect(history.result.current.query.query).toBe('current'));
  expect(history.result.current.draft.query).toBe('current');
  if (history.result.current.query.signal !== 'metrics') throw new Error('Expected metrics route');
  expect(JSON.parse(history.result.current.query.metricView ?? '{}')).toEqual({ mode: 'chart', hidden: [] });
});
