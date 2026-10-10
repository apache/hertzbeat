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

import { formatComparisonTimestamp } from './log-timeshift-display';
import type { TFunction } from 'i18next';
import type { LogAnalysisGroup, LogAnalysisResult } from '../../logs/log-analysis';
import { LogThroughputBucket } from './log-throughput-bucket';
export function LogAnalysisBucketDetails({
  data,
  groupLabel,
  timestamp,
  t,
  timeZone
}: {
  data: LogAnalysisResult;
  groupLabel: (group: LogAnalysisGroup) => string;
  timestamp: number;
  t: TFunction;
  timeZone?: string | undefined;
}) {
  return (
    <>
      <div>{formatComparisonTimestamp(timestamp, timeZone)}</div>
      <LogThroughputBucket
        timestamp={timestamp}
        intervalMs={data.intervalMs!}
        window={data.window}
        t={t}
        items={data.groups.flatMap(group => {
          const bucket = group.buckets.find(item => item.start === timestamp);
          return bucket ? [{ label: groupLabel(group), count: bucket.count, measurement: bucket.measurement }] : [];
        })}
      />
    </>
  );
}
