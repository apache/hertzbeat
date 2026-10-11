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
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { expect, it } from 'vitest';
import { parseExploreQuery } from '../model/explore-model';
import { useLogFacetValues } from './use-log-facet-values';

it('keeps the facet rail mounted for a value search beyond the backend UTF-8 limit', async () => {
  const logSubquery = JSON.stringify({
    version: 1,
    mainField: 'builtin:serviceName',
    operator: 'in',
    child: { field: 'builtin:serviceName', searchSyntax: 'structured-v1', search: '' },
    rank: { direction: 'top', limit: 10, measure: { function: 'count_all' } }
  });
  const query = parseExploreQuery(
    new URLSearchParams({ signal: 'logs', timeRange: 'last-1h', searchSyntax: 'structured-v1', logSubquery })
  );
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  const hook = renderHook(
    () =>
      useLogFacetValues(query, { kind: 'loading' }, 'builtin:serviceName', true, 'a', { from: 120_001, to: 240_000 }),
    { wrapper }
  );
  const multiByteSearch = String.fromCodePoint(0x754c).repeat(100);
  act(() => hook.result.current.onValueSearchChange(multiByteSearch));
  await waitFor(() => expect(hook.result.current.values.state).toBe('unavailable'));
  expect(hook.result.current.valueSearch).toBe(multiByteSearch);
});
