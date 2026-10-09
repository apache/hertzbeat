/* Licensed to the Apache Software Foundation (ASF) under one or more contributor license agreements. */
import { Button } from 'antd';
import type { TFunction } from 'i18next';
import { EXPLORE_TIME_RANGES, type ExploreQuery, type ExploreTimeRange } from '../model/explore-model';
import styles from './explore-time-control.module.css';

type Props = {
  query: ExploreQuery;
  t: TFunction;
  zone: string;
  choose: (range: ExploreTimeRange) => void;
  cancel: () => void;
  apply: () => void;
  error: boolean;
};

export function TimePresets({ query, t, zone, choose, cancel, apply, error }: Props) {
  return (
    <div className={styles.footer}>
      <div className={styles.presets}>
        {EXPLORE_TIME_RANGES.map(value => (
          <Button
            key={value}
            type="text"
            aria-pressed={query.start == null && query.end == null && query.timeRange === value}
            onClick={() => choose(value)}
          >
            {t(`explore.timeRanges.${value}`)}
          </Button>
        ))}
      </div>
      {error && (
        <span className={styles.footerError} role="alert">
          {t('explore.timeControl.invalid')}
        </span>
      )}
      <div className={styles.footerNote}>
        <small>
          {t('explore.timeControl.zone', { zone })} · {t('explore.timeControl.limit')}
        </small>
        <div className={styles.footerActions}>
          <Button size="small" onClick={cancel}>
            {t('common.cancel')}
          </Button>
          <Button size="small" type="primary" onClick={apply}>
            {t('explore.timeControl.apply')}
          </Button>
        </div>
      </div>
    </div>
  );
}
