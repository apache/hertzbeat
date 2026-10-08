/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import type { TFunction } from 'i18next';
import { Select } from 'antd';
import { type LogAnalysisState, LOG_ANALYSIS_INTERVALS } from '@/platform/perses';

import styles from './explore-log-analysis.module.css';
export function ExploreLogIntervalControls({
  value,
  onChange,
  t
}: {
  value: LogAnalysisState;
  onChange: (value: LogAnalysisState) => void;
  t: TFunction;
}) {
  if (value.representation !== 'timeseries') return null;
  const options = [
    ...new Set([...LOG_ANALYSIS_INTERVALS, ...(value.intervalMs === undefined ? [] : [value.intervalMs])])
  ];
  return (
    <>
      <label>
        {t('explore.logAnalysis.rollup')}
        <Select<number | ''>
          value={value.intervalMs ?? ''}
          popupMatchSelectWidth={false}
          onChange={interval => onChange({ ...value, intervalMs: interval === '' ? undefined : interval })}
          options={[
            { value: '', label: t('explore.logAnalysis.autoInterval') },
            ...options.map(interval => ({ value: interval, label: intervalLabel(interval, t) }))
          ]}
        />
      </label>
      <p className={styles.measureHint}>{t('explore.logAnalysis.intervalLimit')}</p>
    </>
  );
}
function intervalLabel(value: number, t: TFunction) {
  const [unit, divisor] =
    value >= 86400000
      ? (['rollupDays', 86400000] as const)
      : value >= 3600000
        ? (['rollupHours', 3600000] as const)
        : value >= 60000
          ? (['rollupMinutes', 60000] as const)
          : (['rollupSeconds', 1000] as const);
  return t(`explore.logAnalysis.${unit}`, { count: value / divisor });
}
export function ExploreLogIntervalFailure({ onUseAuto, t }: { onUseAuto?: (() => void) | undefined; t: TFunction }) {
  return (
    <div className={styles.state} role="status">
      <p>{t('explore.logAnalysis.intervalTooSmall')}</p>
      <p>{t('explore.logAnalysis.intervalLimit')}</p>
      <button type="button" disabled={!onUseAuto} onClick={onUseAuto}>
        {t('explore.logAnalysis.useAuto')}
      </button>
    </div>
  );
}

export function ExploreLogIntervalSummary({ intervalMs, t }: { intervalMs: number | null; t: TFunction }) {
  return intervalMs === null ? null : <span>{t('explore.logAnalysis.interval', { seconds: intervalMs / 1000 })}</span>;
}
