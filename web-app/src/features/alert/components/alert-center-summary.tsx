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

import { useTranslation } from 'react-i18next';
import { useId } from 'react';

import { OperationalStatePanel } from '@/shared/operational-page/operational-page';

import type { AlertSummary } from '../model/alert-model';
import styles from '../shared/alert-center.module.css';
import type { AlertSummaryState } from '../model/alert-center-view-model';
import { AlertCenterRetryButton } from './alert-center-retry-button';

export function AlertCenterSummary({ state, retry }: { state: AlertSummaryState; retry: () => unknown }) {
  const { t } = useTranslation();
  if (state.kind === 'loading') return <OperationalStatePanel kind="loading" title={t('common.loading')} />;
  if (state.kind === 'unavailable') {
    return (
      <OperationalStatePanel
        kind="unavailable"
        title={t('alert.summaryUnavailable')}
        action={<AlertCenterRetryButton onClick={retry} />}
      />
    );
  }
  if (state.kind === 'error') {
    return (
      <OperationalStatePanel
        kind="error"
        title={t('alert.summaryLoadFailed')}
        action={<AlertCenterRetryButton onClick={retry} />}
      />
    );
  }
  if (state.kind === 'permission') {
    return (
      <OperationalStatePanel
        kind="permission"
        title={t('common.permission.roleRequiredDescription')}
        action={<AlertCenterRetryButton onClick={retry} />}
      />
    );
  }
  return <SummaryValues summary={state.summary} />;
}

function SummaryValues({ summary }: { summary: AlertSummary }) {
  const { t } = useTranslation();
  const summaryLabelId = useId();
  const groups = [
    {
      key: 'lifecycle',
      items: [
        ['alert.summary.total', summary.total, 'total'],
        ['alert.status.firing', Math.max(summary.total - summary.dealNum, 0), 'firing'],
        ['alert.summary.handled', summary.dealNum, 'handled']
      ]
    },
    {
      key: 'severity',
      items: [
        ['alert.summary.emergency', summary.priorityEmergencyNum, 'emergency'],
        ['alert.summary.critical', summary.priorityCriticalNum, 'critical'],
        ['alert.summary.warning', summary.priorityWarningNum, 'warning']
      ]
    }
  ] as const;

  return (
    <section className={styles.summaryLine} aria-labelledby={summaryLabelId} data-summary-layout="inline">
      <span className={styles.summaryScope} id={summaryLabelId}>
        {t('alert.summary.workspaceScope')}
      </span>
      {groups.map(group => (
        <dl className={styles.summaryFamily} key={group.key} data-summary-family={group.key}>
          {group.items.map(([key, value, kind]) => (
            <div className={styles.summaryItem} key={key} data-summary-kind={kind} data-summary-zero={value === 0}>
              <dt>{t(key)}</dt>
              <dd data-testid={`alert-summary-${kind}`}>{value}</dd>
            </div>
          ))}
        </dl>
      ))}
    </section>
  );
}
