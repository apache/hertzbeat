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

import { act, renderHook } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { ReactNode } from 'react';
import { expect, it, vi } from 'vitest';
import { hasUnappliedExploreDraft } from '../model/explore-saved-query-view-model';
import type { LogExploreQuery, ExploreQueryPatch } from '../model/explore-query';
import { buildExplorePath, mergeExploreQuery, parseExploreQuery } from '../model/explore-model';
import { useExploreSubmission } from './use-explore-submission';
const logSort = JSON.stringify({ version: 1, field: 'attribute:duration', type: 'number', direction: 'desc' });
const wrapper = ({ children }: { children: ReactNode }) => <MemoryRouter>{children}</MemoryRouter>;
it('stages sort and filters atomically, preserves an unrelated draft when resetting only sorting', () => {
  const submit = vi.fn<(patch: ExploreQueryPatch) => void>();
  const { result } = renderHook(
    () =>
      useExploreSubmission(
        { signal: 'logs', timeRange: 'last-30m', searchSyntax: 'structured-v1', sort: 'oldest', pageIndex: 3 },
        submit
      ),
    { wrapper }
  );
  act(() => {
    result.current.updateField({ field: 'query', value: 'timeout' });
    result.current.updateField({ field: 'logSort', value: logSort });
    result.current.updateField({ field: 'sort', value: 'newest' });
  });
  expect(submit).not.toHaveBeenCalled();
  expect(result.current.draft).toMatchObject({ query: 'timeout', logSort, sort: 'newest' });
  act(() => result.current.submit());
  expect(submit).toHaveBeenCalledWith(
    expect.objectContaining({ query: 'timeout', logSort, sort: 'newest', pageIndex: undefined })
  );
  submit.mockClear();
  act(() => {
    result.current.updateField({ field: 'logSort', value: undefined });
    result.current.updateField({ field: 'sort', value: 'oldest' });
  });
  expect(result.current.draft).toMatchObject({ query: 'timeout', logSort: undefined, sort: 'oldest' });
  expect(submit).not.toHaveBeenCalled();
});
it('keeps invalid ordering visible and blocks submission', () => {
  const submit = vi.fn<(patch: ExploreQueryPatch) => void>();
  const { result } = renderHook(
    () => useExploreSubmission({ signal: 'logs', timeRange: 'last-30m', logSort: '{}' }, submit),
    { wrapper }
  );
  act(() => result.current.submit());
  expect(submit).not.toHaveBeenCalled();
  expect(result.current.errors).toMatchObject({ logSort: 'invalid_log_sort' });
  expect(result.current.draft).toMatchObject({ logSort: '{}' });
});

it('clears global pending after a custom sort is applied with the default timestamp order omitted', () => {
  const submit = vi.fn<(patch: ExploreQueryPatch) => void>();
  const initial: LogExploreQuery = { signal: 'logs', timeRange: 'last-30m' };
  const { result, rerender } = renderHook(({ query }) => useExploreSubmission(query, submit), {
    wrapper,
    initialProps: { query: initial }
  });
  act(() => {
    result.current.updateField({ field: 'logSort', value: logSort });
    result.current.updateField({ field: 'sort', value: 'newest' });
  });
  expect(hasUnappliedExploreDraft(initial, result.current.draft)).toBe(true);
  act(() => result.current.submit());
  const path = buildExplorePath(mergeExploreQuery(initial, submit.mock.calls[0]![0]));
  const params = new URL(path, 'http://localhost').searchParams;
  expect(params.has('sort')).toBe(false);
  const applied = parseExploreQuery(params);
  if (applied.signal !== 'logs') throw new Error('Expected logs route');
  expect(applied.logSort).toBe(logSort);
  rerender({ query: applied });
  expect(hasUnappliedExploreDraft(applied, result.current.draft)).toBe(false);
  act(() => result.current.updateField({ field: 'query', value: 'timeout' }));
  expect(hasUnappliedExploreDraft(applied, result.current.draft)).toBe(true);
});
