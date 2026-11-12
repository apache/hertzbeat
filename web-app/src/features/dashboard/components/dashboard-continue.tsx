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

import { BarChartOutlined, FileTextOutlined, NodeIndexOutlined, HistoryOutlined, StarFilled } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import type { DashboardOverview } from '../model/dashboard-overview';
import styles from './dashboard-overview.module.css';

type Props = { overview: DashboardOverview; directoryTarget: string };
export function DashboardContinue({ overview, directoryTarget }: Props) {
  const { t } = useTranslation();
  const empty = overview.savedState === 'ready' && !overview.continueItems.length;
  return (
    <section
      className={`${styles.historySection} ${empty ? styles.emptyHistory : ''}`}
      aria-labelledby="start-continue-title"
    >
      <div className={styles.historyHeading}>
        <h3 id="start-continue-title">
          <HistoryOutlined aria-hidden="true" />
          {t('dashboard.v2.continue')}
        </h3>
        {empty && <p>{t('dashboard.v2.noContinue')}</p>}
        <Link to={directoryTarget}>{t('dashboard.v3.allQueries')}</Link>
      </div>
      {overview.savedState !== 'ready' ? (
        <p className={styles.empty} role="status">
          {t(`dashboard.workspace.states.${overview.savedState}`)}
        </p>
      ) : (
        !empty && (
          <div className={styles.continueList}>
            {overview.continueItems.slice(0, 3).map(item => (
              <Link
                key={item.record.viewKey}
                to={item.target}
                className={styles.continueRow}
                onClick={() => overview.recordOpen(item.record.viewKey)}
              >
                <span className={styles.queryIcon}>
                  {item.record.signal === 'metrics' ? (
                    <BarChartOutlined />
                  ) : item.record.signal === 'logs' ? (
                    <FileTextOutlined />
                  ) : (
                    <NodeIndexOutlined />
                  )}
                </span>
                <span className={styles.queryCopy}>
                  <strong title={[item.record.label, item.record.description].filter(Boolean).join(' · ')}>
                    {item.record.label}
                  </strong>
                  <small>
                    {t(`dashboard.workspace.signals.${item.record.signal}.title`)} · {t('dashboard.v2.recent')}
                  </small>
                </span>
                {item.favorite && <StarFilled className={styles.queryFavorite} aria-hidden="true" />}
              </Link>
            ))}
          </div>
        )
      )}
    </section>
  );
}
