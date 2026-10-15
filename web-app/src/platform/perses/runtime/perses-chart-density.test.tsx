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

import { act, cleanup, render } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { EChart } from '@perses-dev/components';

const engine = vi.hoisted(() => ({ init: vi.fn(), connect: vi.fn() }));
vi.mock('echarts/core', () => ({ ...engine, use: vi.fn() }));
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

it('resizes the existing native chart when its container changes without a window resize', () => {
  let notifyResize: ResizeObserverCallback | undefined;
  const disconnect = vi.fn();
  vi.stubGlobal(
    'ResizeObserver',
    class {
      constructor(callback: ResizeObserverCallback) {
        notifyResize = callback;
      }
      observe = vi.fn();
      disconnect = disconnect;
    }
  );
  vi.useFakeTimers();
  engine.init.mockReset();
  const chart = makeChart();
  engine.init.mockReturnValue(chart);
  const events = { click: vi.fn() };
  const { container, unmount } = render(<EChart option={{ series: [{ data: [1] }] }} onEvents={events} />);
  const host = container.firstElementChild!;
  expect(notifyResize).toBeDefined();
  const initialResizeCount = chart.resize.mock.calls.length;
  act(() => {
    notifyResize!(
      [{ target: host, contentRect: { width: 900, height: 104 } as DOMRectReadOnly } as ResizeObserverEntry],
      {} as ResizeObserver
    );
    notifyResize!(
      [{ target: host, contentRect: { width: 690, height: 104 } as DOMRectReadOnly } as ResizeObserverEntry],
      {} as ResizeObserver
    );
  });
  expect(engine.init).toHaveBeenCalledTimes(1);
  expect(chart.resize).toHaveBeenCalledTimes(initialResizeCount + 2);
  expect(chart.setOption).toHaveBeenCalledTimes(1);
  expect(chart.getOption).not.toHaveBeenCalled();
  expect(chart.dispose).not.toHaveBeenCalled();
  expect(chart.on).toHaveBeenCalledWith('click', expect.any(Function));
  unmount();
  expect(disconnect).toHaveBeenCalledOnce();
  const resizeCount = chart.resize.mock.calls.length;
  act(() => {
    window.dispatchEvent(new Event('resize'));
    vi.advanceTimersByTime(250);
  });
  expect(chart.resize).toHaveBeenCalledTimes(resizeCount);
});

it.each([1, 2])('preserves data, zoom, events and sync when changing from density %i', density => {
  const listeners = new Set<() => void>();
  vi.stubGlobal('devicePixelRatio', density);
  vi.stubGlobal('matchMedia', (media: string) => ({
    media,
    get matches() {
      return media === `(resolution: ${window.devicePixelRatio}dppx)`;
    },
    addEventListener: (_: string, listener: () => void) => listeners.add(listener),
    removeEventListener: (_: string, listener: () => void) => listeners.delete(listener)
  }));
  const instances: ReturnType<typeof makeChart>[] = [];
  engine.init.mockImplementation(() => {
    const chart = makeChart();
    instances.push(chart);
    return chart;
  });
  const onEvents = { click: vi.fn() };
  const props = { onEvents, syncGroup: 'density-proof' };
  const { rerender, unmount } = render(<EChart {...props} option={{ series: [{ data: [1] }] }} />);
  expect(engine.init.mock.lastCall?.[2]).toMatchObject({ devicePixelRatio: density });
  const updated = { series: [{ data: [7, 8] }] };
  rerender(<EChart {...props} option={updated} />);
  const current = { ...updated, dataZoom: [{ start: 25, end: 75 }] };
  instances[0]!.getOption.mockReturnValue(current);
  act(() => {
    vi.stubGlobal('devicePixelRatio', 3 - density);
    for (const listener of [...listeners]) listener();
  });
  expect(engine.init.mock.lastCall?.[2]).toMatchObject({ devicePixelRatio: 3 - density });
  expect(instances[0]!.dispose).toHaveBeenCalledOnce();
  expect(instances[1]!.setOption).toHaveBeenCalledWith(current, true);
  expect(instances[1]!.on).toHaveBeenCalledWith('click', expect.any(Function));
  expect(instances[1]!.group).toBe('density-proof');
  unmount();
  expect(listeners.size).toBe(0);
  expect(instances[1]!.dispose).toHaveBeenCalledOnce();
});

function makeChart() {
  return {
    setOption: vi.fn(),
    getOption: vi.fn<() => object>(() => ({})),
    dispose: vi.fn(),
    isDisposed: () => false,
    resize: vi.fn(),
    on: vi.fn(),
    off: vi.fn(),
    group: ''
  };
}
