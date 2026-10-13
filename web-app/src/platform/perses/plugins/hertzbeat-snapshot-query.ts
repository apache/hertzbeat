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

import type { LogQueryPlugin, PluginModuleResource, TimeSeriesQueryPlugin } from '@perses-dev/plugin-system';
import type { LogData, TimeSeriesData } from '@perses-dev/spec';

export const HERTZBEAT_SNAPSHOT_QUERY_KIND = 'HertzBeatSnapshotTimeSeriesQuery';
export const HERTZBEAT_SNAPSHOT_LOG_QUERY_KIND = 'HertzBeatSnapshotLogQuery';

export type HertzBeatSnapshotQuerySpec = {
  data: TimeSeriesData;
};
export type HertzBeatSnapshotLogQuerySpec = { data: LogData };

const emptyData: TimeSeriesData = {
  timeRange: { start: new Date(0), end: new Date(1) },
  stepMs: 15_000,
  series: []
};

export const HertzBeatSnapshotTimeSeriesQuery: TimeSeriesQueryPlugin<HertzBeatSnapshotQuerySpec> = {
  createInitialOptions: () => ({ data: emptyData }),
  getTimeSeriesData: spec => Promise.resolve(spec.data)
};

export const HertzBeatSnapshotLogQuery: LogQueryPlugin<HertzBeatSnapshotLogQuerySpec> = {
  createInitialOptions: () => ({ data: { entries: [] } }),
  getLogData: (spec, context) =>
    Promise.resolve({
      logs: spec.data,
      timeRange: spec.data.timeRange ?? context.timeRange
    })
};

export const hertzBeatSnapshotPluginModule: PluginModuleResource = {
  kind: 'PluginModule',
  metadata: { name: 'hertzbeat-perses-runtime', version: '2.0.0' },
  spec: {
    plugins: [
      {
        kind: 'TimeSeriesQuery',
        spec: {
          name: HERTZBEAT_SNAPSHOT_QUERY_KIND,
          display: {
            name: 'HertzBeat metric snapshot',
            description: 'Renders an authorized metric response already loaded through the HertzBeat API.'
          }
        }
      },
      {
        kind: 'LogQuery',
        spec: {
          name: HERTZBEAT_SNAPSHOT_LOG_QUERY_KIND,
          display: {
            name: 'HertzBeat log snapshot',
            description: 'Renders authorized logs already loaded through the HertzBeat API.'
          }
        }
      }
    ]
  }
};
