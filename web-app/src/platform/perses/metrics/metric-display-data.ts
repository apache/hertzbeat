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

import type { ExactTimeWindow } from '@/shared/query-context';
import type { HertzBeatMetricData } from '../datasource/hertzbeat-query-schema';
import { metricNumber, type MetricSeries } from './metric-series';

export function metricDisplayData(series: MetricSeries[], timeWindow: ExactTimeWindow): HertzBeatMetricData {
  return {
    source: null,
    timeWindow,
    series: series.map(item => ({
      ...item,
      displayName: item.refId ? `${item.refId} · ${item.name}` : item.name,
      points: item.points.flatMap(point => {
        const timestamp = metricNumber(point[0]);
        return timestamp == null ? [] : [{ timestamp, value: metricNumber(point[1]) ?? null }];
      })
    }))
  };
}
