/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
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

import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { Monitor, MonitorPage } from '../model/monitor-contract';
import { monitorDisappearanceGraceMs } from '../model/monitor-list-snapshot';
import { useMonitorListSnapshot, type MonitorListReadModeRef } from './use-monitor-list-snapshot';

describe('useMonitorListSnapshot', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  it('expires only an automatic disappearance and cleans its timer', () => {
    const mode: MonitorListReadModeRef = { current: 'authoritative' };
    const initial = page([monitor(7), monitor(8)]);
    const rendered = renderHook(({ value }) => useMonitorListSnapshot('scope', value, mode), {
      initialProps: { value: initial }
    });

    mode.current = 'automatic';
    rendered.rerender({ value: page([monitor(7)]) });
    expect(rendered.result.current?.content).toMatchObject([
      { id: 7, displayState: 'active' },
      { id: 8, displayState: 'disappeared' }
    ]);
    expect(vi.getTimerCount()).toBe(1);

    act(() => {
      vi.advanceTimersByTime(monitorDisappearanceGraceMs - 1);
    });
    expect(rendered.result.current?.content).toHaveLength(2);
    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(rendered.result.current?.content).toEqual([expect.objectContaining({ id: 7 })]);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('cancels expiry when the row reappears before the deadline', () => {
    const mode: MonitorListReadModeRef = { current: 'authoritative' };
    const rendered = renderHook(({ value }) => useMonitorListSnapshot('scope', value, mode), {
      initialProps: { value: page([monitor(7), monitor(8)]) }
    });
    mode.current = 'automatic';
    rendered.rerender({ value: page([monitor(7)]) });
    expect(vi.getTimerCount()).toBe(1);

    mode.current = 'automatic';
    rendered.rerender({ value: page([monitor(7), monitor(8)]) });
    expect(rendered.result.current?.content).toEqual([
      expect.objectContaining({ id: 7, displayState: 'active' }),
      expect.objectContaining({ id: 8, displayState: 'active' })
    ]);
    expect(vi.getTimerCount()).toBe(0);
    act(() => {
      vi.advanceTimersByTime(monitorDisappearanceGraceMs);
    });
    expect(rendered.result.current?.content).toHaveLength(2);
  });

  it('clears a pending grace timer on unmount', () => {
    const mode: MonitorListReadModeRef = { current: 'authoritative' };
    const rendered = renderHook(({ value }) => useMonitorListSnapshot('scope', value, mode), {
      initialProps: { value: page([monitor(7), monitor(8)]) }
    });
    mode.current = 'automatic';
    rendered.rerender({ value: page([monitor(7)]) });
    expect(vi.getTimerCount()).toBe(1);

    rendered.unmount();

    expect(vi.getTimerCount()).toBe(0);
  });
});

function page(content: Monitor[]): MonitorPage {
  return {
    content,
    totalElements: content.length,
    totalPages: content.length === 0 ? 0 : 1,
    number: 0,
    size: 10
  };
}

function monitor(id: number): Monitor {
  return { id, name: `monitor-${id}`, app: 'website', instance: `instance-${id}`, status: 1 };
}
