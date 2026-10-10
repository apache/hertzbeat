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

import { expect, it, vi } from 'vitest';
import { apiMessageGet } from '@/core/http/api-message';
import { hertzBeatQuerySchema } from './hertzbeat-query-contract';
import { queryHertzBeatData } from './hertzbeat-query-client';
vi.mock('@/core/http/api-message', async original => ({ ...(await original<object>()), apiMessageGet: vi.fn() }));
const logSort = { version: 1, field: 'attribute:duration', type: 'number', direction: 'desc' };
const query = { signal: 'logs', queryKind: 'table', timeWindow: { from: 1000, to: 2000 }, logSort };
it('preserves a typed sort through the controlled dashboard query API', async () => {
  const parsed = hertzBeatQuerySchema.parse(query);
  vi.mocked(apiMessageGet).mockResolvedValue({ content: [], totalElements: 0, size: 20, number: 0 });
  if (parsed.signal !== 'logs' || parsed.queryKind !== 'table') throw new Error('Expected log query');
  await queryHertzBeatData(parsed);
  const path = String(vi.mocked(apiMessageGet).mock.calls.at(-1)?.[0]);
  expect(JSON.parse(new URL(path, 'http://localhost').searchParams.get('logSort')!)).toEqual(logSort);
});
it('rejects conflicting or invalid saved dashboard order', () => {
  expect(hertzBeatQuerySchema.safeParse({ ...query, sort: 'oldest' }).success).toBe(false);
  expect(
    hertzBeatQuerySchema.safeParse({ ...query, logSort: { ...logSort, field: 'builtin:serviceName' } }).success
  ).toBe(false);
});
