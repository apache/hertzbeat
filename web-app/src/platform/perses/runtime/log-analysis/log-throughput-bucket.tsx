/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import { formatLogNumericValue } from './log-throughput-display';
import type { ReactNode } from 'react';
import type { TFunction } from 'i18next';
import { type LogMeasurement } from '../../logs/log-measure';
import { isPartialLogBucket, normalizeLogBucketValue } from '../../logs/log-throughput';

import { LogMeasureValue } from './log-measure-value';
import styles from './log-analysis-timeseries.module.css';
type BucketItem = { label: string; count: number; measurement?: LogMeasurement | undefined };
export function LogThroughputBucket({
  timestamp,
  intervalMs,
  window,
  items,
  children,
  t
}: {
  timestamp: number;
  intervalMs: number;
  window: { start: number; end: number };
  items: BucketItem[];
  children?: ReactNode;
  t: TFunction;
}) {
  return (
    <div>
      <div>{t('explore.logAnalysis.nominalInterval', { seconds: intervalMs / 1000 })}</div>
      {isPartialLogBucket(timestamp, intervalMs, window) && <div>{t('explore.logAnalysis.partialBucket')}</div>}
      <div className={styles.rawBuckets} tabIndex={0} role="region" aria-label={t('explore.logAnalysis.rawBucket')}>
        <strong>{t('explore.logAnalysis.rawBucket')}</strong>
        <dl>
          {items.map((item, index) => (
            <div key={index}>
              <dt>{item.label}</dt>
              <dd>
                <RawBucketValue item={item} intervalMs={intervalMs} t={t} />
              </dd>
            </div>
          ))}
        </dl>
        {children}
      </div>
    </div>
  );
}
function RawBucketValue({ item, intervalMs, t }: { item: BucketItem; intervalMs: number; t: TFunction }) {
  const rate = normalizeLogBucketValue(
    item.measurement ? item.measurement.value : item.count,
    intervalMs,
    'throughput'
  );
  let rateValue: ReactNode = rate === null ? t('explore.logAnalysis.non_finite') : formatLogNumericValue(rate);
  if (item.measurement && item.measurement.state !== 'ready') {
    rateValue = <LogMeasureValue measurement={item.measurement} t={t} />;
  }
  return (
    <>
      <div>
        {t('explore.logAnalysis.count')}: {item.count.toLocaleString()}
      </div>
      {item.measurement && (
        <div>
          <LogMeasureValue measurement={item.measurement} t={t} /> ·{' '}
          {t('explore.logAnalysis.sampleCount', { count: item.measurement.sampleCount })}
        </div>
      )}
      <div>
        {t('explore.logAnalysis.throughput')}: {rateValue}{' '}
        {t(item.measurement ? 'explore.logAnalysis.throughputValueUnit' : 'explore.logAnalysis.throughputLogsUnit')}
      </div>
    </>
  );
}
