/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import { formatLogNumericValue } from './log-throughput-display';
import type { TFunction } from 'i18next';
import { type LogComparisonResult } from '../../logs/log-comparison-result';
import { comparisonValues } from '../../logs/log-comparison-values';
import { formatComparisonTimestamp } from './log-timeshift-display';

import { comparisonGroupLabel } from './log-comparison-values-display';
import { LogThroughputBucket } from './log-throughput-bucket';
export function LogComparisonBucketDetails({
  data,
  t,
  timeZone,
  timestamp
}: {
  data: LogComparisonResult;
  t: TFunction;
  timeZone?: string | undefined;
  timestamp: number;
}) {
  const shift = data.bTimeShiftMs;
  return (
    <div>
      <div>{t('explore.logComparison.alignedBucket', { time: formatComparisonTimestamp(timestamp, timeZone) })}</div>
      {shift !== undefined && (
        <div>
          {t('explore.logComparison.historicalBucket', {
            time: formatComparisonTimestamp(timestamp - shift, timeZone)
          })}
        </div>
      )}
      {data.analysis.transform && (
        <LogThroughputBucket
          timestamp={timestamp}
          intervalMs={data.intervalMs!}
          window={data.window}
          t={t}
          items={data.groups.flatMap(group => {
            const bucket = group.buckets.find(item => item.start === timestamp);
            return bucket
              ? (['a', 'b'] as const).map(source => ({
                  label: `${source}: ${comparisonGroupLabel(group, t)}`,
                  count: bucket[source].count,
                  measurement: bucket[source].measurement
                }))
              : [];
          })}
        >
          <ComparisonBucketFormula data={data} timestamp={timestamp} t={t} />
        </LogThroughputBucket>
      )}
    </div>
  );
}

function ComparisonBucketFormula({
  data,
  timestamp,
  t
}: {
  data: LogComparisonResult;
  timestamp: number;
  t: TFunction;
}) {
  if (!data.analysis.transform || !data.formula) return null;
  const value = comparisonValues(data, true);
  return (
    <dl>
      {data.groups.flatMap(group => {
        const bucket = group.buckets.find(item => item.start === timestamp);
        if (!bucket) return [];
        const result = value(bucket, 'formula');
        return [
          <div key={JSON.stringify(group.keys)}>
            <dt>
              {t('explore.logComparison.formula')}: {data.formula} · {comparisonGroupLabel(group, t)}
            </dt>
            <dd>{result === null ? t('explore.logComparison.unavailable') : formatLogNumericValue(result)}</dd>
          </div>
        ];
      })}
    </dl>
  );
}
