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
