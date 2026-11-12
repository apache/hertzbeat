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
import { Drawer } from 'antd';
import { buildExplorePath } from '@/features/explore';
import { applicationRoutePaths } from '@/shared/navigation/app-paths';
import type { DashboardSignals } from '../model/dashboard-signals';
import type { RepeatedErrorScope } from '../model/dashboard-repeated-errors';
import styles from './dashboard-signals.module.css';
type Props = { signals: DashboardSignals };
export function DashboardLogRecordDrawer({ signals }: Props) {
  const { t } = useTranslation();
  const records = signals.records.isSuccess && !signals.records.isFetching ? signals.records.data : undefined;
  let state = 'unavailable';
  if (signals.records.isFetching || signals.records.isPending) state = 'loading';
  else if (records?.state === 'missing') state = 'selectionMissing';
  return (
    <Drawer
      title={t('dashboard.v2.exactGroupRecords')}
      open={!!signals.selected}
      onClose={() => signals.setSelected(null)}
      width={480}
    >
      <p>{signals.selected?.summary}</p>
      {records?.state === 'ready' ? (
        <>
          <p>{t('dashboard.v2.showingRecords', { count: records.records.length })}</p>
          <ul className={styles.recordList}>
            {records.records.map(record => (
              <li key={record.uid}>
                <Link to={recordTarget(records.scope, record.uid)}>
                  {new Date(record.eventTime).toLocaleString()} · {record.uid}
                </Link>
              </li>
            ))}
          </ul>
        </>
      ) : (
        <p role="status">{t(`dashboard.v2.${state}`)}</p>
      )}
    </Drawer>
  );
}
function recordTarget(scope: RepeatedErrorScope, uid: string) {
  return buildExplorePath({
    signal: 'logs',
    timeRange: 'last-15m',
    searchSyntax: 'structured-v1',
    logRecordUid: uid,
    start: scope.start,
    end: scope.end,
    timeZone: 'UTC',
    serviceName: scope.serviceName || undefined,
    environment: scope.environment || undefined,
    returnTo: applicationRoutePaths.dashboard
  });
}
