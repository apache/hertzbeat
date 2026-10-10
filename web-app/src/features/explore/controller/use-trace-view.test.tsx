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
import { afterEach, expect, it } from 'vitest';
import { buildExplorePath, mergeExploreQuery, parseExploreQuery } from '../model/explore-model';
import { useExploreSubmission } from './use-explore-submission';
import { useTraceView } from './use-trace-view';
function useHarness() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const query = parseExploreQuery(params);
  if (query.signal !== 'traces') throw new Error('wrong fixture');
  const submit = useExploreSubmission(query, patch => void navigate(buildExplorePath(mergeExploreQuery(query, patch))));
  const display = useTraceView(
    query,
    traceView => void navigate(buildExplorePath(mergeExploreQuery(query, { traceView })))
  );
  return { submit, display, query };
}
afterEach(cleanup);
it('column navigation retains pending filters and encoded view across rerenders', () => {
  const wrapper = ({ children }: { children: ReactNode }) => (
    <MemoryRouter initialEntries={['/explore?signal=traces&timeRange=last-30m&serviceName=checkout']}>
      {children}
    </MemoryRouter>
  );
  const hook = renderHook(useHarness, { wrapper });
  act(() => hook.result.current.submit.updateField({ field: 'query', value: 'pending error' }));
  act(() =>
    hook.result.current.display.onChange({ ...hook.result.current.display.view, columns: ['traceName', 'traceId'] })
  );
  expect(hook.result.current.submit.draft.query).toBe('pending error');
  expect(hook.result.current.query.query).toBeUndefined();
  expect(hook.result.current.query.serviceName).toBe('checkout');
  expect(hook.result.current.display.view.columns).toEqual(['traceName', 'traceId']);
  hook.rerender();
  expect(hook.result.current.display.invalid).toBe(false);
});
it('preserves malformed view until an explicit reset and rejects removing trace identity', () => {
  const wrapper = ({ children }: { children: ReactNode }) => (
    <MemoryRouter initialEntries={['/explore?signal=traces&timeRange=last-30m&traceView=invalid']}>
      {children}
    </MemoryRouter>
  );
  const hook = renderHook(useHarness, { wrapper });
  expect(hook.result.current.display.invalid).toBe(true);
  expect(hook.result.current.query.traceView).toBe('invalid');
  act(() => hook.result.current.display.onChange({ ...hook.result.current.display.view, columns: ['duration'] }));
  expect(hook.result.current.query.traceView).toBe('invalid');
  expect(hook.result.current.display.rejected).toBe(true);
  act(() => hook.result.current.display.reset());
  expect(hook.result.current.display.invalid).toBe(false);
  expect(hook.result.current.display.rejected).toBe(false);
});
