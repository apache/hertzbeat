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

export interface HistoryChartMetric {
  metrics: string;
  metric: string;
  unit?: string;
}

export interface HistoryChartGroup {
  name: string;
  charts: HistoryChartMetric[];
}

// Keep definition order and the original chart objects, so loading a new page does not recreate existing charts.
export function groupHistoryCharts(charts: HistoryChartMetric[]): HistoryChartGroup[] {
  const groups = new Map<string, HistoryChartGroup>();
  for (const chart of charts) {
    let group = groups.get(chart.metrics);
    if (!group) {
      group = { name: chart.metrics, charts: [] };
      groups.set(chart.metrics, group);
    }
    group.charts.push(chart);
  }
  return Array.from(groups.values());
}
