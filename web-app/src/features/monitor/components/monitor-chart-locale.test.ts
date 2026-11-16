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

import { describe, expect, it } from 'vitest';

import { buildMonitorHistoryChartOption } from './monitor-history-chart-runtime';
import { formatMonitorDuration, formatMonitorTimestamp } from './monitor-signal-view-formatters';

const colors = {
  text: '#ddd',
  muted: '#888',
  border: '#333',
  grid: '#222',
  background: '#111',
  accent: '#955',
  available: '#595',
  degraded: '#995'
};
const series = [{ name: 'process-1', points: [[1, 1_000_000_000]] as [number, number][] }];

function chart(locale: string, unit: string | undefined = 'B', multiple = true) {
  return buildMonitorHistoryChartOption(
    {
      title: 'processes.working_set',
      locale,
      unit,
      series: multiple ? [...series, { ...series[0]!, name: 'process-2' }] : series
    },
    colors
  ) as unknown as {
    grid: { top: number };
    legend: { top: number };
    yAxis: { name: string | undefined; axisLabel: { formatter: (value: number) => string } };
  };
}

describe('monitor chart layout and presentation locale', () => {
  it('reserves an axis-unit row below the scroll legend without removing the unit', () => {
    const option = chart('en-US');
    expect(option.yAxis.name).toBe('B');
    expect(option.grid.top).toBeGreaterThanOrEqual(64);
    expect(option.grid.top).toBeGreaterThan(chart('en-US', '', true).grid.top);
    expect(chart('en-US', 'B', false).grid.top).toBe(26);
  });

  it.each(['en-US', 'zh-CN', 'zh-TW', 'ja-JP', 'pt-BR'])(
    'formats axis values with %s, not browser defaults',
    locale => {
      const format = chart(locale).yAxis.axisLabel.formatter;
      expect(format(1_000_000_000)).toBe(
        new Intl.NumberFormat(locale, {
          notation: 'compact',
          maximumFractionDigits: 1
        }).format(1_000_000_000)
      );
      expect(format(1.25)).toBe(
        new Intl.NumberFormat(locale, {
          maximumFractionDigits: 2,
          useGrouping: false
        }).format(1.25)
      );
      expect(format(Number.NaN)).toBe('');
    }
  );

  it.each(['en-US', 'zh-CN', 'pt-BR'])(
    'localizes collection facts in %s while preserving the requested timezone',
    locale => {
      const value = Date.UTC(2026, 9, 16, 13, 29, 8);
      const timeZone = 'Asia/Shanghai';
      expect(formatMonitorTimestamp(value, timeZone, locale)).toBe(
        new Intl.DateTimeFormat(locale, {
          dateStyle: 'medium',
          timeStyle: 'medium',
          timeZone
        }).format(value)
      );
      expect(formatMonitorTimestamp(value, 'America/New_York', locale)).toBe(
        new Intl.DateTimeFormat(locale, {
          dateStyle: 'medium',
          timeStyle: 'medium',
          timeZone: 'America/New_York'
        }).format(value)
      );
      expect(formatMonitorDuration(1234, locale)).toBe(
        `${new Intl.NumberFormat(locale, {
          maximumFractionDigits: 0
        }).format(1234)} ms`
      );
    }
  );

  it('keeps invalid evidence unavailable', () => {
    expect(formatMonitorTimestamp(Number.NaN, 'Asia/Shanghai', 'en-US')).toBeUndefined();
    expect(formatMonitorTimestamp(1, 'invalid/zone', 'en-US')).toBeUndefined();
  });
});
