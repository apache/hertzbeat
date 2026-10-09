/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
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
