/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import type { TFunction } from 'i18next';
import { Select } from 'antd';
import type { LogComparison } from '@/platform/perses';
import styles from './explore-log-comparison-editor.module.css';
const choices = [
  [3600000, 'hourEarlier'],
  [86400000, 'dayEarlier'],
  [604800000, 'weekEarlier']
] as const;
export function ExploreLogComparisonTimeShiftControl({
  comparison,
  change,
  t
}: {
  comparison: LogComparison;
  change: (value: LogComparison) => void;
  t: TFunction;
}) {
  return (
    <label className={styles.offset}>
      {t('explore.logComparison.timeShift')}
      <Select<number | ''>
        value={comparison.timeShiftMs ?? ''}
        popupMatchSelectWidth={false}
        onChange={timeShift => change({ ...comparison, timeShiftMs: timeShift === '' ? undefined : timeShift })}
        options={[
          { value: '', label: t('explore.logComparison.sameWindow') },
          ...choices.map(([value, key]) => ({ value, label: t(`explore.logComparison.${key}`) })),
          ...(comparison.timeShiftMs !== undefined && !choices.some(([value]) => value === comparison.timeShiftMs)
            ? [{ value: comparison.timeShiftMs, label: comparison.timeShiftMs }]
            : [])
        ]}
      />
    </label>
  );
}
