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
