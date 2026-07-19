/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { MemoryRouter, useNavigate, useSearchParams } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

import { parseExploreQuery, type ExploreQuery, type ExploreQueryPatch } from '../model/explore-model';
import { useExploreSubmission } from './use-explore-submission';

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
        { field: 'errorOnly', value: true }
      ],
      patch: { minDurationMs: 10, maxDurationMs: 20, errorOnly: true }
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
