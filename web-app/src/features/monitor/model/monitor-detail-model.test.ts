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

import {
  monitorHistoryRows,
  monitorMetricOptions,
  monitorRealtimeRows,
  parseMonitorRouteId
} from './monitor-detail-model';

describe('monitor detail model', () => {
  it('extracts visible numeric metric fields', () => {
    expect(
      monitorMetricOptions([
        {
          name: 'summary',
          fields: [
            { field: 'responseTime', type: 0, unit: 'ms' },
            { field: 'hostCode', type: 0, label: true },
            { field: 'status', type: 1 }
          ]
        },
        { name: 'hidden', visible: false, fields: [{ field: 'value', type: 0 }] }
      ])
    ).toEqual([{ key: 'summary.responseTime', group: 'summary', field: 'responseTime', unit: 'ms' }]);
  });

  it('normalizes realtime and history values into inspectable rows', () => {
    const empty = { mean: null, median: null, min: null, max: null };
    const metric = { key: 'summary.responseTime', group: 'summary', field: 'responseTime' };
    expect(
      monitorRealtimeRows(
        {
          fields: [
            { name: 'status', type: 0, unit: null, label: false },
            { name: 'responseTime', type: 0, unit: 'ms', label: false }
          ],
          valueRows: [
            {
              labels: { host: 'a' },
              values: [
                { ...empty, origin: '200', time: 1000 },
                { ...empty, origin: '12', time: 0 }
              ]
            }
          ]
        },
        metric
      )
    ).toEqual([{ key: '0', labels: { host: 'a' }, value: '12', time: 0 }]);
    expect(
      monitorHistoryRows({
        values: { 'host=a': [{ origin: null, mean: '11', median: null, min: null, max: null, time: 1000 }] }
      })
    ).toEqual([{ key: 'host=a:0', series: 'host=a', value: '11', time: 1000 }]);
  });

  it('accepts only positive safe route ids', () => {
    expect(parseMonitorRouteId('7')).toBe(7);
    expect(parseMonitorRouteId('0')).toBeUndefined();
    expect(parseMonitorRouteId('7.5')).toBeUndefined();
    expect(parseMonitorRouteId('9007199254740992')).toBeUndefined();
  });
});
