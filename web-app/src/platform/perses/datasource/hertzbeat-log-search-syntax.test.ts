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

import { beforeEach, expect, it, vi } from 'vitest';
import { apiMessageGet } from '@/core/http/api-message';
import { hertzBeatQuerySchema } from './hertzbeat-query-contract';
import { queryHertzBeatData } from './hertzbeat-query-client';
vi.mock('@/core/http/api-message', () => ({ apiMessageGet: vi.fn() }));
const base = { signal: 'logs', queryKind: 'table', timeWindow: { from: 1000, to: 2000 } } as const;
beforeEach(() => vi.mocked(apiMessageGet).mockReset());
it('supports 8192 structured characters but preserves legacy 512-character limit and rejects unknown modes', () => {
  expect(
    hertzBeatQuerySchema.safeParse({ ...base, search: 'x'.repeat(8192), searchSyntax: 'structured-v1' }).success
  ).toBe(true);
  expect(
    hertzBeatQuerySchema.safeParse({ ...base, search: 'x'.repeat(8193), searchSyntax: 'structured-v1' }).success
  ).toBe(false);
  expect(hertzBeatQuerySchema.safeParse({ ...base, search: 'x'.repeat(513) }).success).toBe(false);
  expect(hertzBeatQuerySchema.safeParse({ ...base, search: 'error', searchSyntax: 'future' }).success).toBe(false);
});
it('sends structured syntax through the controlled Dashboard query client', async () => {
  vi.mocked(apiMessageGet).mockResolvedValue({ content: [], totalElements: 0, pageIndex: 0, pageSize: 20 });
  await queryHertzBeatData({ ...base, search: 'status:error OR status:warn', searchSyntax: 'structured-v1' });
  expect(
    new URL(String(vi.mocked(apiMessageGet).mock.calls[0]?.[0]), 'http://local').searchParams.get('searchSyntax')
  ).toBe('structured-v1');
});
