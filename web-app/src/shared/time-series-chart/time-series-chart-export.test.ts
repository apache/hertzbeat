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

import { afterEach, describe, expect, it, vi } from 'vitest';

const chart = vi.hoisted(() => ({
  setOption: vi.fn(),
  getDataURL: vi.fn(() => 'data:image/png;base64,iVBORw=='),
  isDisposed: vi.fn(() => false),
  resize: vi.fn(),
  dispose: vi.fn()
}));
vi.mock('echarts/core', () => ({ use: vi.fn(), init: vi.fn(() => chart) }));

import { createTimeSeriesChart } from './time-series-chart-runtime';

describe('time series PNG export', () => {
  afterEach(() => {
    document.body.replaceChildren();
    vi.clearAllMocks();
  });

  it('captures the current chart with a high resolution theme background without rebuilding it', () => {
    const element = document.createElement('div');
    element.style.setProperty('--hb-bg-raised', '#ffffff');
    document.body.append(element);
    const runtime = createTimeSeriesChart(element, { title: 'summary.responseTime', series: [] });
    chart.setOption.mockClear();

    expect(runtime.exportPng()).toBe('data:image/png;base64,iVBORw==');
    expect(chart.getDataURL).toHaveBeenCalledWith({
      type: 'png',
      pixelRatio: 2,
      backgroundColor: '#ffffff',
      excludeComponents: ['toolbox']
    });
    expect(chart.setOption).not.toHaveBeenCalled();
    element.style.setProperty('--hb-bg-raised', '#11151c');
    runtime.exportPng();
    expect(chart.getDataURL).toHaveBeenLastCalledWith(expect.objectContaining({ backgroundColor: '#11151c' }));
    runtime.dispose();
  });

  it('propagates capture errors without returning a fabricated image', () => {
    const runtime = createTimeSeriesChart(document.createElement('div'), { title: 'summary.value', series: [] });
    chart.getDataURL.mockImplementationOnce(() => {
      throw new Error('capture failed');
    });
    expect(() => runtime.exportPng()).toThrow('capture failed');
    runtime.dispose();
  });
});
