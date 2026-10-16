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

import { describe, expect, it, vi } from 'vitest';
import { traceEvidenceFixture } from '@/test/trace-evidence-fixtures';
const transport = vi.hoisted(() => ({ get: vi.fn<(path: string) => Promise<unknown>>() }));
vi.mock('@/core/http/api-message', async original => ({
  ...(await original<typeof import('@/core/http/api-message')>()),
  apiMessageGet: transport.get
}));
import { loadErrorTraceSamples } from './explore-trace-samples-api';
import { ApiMessageError } from '@/core/http/api-message';
describe('bounded error trace samples', () => {
  it('uses the same scope and window, requests exactly two newest error traces', async () => {
    const row = traceEvidenceFixture({
      status: 'ERROR',
      errorSpanCount: 1,
      serviceStats: { checkout: { spanCount: 1, errorCount: 1 } }
    });
    transport.get.mockResolvedValue({ content: [row], totalElements: 1, totalPages: 1, number: 0, size: 2 });
    const result = await loadErrorTraceSamples({
      signal: 'traces',
      timeRange: 'last-15m',
      start: 1000,
      end: 901000,
      serviceName: 'checkout',
      environment: 'production'
    });
    const url = new URL(transport.get.mock.calls.at(-1)![0], 'http://localhost');
    expect(Object.fromEntries(url.searchParams)).toMatchObject({
      start: '1000',
      end: '901000',
      serviceName: 'checkout',
      environment: 'production',
      errorOnly: 'true',
      pageSize: '2',
      pageIndex: '0',
      sort: 'newest'
    });
    expect(result).toMatchObject({ state: 'ready', rows: [row] });
  });
  it('rejects a non-error row instead of displaying it as an anomaly', async () => {
    transport.get.mockResolvedValue({
      content: [traceEvidenceFixture()],
      totalElements: 1,
      totalPages: 1,
      number: 0,
      size: 2
    });
    await expect(
      loadErrorTraceSamples({ signal: 'traces', timeRange: 'last-15m', start: 1000, end: 901000 })
    ).rejects.toThrow();
  });
  it.each([404, 501])('reports unsupported endpoint status %s explicitly', async status => {
    transport.get.mockRejectedValue(new ApiMessageError('unsupported', { status }));
    await expect(
      loadErrorTraceSamples({ signal: 'traces', timeRange: 'last-15m', start: 1000, end: 901000 })
    ).resolves.toEqual({ state: 'unsupported', rows: [] });
  });
  it('preserves transport failure instead of fabricating an empty result', async () => {
    transport.get.mockRejectedValue(new ApiMessageError('unavailable', { status: 503 }));
    await expect(
      loadErrorTraceSamples({ signal: 'traces', timeRange: 'last-15m', start: 1000, end: 901000 })
    ).rejects.toThrow('unavailable');
  });
});
