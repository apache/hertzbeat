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

import { QueryClient } from '@tanstack/react-query';
import { expect, it } from 'vitest';
import { exploreQueryKeys } from './explore-query-keys';

it.each(['external', 'self'] as const)('invalidates only the current %s inventory context', async source => {
  const client = new QueryClient();
  const otherWorkspace = new QueryClient();
  const query = { signal: 'metrics' as const, timeRange: 'last-30m' as const, serviceName: 'HertzBeat', source };
  const window = { from: 1000, to: 2000 };
  const key = exploreQueryKeys.metricInventory(query, window, 'workspace-a', '', 100);
  const otherSource = exploreQueryKeys.metricInventory(
    { ...query, source: source === 'external' ? 'self' : 'external' },
    window,
    'workspace-a',
    '',
    100
  );
  const otherContext = exploreQueryKeys.metricInventory(
    { ...query, serviceName: 'another-service' },
    window,
    'workspace-a',
    '',
    100
  );
  const otherWorkspaceKey = exploreQueryKeys.metricInventory(query, window, 'workspace-b', '', 100);
  for (const candidate of [key, otherSource, otherContext]) client.setQueryData(candidate, 'evidence');
  otherWorkspace.setQueryData(otherWorkspaceKey, 'other workspace evidence');
  await client.invalidateQueries({ queryKey: exploreQueryKeys.metricInventoryScope(query), refetchType: 'active' });
  expect(client.getQueryState(key)?.isInvalidated).toBe(true);
  expect(client.getQueryState(otherSource)?.isInvalidated).toBe(false);
  expect(client.getQueryState(otherContext)?.isInvalidated).toBe(false);
  expect(key).not.toEqual(otherWorkspaceKey);
  expect(otherWorkspace.getQueryState(otherWorkspaceKey)?.isInvalidated).toBe(false);
  client.clear();
  otherWorkspace.clear();
});
