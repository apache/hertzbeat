/*
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { groupHistoryCharts, HistoryChartMetric } from './history-chart-groups';

describe('groupHistoryCharts', () => {
  it('should return no groups for empty definitions', () => {
    expect(groupHistoryCharts([])).toEqual([]);
  });

  it('should group interleaved fields in definition order without copying or mutating charts', () => {
    const charts: HistoryChartMetric[] = [
      { metrics: 'cpu', metric: 'usage', unit: '%' },
      { metrics: 'memory', metric: 'usage', unit: 'MB' },
      { metrics: 'cpu', metric: 'idle', unit: '%' }
    ];
    const groups = groupHistoryCharts(charts);
    expect(groups.map(group => group.name)).toEqual(['cpu', 'memory']);
    expect(groups[0].charts).toEqual([charts[0], charts[2]]);
    expect(groups[1].charts[0]).toBe(charts[1]);
    expect(groups[0].charts[0]).toBe(charts[0]);
    expect(charts.map(chart => chart.metrics)).toEqual(['cpu', 'memory', 'cpu']);
  });
});
