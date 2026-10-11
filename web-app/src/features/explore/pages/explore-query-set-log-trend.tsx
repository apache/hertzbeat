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

import type { TFunction } from 'i18next';
import { Button, Select } from 'antd';
import { ExploreLogStatistics } from '../components/explore-log-statistics';
import type { useExplorePageController } from '../controller/use-explore-page-controller';
import { useQuerySetLogTrend } from '../controller/use-query-set-log-trend';
import type { LogExploreQuery } from '../model/explore-model';
import { trendFailureMessage } from './explore-log-trend-failure';
import styles from './explore-logs-workspace.module.css';
type Controller = ReturnType<typeof useExplorePageController>;

export function QuerySetTrend({ controller, t }: { controller: Controller; t: TFunction }) {
  const { query } = controller;
  if (query.signal !== 'logs') return null;
  return <QuerySetTrendForLogs controller={controller} query={query} t={t} />;
}

// eslint-disable-next-line complexity -- selected source, request state, and zoom share one timeline context.
function QuerySetTrendForLogs({
  controller,
  query,
  t
}: {
  controller: Controller;
  query: LogExploreQuery;
  t: TFunction;
}) {
  const { refs, target, window, projected, active, sourcePending, trend, onTimeWindowChange, onTarget } =
    useQuerySetLogTrend(controller, query);
  return (
    <>
      {active && trend.data && !trend.isError ? (
        <ExploreLogStatistics
          headerAction={<TimelineTargetControl refs={refs} target={target} onChange={onTarget} t={t} />}
          statistics={trend.data}
          timeWindow={window!}
          runtimeIdentity={JSON.stringify(['querySet-source-trend', target, projected, window])}
          retry={trend.data.trend.kind === 'error' ? async () => void (await trend.refetch()) : undefined}
          onTimeWindowChange={onTimeWindowChange}
          t={t}
        />
      ) : (
        <div className={styles.trendPlaceholder}>
          <TimelineTargetControl refs={refs} target={target} onChange={onTarget} t={t} />
          <span role={trend.isPending && active ? 'status' : 'alert'}>
            {trend.isPending && active
              ? t('common.loading')
              : sourcePending
                ? t('explore.logComparison.sourceNotExecuted')
                : active || trend.isError
                  ? t('exploreLog.statisticsUnavailable')
                  : trendFailureMessage(controller.result, t, query)}
          </span>
          {active && trend.isError && (
            <Button size="small" onClick={() => void trend.refetch()}>
              {t('common.retry')}
            </Button>
          )}
        </div>
      )}
    </>
  );
}

function TimelineTargetControl({
  refs,
  target,
  onChange,
  t
}: {
  refs: string[];
  target: string;
  onChange: (ref: string) => void;
  t: TFunction;
}) {
  return (
    <label className={styles.timelineTarget}>
      {t('explore.logComparison.timelineTarget')}{' '}
      <Select
        aria-label={t('explore.logComparison.timelineTarget')}
        value={target}
        onChange={onChange}
        options={refs.map(ref => ({ value: ref, label: t('explore.logComparison.queryTarget', { ref }) }))}
      />
    </label>
  );
}
