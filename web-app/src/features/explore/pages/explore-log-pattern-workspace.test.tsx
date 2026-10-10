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
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { TFunction } from 'i18next';
import { afterEach, expect, it, vi } from 'vitest';
import { loadLogPatternSample } from '../api/explore-log-patterns-api';
import { ExploreLogPatternWorkspace } from './explore-log-pattern-workspace';

vi.mock('../api/explore-log-patterns-api', () => ({
  buildLogPatternSamplePath: () => '/api/logs/list?proof=1',
  loadLogPatternSample: vi.fn()
}));
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

it('shows sample failure and recovers the same query through Retry', async () => {
  vi.mocked(loadLogPatternSample)
    .mockRejectedValueOnce(new Error('store unavailable'))
    .mockResolvedValueOnce({ content: [], totalElements: 0, totalPages: 0, number: 0, size: 1000 });
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <ExploreLogPatternWorkspace
        query={{ signal: 'logs', timeRange: 'last-30m', logAggregation: 'patterns' }}
        window={{ from: 1000, to: 2000 }}
        revision={0}
        t={((key: string) => key) as TFunction}
      />
    </QueryClientProvider>
  );
  expect(await screen.findByText('explore.logPatterns.error')).toBeVisible();
  fireEvent.click(screen.getByRole('button', { name: 'common.retry' }));
  expect(await screen.findByText('explore.logPatterns.empty')).toBeVisible();
  expect(loadLogPatternSample).toHaveBeenCalledTimes(2);
});
