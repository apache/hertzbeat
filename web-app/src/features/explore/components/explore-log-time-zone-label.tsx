/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import { Tooltip } from 'antd';
import { formatInTimeZone } from 'date-fns-tz';
import type { TFunction } from 'i18next';
import styles from './explore-time-control.module.css';

export function LogTimeZoneLabel({
  zone,
  window,
  t
}: {
  zone: string;
  window: { from: number; to: number };
  t: TFunction;
}) {
  const from = formatInTimeZone(window.from, zone, 'O');
  const to = formatInTimeZone(window.to, zone, 'O');
  return (
    <Tooltip title={zone} trigger={['hover', 'focus']}>
      <span
        className={styles.inlineZone}
        data-explore-time-part="zone"
        tabIndex={0}
        aria-label={t('explore.timeControl.zone', { zone })}
      >
        {from === to ? from : `${from} → ${to}`}
      </span>
    </Tooltip>
  );
}
