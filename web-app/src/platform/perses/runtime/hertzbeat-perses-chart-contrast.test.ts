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

import { init } from 'echarts';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createHertzBeatPersesTheme } from './hertzbeat-perses-theme';
import { createHertzBeatChartsTheme } from './hertzbeat-perses-charts-theme';

describe('native compact histogram theme', () => {
  beforeEach(() => vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null));
  afterEach(() => vi.restoreAllMocks());
  it.each(['default', 'dark'] as const)(
    'renders a contrast-safe %s histogram without changing metric palettes',
    mode => {
      const theme = createHertzBeatPersesTheme(mode, true);
      const histogram = createHertzBeatChartsTheme(theme, true);
      expect(histogram.echartsTheme.color).toEqual([theme.palette.primary.main]);
      expect(createHertzBeatChartsTheme(theme).echartsTheme.color).not.toEqual(histogram.echartsTheme.color);
      const foreground = rgb(theme.palette.primary.main);
      const background = rgb(theme.palette.background.paper);
      expect(contrast(foreground, background)).toBeGreaterThanOrEqual(3);
      expect(
        contrast(
          foreground.map((value, index) => value * 0.9 + background[index]! * 0.1),
          background
        )
      ).toBeGreaterThanOrEqual(3);
      const chart = init(null, histogram.echartsTheme, { renderer: 'svg', ssr: true, width: 350, height: 84 });
      try {
        chart.setOption({
          animation: false,
          xAxis: { type: 'category' },
          yAxis: {},
          series: [{ type: 'bar', data: [2, 4] }]
        });
        expect(chart.renderToSVGString()).toContain(`fill="${theme.palette.primary.main}"`);
      } finally {
        chart.dispose();
      }
    }
  );

  it.each(['default', 'dark'] as const)('renders a neutral %s count histogram at 3:1 contrast', mode => {
    const theme = createHertzBeatPersesTheme(mode, true);
    const color = theme.palette.text.secondary;
    const histogram = createHertzBeatChartsTheme(theme, true, false, 12);
    expect(histogram.echartsTheme.color).toEqual([color]);
    expect(contrast(rgb(color), rgb(theme.palette.background.paper))).toBeGreaterThanOrEqual(3);
    const chart = init(null, histogram.echartsTheme, { renderer: 'svg', ssr: true, width: 350, height: 84 });
    try {
      chart.setOption({ xAxis: { type: 'category' }, yAxis: {}, series: [{ type: 'bar', data: [2, 4] }] });
      expect(chart.renderToSVGString()).toContain(`fill="${color}"`);
    } finally {
      chart.dispose();
    }
  });

  it('disables native chart animation only when reduced motion is requested', () => {
    const theme = createHertzBeatPersesTheme('default');
    expect(createHertzBeatChartsTheme(theme).echartsTheme).not.toHaveProperty('animation');
    const reduced = createHertzBeatChartsTheme(theme, false, true);
    const chart = init(null, reduced.echartsTheme, { renderer: 'svg', ssr: true, width: 350, height: 84 });
    try {
      chart.setOption({ xAxis: {}, yAxis: {}, series: [{ type: 'line', data: [2, 4] }] });
      expect(chart.getOption().animation).toBe(false);
    } finally {
      chart.dispose();
    }
  });
});

function rgb(hex: string) {
  return [1, 3, 5].map(index => Number.parseInt(hex.slice(index, index + 2), 16));
}

function luminance(color: number[]) {
  const channels = color.map(value => {
    const normalized = value / 255;
    return normalized <= 0.04045 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4;
  });
  return channels.reduce((sum, value, index) => sum + value * [0.2126, 0.7152, 0.0722][index]!, 0);
}

function contrast(foreground: number[], background: number[]) {
  const first = luminance(foreground);
  const second = luminance(background);
  return (Math.max(first, second) + 0.05) / (Math.min(first, second) + 0.05);
}
