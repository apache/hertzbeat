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
