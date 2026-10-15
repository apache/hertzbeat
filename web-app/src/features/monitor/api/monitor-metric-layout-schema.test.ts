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

import { describe, expect, it } from 'vitest';

import { MonitorMetricLayoutContractError, parseMonitorMetricLayout } from './monitor-metric-layout-schema';

describe('monitor metric layout schema', () => {
  it('keeps missing and configured layouts distinct', () => {
    expect(parseMonitorMetricLayout(null)).toBeNull();
    expect(parseMonitorMetricLayout(layout())).toEqual(layout());
  });

  it.each([
    { ...layout(), columns: 6 },
    { ...layout(), password: 'must-not-pass' },
    { ...layout(), items: [{ ...layout().items[0], w: 5 }] },
    { ...layout(), items: [layout().items[0], { ...layout().items[0], order: 1 }] }
  ])('rejects malformed, expanded, or ambiguous documents', value => {
    expect(() => parseMonitorMetricLayout(value)).toThrow(MonitorMetricLayoutContractError);
  });
});

function layout() {
  return {
    application: 'mysql',
    revision: 'layout-r1',
    schemaVersion: 1,
    mode: 'custom',
    columns: 12,
    items: [{ group: 'basic', x: 0, y: 0, w: 6, h: 10, collapsed: false, order: 0 }],
    historyDock: { collapsed: false, height: 12 }
  } as const;
}
