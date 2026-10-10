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

import { parseMetricView, parseLogView, parseLogAnalysis } from '@/platform/perses';
import type { ExploreQuery } from './explore-query';
import { readTraceView } from './explore-trace-view';
export function panelOptions(query: ExploreQuery, pinned: boolean) {
  if (query.signal === 'metrics') return query.metricView ? { metricView: parseMetricView(query.metricView) } : {};
  if (query.signal === 'logs' && query.logView) {
    const view = parseLogView(query.logView);
    return { columns: view.columns, density: view.density, allowWrap: view.wrap };
  }
  if (query.signal === 'traces' && !pinned && query.traceView) {
    const view = readTraceView(query.traceView);
    if (!view) throw new Error('Invalid trace view');
    return { columns: view.columns, density: view.density };
  }
  return {};
}

export function analyticalPanelHeight(analysis: ReturnType<typeof parseLogAnalysis> | undefined) {
  if (analysis?.representation === 'timeseries') return analysis.comparison ? 16 : 12;
  return analysis?.comparison ? 12 : 8;
}
