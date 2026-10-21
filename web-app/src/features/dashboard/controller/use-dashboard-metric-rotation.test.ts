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
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useDashboardMetricRotation } from './use-dashboard-metric-rotation';
describe('eight-second rotation countdown', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(0);
  });
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });
  it('tracks elapsed time, freezes while paused, resumes remaining time and resets on manual change', () => {
    const view = renderHook(() => useDashboardMetricRotation(3, false, false));
    act(() => {
      vi.advanceTimersByTime(3000);
    });
    expect(view.result.current.metricRemainingMs).toBe(5000);
    act(() => view.result.current.setMetricPaused(true));
    act(() => {
      vi.advanceTimersByTime(9000);
    });
    expect(view.result.current.metricRemainingMs).toBe(5000);
    expect(view.result.current.metricIndex).toBe(0);
    act(() => view.result.current.setMetricPaused(false));
    act(() => {
      vi.advanceTimersByTime(5200);
    });
    expect(view.result.current.metricIndex).toBe(1);
    act(() => view.result.current.nextMetric());
    expect(view.result.current.metricRemainingMs).toBe(8000);
  });
  it('freezes on interaction/hidden and disables automatic motion for reduced-motion', () => {
    const view = renderHook(({ hidden, reduced }) => useDashboardMetricRotation(3, hidden, reduced), {
      initialProps: { hidden: false, reduced: false }
    });
    act(() => {
      vi.advanceTimersByTime(2000);
    });
    act(() => view.result.current.setMetricInteracting(true));
    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(view.result.current.metricRemainingMs).toBe(6000);
    act(() => view.result.current.setMetricInteracting(false));
    view.rerender({ hidden: true, reduced: false });
    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(view.result.current.metricRemainingMs).toBe(6000);
    view.rerender({ hidden: false, reduced: true });
    act(() => {
      vi.advanceTimersByTime(9000);
    });
    expect(view.result.current.metricIndex).toBe(0);
    act(() => view.result.current.nextMetric());
    expect(view.result.current.metricIndex).toBe(1);
    expect(view.result.current.metricExiting).toBe(false);
  });
  it('coalesces rapid clicks, completes both phases and then gives eight seconds of reading', () => {
    const view = renderHook(() => useDashboardMetricRotation(3, false, false));
    act(() => {
      view.result.current.nextMetric();
      view.result.current.nextMetric();
      view.result.current.previousMetric();
    });
    act(() => {
      vi.advanceTimersByTime(180);
    });
    expect(view.result.current.metricIndex).toBe(1);
    expect(view.result.current.metricExiting).toBe(false);
    expect(view.result.current.canRotate).toBe(false);
    act(() => {
      vi.advanceTimersByTime(220);
    });
    expect(view.result.current.canRotate).toBe(true);
    expect(view.result.current.metricRemainingMs).toBe(8000);
    act(() => {
      vi.advanceTimersByTime(7900);
    });
    expect(view.result.current.metricIndex).toBe(1);
    act(() => {
      vi.advanceTimersByTime(280);
    });
    expect(view.result.current.metricIndex).toBe(2);
    view.unmount();
    expect(vi.getTimerCount()).toBe(0);
  });
  it('does not transition a single favorite and settles immediately if reduced motion changes mid-exit', () => {
    const single = renderHook(() => useDashboardMetricRotation(1, false, false));
    act(() => single.result.current.nextMetric());
    expect(single.result.current.metricExiting).toBe(false);
    expect(single.result.current.metricIndex).toBe(0);
    single.unmount();
    const view = renderHook(({ reduced }) => useDashboardMetricRotation(2, false, reduced), {
      initialProps: { reduced: false }
    });
    act(() => view.result.current.nextMetric());
    view.rerender({ reduced: true });
    act(() => {
      vi.advanceTimersByTime(0);
    });
    expect(view.result.current.metricIndex).toBe(1);
    expect(view.result.current.metricExiting).toBe(false);
    expect(view.result.current.canRotate).toBe(false);
  });
  it('queues input during entry until the group has finished entering', () => {
    const view = renderHook(() => useDashboardMetricRotation(3, false, false));
    act(() => view.result.current.nextMetric());
    act(() => {
      vi.advanceTimersByTime(180);
    });
    act(() => {
      view.result.current.nextMetric();
      view.result.current.nextMetric();
    });
    expect(view.result.current.metricIndex).toBe(1);
    act(() => {
      vi.advanceTimersByTime(220);
    });
    expect(view.result.current.metricExiting).toBe(true);
    expect(view.result.current.metricIndex).toBe(1);
    act(() => {
      vi.advanceTimersByTime(180);
    });
    expect(view.result.current.metricIndex).toBe(0);
    act(() => {
      vi.advanceTimersByTime(220);
    });
    expect(view.result.current.canRotate).toBe(true);
    expect(view.result.current.metricRemainingMs).toBe(8000);
  });
});
