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

import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { MonitorHistoryChart } from './monitor-detail-model';
import { monitorHistoryImageFilename, saveMonitorHistoryImage } from './monitor-history-image-download';

const download = vi.hoisted(() => vi.fn());
vi.mock('@/shared/browser-download', () => ({ saveBrowserDownload: download }));
const chart: MonitorHistoryChart = {
  metric: { key: 'summary.responseTime', group: 'summary', field: 'responseTime' },
  history: '30m',
  interval: false,
  result: { kind: 'ready', rows: [] }
};

describe('monitor history image download', () => {
  beforeEach(() => {
    download.mockReset();
  });
  it('uses the existing download boundary with PNG bytes and the metric/range/mode filename', () => {
    saveMonitorHistoryImage('data:image/png;base64,iVBORw0KGgo=', chart);
    const artifact = download.mock.calls[0]![0];
    expect(artifact.filename).toBe('hertzbeat-summary.responseTime-30m-raw.png');
    expect(artifact.data.type).toBe('image/png');
    expect(artifact.data.size).toBe(8);
    expect(monitorHistoryImageFilename({ ...chart, history: '6h', interval: true })).toBe(
      'hertzbeat-summary.responseTime-6h-aggregated.png'
    );
  });
  it('keeps filenames portable and bounded without modifying the metric identity', () => {
    const key = '../unsafe/metric:<field>?\\name*' + 'x'.repeat(300);
    const input = { ...chart, metric: { ...chart.metric, key } };
    const filename = monitorHistoryImageFilename(input);
    expect(filename).not.toMatch(/[<>:"/\\|?*]/);
    expect(filename.length).toBeLessThan(180);
    expect(input.metric.key).toBe(key);
  });
  it.each([
    '',
    'data:image/png;base64,',
    'data:image/png;base64,???',
    'data:image/svg+xml;base64,PHN2Zz4=',
    'https://example.com/chart.png'
  ])('rejects unavailable or non-PNG payloads before downloading %#', value => {
    expect(() => saveMonitorHistoryImage(value, chart)).toThrow();
    expect(download).not.toHaveBeenCalled();
  });
  it('propagates a download failure for localized UI handling', () => {
    download.mockImplementation(() => {
      throw new Error('blocked');
    });
    expect(() => saveMonitorHistoryImage('data:image/png;base64,iVBORw0KGgo=', chart)).toThrow('blocked');
  });
});
