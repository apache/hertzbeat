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

import { Alert, Skeleton, Typography } from 'antd';
import { useTranslation } from 'react-i18next';

import type { AlertSummary } from '../alert-model';
import styles from '../alert-center-page.module.css';
import type { AlertSummaryState } from '../model/alert-center-view-model';
import { AlertCenterRetryButton } from './alert-center-retry-button';

export function AlertCenterSummary({ state, retry }: {
  state: AlertSummaryState;
  retry: () => unknown;
}) {
  const { t } = useTranslation();
  if (state.kind === 'loading') return <Skeleton active paragraph={false} />;
  if (state.kind === 'unavailable') {
    return (
      <Alert
        type="warning"
        showIcon
        message={t('alert.summaryUnavailable')}
        action={<AlertCenterRetryButton onClick={retry} />}
      />
    );
  }
  if (state.kind === 'error') {
    return (
      <Alert
        type="error"
        showIcon
        message={t('alert.summaryLoadFailed')}
        action={<AlertCenterRetryButton onClick={retry} />}
      />
    );
  }
  return <SummaryValues summary={state.summary} />;
}

function SummaryValues({ summary }: { summary: AlertSummary }) {
  const { t } = useTranslation();
  const items = [
    ['alert.summary.total', summary.total],
    ['alert.summary.nonFiring', summary.dealNum],
    ['alert.summary.warning', summary.priorityWarningNum],
    ['alert.summary.critical', summary.priorityCriticalNum],
    ['alert.summary.emergency', summary.priorityEmergencyNum]
  ] as const;

  return (
    <section aria-label={t('alert.summary.scope')}>
      <Typography.Text type="secondary">{t('alert.summary.scope')}</Typography.Text>
      <div className={styles.summary}>
        {items.map(([key, value]) => (
          <div className={styles.metric} key={key}>
            <span>{t(key)}</span>
            <strong>{value}</strong>
          </div>
        ))}
      </div>
    </section>
  );
}
