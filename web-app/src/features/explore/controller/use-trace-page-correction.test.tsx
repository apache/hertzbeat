/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useTracePageCorrection } from './use-trace-page-correction';
import type { HistoricalEvidence } from '../model/explore-result-model';

const navigate = vi.hoisted(() => vi.fn());
vi.mock('react-router-dom', () => ({ useNavigate: () => navigate }));
const query = { signal: 'traces' as const, timeRange: 'last-30m' as const, pageIndex: 2, start: 1000, end: 2000 };
const data: HistoricalEvidence = {
  signal: 'traces',
  revision: 0,
  window: { from: 1000, to: 2000 },
  data: { content: [], number: 2, size: 20, totalElements: 21, totalPages: 2 }
};
const current = { data, isSuccess: true, isFetching: false, isPlaceholderData: false };

describe('current trace page correction', () => {
  beforeEach(() => navigate.mockClear());
  it('suppresses the invalid page and replaces its canonical URL without adding history', () => {
    const result = renderHook(() => useTracePageCorrection(query, current, true));
    expect(result.result.current).toBe(true);
    expect(navigate).toHaveBeenCalledWith('/explore?signal=traces&timeRange=last-30m&page=1&start=1000&end=2000', {
      replace: true
    });
  });
  it.each([{ isFetching: true }, { isPlaceholderData: true }, { isSuccess: false }])(
    'never corrects retained, pending, or failed evidence %j',
    flags => {
      const result = renderHook(() => useTracePageCorrection(query, { ...current, ...flags }, true));
      expect(result.result.current).toBe(false);
      expect(navigate).not.toHaveBeenCalled();
    }
  );
  it('ignores disabled history and evidence for a different requested page', () => {
    const result = renderHook(() => useTracePageCorrection(query, current, false));
    expect(result.result.current).toBe(false);
    result.unmount();
    renderHook(() => useTracePageCorrection({ ...query, pageIndex: 1 }, current, true));
    expect(navigate).not.toHaveBeenCalled();
  });
});
it('never uses trace total pages to correct a matching span population', () => {
  navigate.mockClear();
  const traceView = JSON.stringify({
    version: 1,
    columns: ['traceName'],
    density: 'compact',
    mode: 'list',
    population: 'matched_spans',
    groupBy: 'serviceName'
  });
  const result = renderHook(() => useTracePageCorrection({ ...query, traceView }, current, true));
  expect(result.result.current).toBe(false);
  expect(navigate).not.toHaveBeenCalled();
});
