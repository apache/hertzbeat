/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { Alert, Button, Select, Typography } from 'antd';
import type { TFunction } from 'i18next';

import {
  EXPLORE_TIME_RANGES,
  exploreHandoffState,
  exploreUsesExactWindow,
  presetTimeRangePatch,
  type ExploreQuery,
  type ExploreQueryPatch,
  type ExploreSignal,
  type ExploreTimeRange
} from '../model/explore-model';
import styles from './explore-workbench.module.css';

const signalKeys: ExploreSignal[] = ['metrics', 'logs', 'traces'];

type Props = {
  query: ExploreQuery;
  t: TFunction;
  updateQuery: (changes: ExploreQueryPatch) => void;
};

export function ExploreWorkbench({ query, t, updateQuery }: Props) {
  const handoffState = exploreHandoffState(query);
  const exactWindow = exploreUsesExactWindow(query);
  const updateTimeRange = (value: string) => {
    if (!EXPLORE_TIME_RANGES.includes(value as ExploreTimeRange)) return;
    const timeRange = value as ExploreTimeRange;
    updateQuery(presetTimeRangePatch(query, timeRange));
  };
  const refresh = () => {
    const end = Date.now();
    const duration = exactWindow && query.start != null && query.end != null
      ? query.end - query.start
      : undefined;
    updateQuery({ windowMode: exactWindow ? undefined : query.windowMode, start: duration == null ? undefined : end - duration, end });
  };
  return <>
    <header className={styles.header}>
      <div>
        <Typography.Title className={styles.title ?? ''} level={2}>{t('explore.title')}</Typography.Title>
        <Typography.Text type="secondary">{t('explore.description')}</Typography.Text>
      </div>
      <div className={styles.scope} aria-label={t('explore.context')}>
        <Select<string>
          className={styles.timeRange ?? ''}
          aria-label={t('explore.timeRange')}
          value={exactWindow ? 'onboarding-exact' : query.timeRange}
          options={[
            ...(exactWindow ? [{ value: 'onboarding-exact', label: t('explore.exactWindow'), disabled: true }] : []),
            ...EXPLORE_TIME_RANGES.map(value => ({ value, label: t(`explore.timeRanges.${value}`) }))
          ]}
          onChange={updateTimeRange}
        />
        <Button onClick={refresh}>{t('common.refresh')}</Button>
      </div>
    </header>
    {handoffState === 'invalid' && <Alert type="warning" showIcon message={t('explore.handoffInvalid')} />}
    <div className={styles.navigationRow}>
      <nav className={styles.signalNavigation} aria-label={t('explore.signalsNavigation')}>
        {signalKeys.map(signal => <button
          key={signal}
          type="button"
          role="tab"
          aria-selected={query.signal === signal}
          className={(query.signal === signal ? styles.activeSignal : styles.signal) ?? ''}
          onClick={() => updateQuery({ signal, live: undefined, pageIndex: undefined })}
        >{t(`explore.signals.${signal}`)}</button>)}
      </nav>
      {query.signal === 'logs' && <div className={styles.logMode} aria-label={t('exploreLog.mode')}>
        <Button type={query.live ? 'text' : 'primary'} onClick={() => updateQuery({ live: undefined })}>{t('exploreLog.query')}</Button>
        <Button type={query.live ? 'primary' : 'text'} onClick={() => updateQuery({ live: true })}>{t('exploreLog.live')}</Button>
      </div>}
    </div>
  </>;
}
