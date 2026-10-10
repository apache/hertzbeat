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
import type { LogHistoryEvidence } from '../model/explore-signal-contract';
import { exploreOverviewRows } from '../model/explore-perses-result-model';
import styles from './log-severity-legend.module.css';
import resultStyles from './log-result.module.css';

export function ExploreLogSeverityLegend({
  statistics,
  t
}: {
  statistics: Pick<LogHistoryEvidence, 'overview'>;
  t: TFunction;
}) {
  return (
    <section className={styles.overview} aria-label={t('exploreLog.overview')} data-explore-evidence-summary="">
      {statistics.overview.kind === 'error' ? (
        <span className={resultStyles.evidenceState} role="alert">
          {t(
            statistics.overview.reason === 'permission'
              ? 'exploreLog.overviewPermission'
              : 'exploreLog.statisticsUnavailable'
          )}
        </span>
      ) : (
        <ul
          className={styles.overviewStats}
          aria-label={t('exploreLog.statisticsScope')}
          title={t('exploreLog.statisticsScope')}
        >
          {(statistics.overview.kind === 'count_only'
            ? [['total', statistics.overview.data.totalCount] as const]
            : exploreOverviewRows(statistics.overview.data)
          )
            .filter(([key, value]) => key === 'total' || value > 0)
            .map(([key, value]) => {
              const label = t(`exploreLog.statistics.${key}`);
              const severity = key === 'total' ? undefined : key.toUpperCase();
              return (
                <li key={key} data-severity={severity}>
                  <span>{label}</span>
                  <strong>{value.toLocaleString()}</strong>
                </li>
              );
            })}
        </ul>
      )}
    </section>
  );
}
