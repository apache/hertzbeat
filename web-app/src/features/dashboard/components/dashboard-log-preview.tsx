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

import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { buildExplorePath } from '@/features/explore';
import type { DashboardSignals } from '../model/dashboard-signals';
import { DashboardSparkline } from './dashboard-sparkline';
import styles from './dashboard-signals.module.css';
import { DashboardLogRecordDrawer } from './dashboard-log-record-drawer';
import { FileTextOutlined, FullscreenOutlined } from '@ant-design/icons';
import { Button } from 'antd';
import { classifyExploreSignalError } from '@/features/explore';
import type { RepeatedErrorGroup } from '../model/dashboard-repeated-errors';
type Props = { signals: DashboardSignals };
export function DashboardLogPreview({ signals }: Props) {
  const { t } = useTranslation();
  const target = buildExplorePath({
    signal: 'logs',
    timeRange: 'last-15m',
    start: signals.clock.start,
    end: signals.clock.end,
    timeZone: 'UTC',
    searchSyntax: 'structured-v1',
    serviceName: signals.serviceName || undefined,
    environment: signals.environment || undefined
  });
  return (
    <section className={`${styles.region} ${styles.logCard}`} aria-labelledby="start-logs-title">
      <header>
        <h3 id="start-logs-title">
          <FileTextOutlined aria-hidden="true" /> {t('dashboard.workspace.signals.logs.title')}
        </h3>
        <Link to={target} aria-label={t('dashboard.v3.openExplore')} title={t('dashboard.v3.openExplore')}>
          <FullscreenOutlined aria-hidden="true" />
        </Link>
      </header>
      <LogTrend signals={signals} />
      <LogErrorRank signals={signals} />
      <DashboardLogRecordDrawer signals={signals} />
    </section>
  );
}
function LogTrend({ signals }: Props) {
  const { t } = useTranslation();
  const logs = signals.logs.isSuccess && !signals.logs.isFetching ? signals.logs.data : undefined;
  const trend = logs?.trend.kind === 'ready' ? logs.trend.data : undefined;
  if (!trend)
    return (
      <p className={styles.empty} role="status">
        {t(signals.logs.isFetching || signals.logs.isPending ? 'dashboard.v2.loading' : 'dashboard.v2.unavailable')}
      </p>
    );
  return (
    <>
      <div className={styles.bigNumber}>
        {trend.buckets.reduce((sum, bucket) => sum + bucket.count, 0).toLocaleString()}
      </div>
      <div className={styles.seriesLabel}>{t('dashboard.v2.logEvents')}</div>
      <DashboardSparkline
        start={trend.start}
        end={trend.end}
        points={trend.buckets.map(bucket => [bucket.start, bucket.count])}
        label={t('dashboard.v2.logTrend')}
        variant="bars"
      />
    </>
  );
}
function LogErrorRank({ signals }: Props) {
  const { t } = useTranslation();
  const rank = signals.rank.isSuccess && !signals.rank.isFetching ? signals.rank.data : undefined;
  const state = rank?.state ?? unavailableRankState(signals.rank.error);
  const groups = rank?.groups ?? [];
  return (
    <div
      className={styles.rank}
      onMouseEnter={() => signals.setRankInteracting(true)}
      onMouseLeave={() => signals.setRankInteracting(false)}
      onFocusCapture={() => signals.setRankInteracting(true)}
      onBlurCapture={event => {
        if (!event.currentTarget.contains(event.relatedTarget)) signals.setRankInteracting(false);
      }}
    >
      <div className={styles.rankHeading}>
        <h4>{t('dashboard.v2.repeatedErrors')}</h4>
        {hasRunningRank(rank) && (
          <Button
            type="text"
            size="small"
            aria-pressed={signals.rankPaused}
            onClick={() => signals.setRankPaused(!signals.rankPaused)}
          >
            {t(signals.rankPaused ? 'dashboard.v2.resume' : 'dashboard.v2.pause')}
          </Button>
        )}
      </div>
      <RankEvidence state={state} groups={groups} onSelect={signals.setSelected} />
    </div>
  );
}
function ErrorGroups({
  groups,
  onSelect
}: {
  groups: RepeatedErrorGroup[];
  onSelect: (group: RepeatedErrorGroup) => void;
}) {
  const { t } = useTranslation();
  return (
    <ol className={styles.errorList}>
      {groups.map(group => (
        <li key={group.groupKey}>
          <button type="button" disabled={!group.representativeUid} onClick={() => onSelect(group)}>
            <span>
              {group.summary}
              <small>
                {group.serviceName || '—'} · {group.environment || '—'}
              </small>
            </span>
            <strong>×{group.count}</strong>
          </button>
          <small>
            {t('dashboard.v2.lastSeen')} {new Date(group.lastSeen).toLocaleTimeString()}
          </small>
        </li>
      ))}
    </ol>
  );
}

function RankEvidence({
  state,
  groups,
  onSelect
}: {
  state: string;
  groups: RepeatedErrorGroup[];
  onSelect: (group: RepeatedErrorGroup) => void;
}) {
  const { t } = useTranslation();
  if (state !== 'ready')
    return (
      <p className={styles.empty} role="status">
        {t(`dashboard.v2.${state}`)}
      </p>
    );
  if (!groups.length) return <p className={styles.empty}>{t('dashboard.v2.noRepeatedErrors')}</p>;
  return <ErrorGroups groups={groups} onSelect={onSelect} />;
}

function unavailableRankState(error: unknown) {
  if (!error) return 'loading';
  return classifyExploreSignalError(error) === 'missing' ? 'unsupported' : 'unavailable';
}

function hasRunningRank(rank: DashboardSignals['rank']['data']) {
  return rank?.state === 'ready' && rank.groups.length > 0;
}
