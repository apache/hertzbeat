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
import { loadLogHistoryEvidence } from './explore-api';
vi.mock('@/core/http/api-message', async original => ({
  ...(await original<typeof import('@/core/http/api-message')>()),
  apiMessageGet: vi.fn()
}));
it('uses identical syntax and body across history list, overview and trend requests', async () => {
  const request = vi.mocked(apiMessageGet);
  request
    .mockResolvedValueOnce({ content: [], totalElements: 0, pageIndex: 0, pageSize: 20 })
    .mockRejectedValue(new Error('unavailable'));
  await loadLogHistoryEvidence({
    signal: 'logs',
    timeRange: 'last-30m',
    searchSyntax: 'structured-v1',
    query: 'status:error OR status:warn'
  });
  expect(request).toHaveBeenCalledTimes(3);
  for (const [path] of request.mock.calls) {
    const params = new URL(path, 'http://local').searchParams;
    expect(params.get('searchSyntax')).toBe('structured-v1');
    expect(params.get('search')).toBe('status:error OR status:warn');
  }
});
