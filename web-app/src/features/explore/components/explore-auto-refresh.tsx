/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import { Select } from 'antd';
import type { TFunction } from 'i18next';
import { globalAutoRefreshValues, type SharedTimeValue } from '@/shared/time';
import type { ExploreQuery } from '../model/explore-model';
import styles from './explore-signal-time-toolbar.module.css';
export function ExploreAutoRefresh({
  query,
  time,
  t
}: {
  query: ExploreQuery;
  time: SharedTimeValue | null | undefined;
  t: TFunction;
}) {
  if (query.start != null || query.end != null || !time) return null;
  const label = (interval: number) =>
    interval === 0 ? t('shell.time.autoRefreshOff') : t('shell.time.autoRefreshSeconds', { seconds: interval / 1000 });
  return (
    <Select<number>
      className={styles.autoRefresh ?? ''}
      aria-label={`${t('explore.autoRefresh')}: ${label(time.autoRefreshMs)}`}
      value={time.autoRefreshMs}
      options={globalAutoRefreshValues.map(value => ({ value, label: label(value) }))}
      onChange={interval => time.setAutoRefresh(interval)}
    />
  );
}
