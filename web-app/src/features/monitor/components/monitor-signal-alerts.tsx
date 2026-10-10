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

import { Tag } from 'antd';
import { useTranslation } from 'react-i18next';

import type { MonitorAlertPreview, MonitorInvestigationViewState } from '../model/monitor-investigation-model';
import styles from './monitor-signal-view.module.css';
import {
  formatMonitorTimestamp,
  monitorInvestigationSectionState,
  monitorInvestigationSnapshot
} from './monitor-signal-view-formatters';
import { MonitorCompactState, MonitorSignalSection, MonitorSignalSource } from './monitor-signal-view-primitives';

export function MonitorSignalAlerts({ state }: { state: MonitorInvestigationViewState }) {
  const { t } = useTranslation();
  const alerts = monitorInvestigationSnapshot(state)?.alerts;
  return (
    <MonitorSignalSection title={t('monitorSignals.sections.currentAlerts')}>
      <p className={styles.scopeNote}>{t('monitorSignals.alerts.scope')}</p>
      {alerts?.state === 'ready' ? <ReadyAlerts previews={alerts.previews} total={alerts.activeCount} /> : null}
      {alerts?.state !== 'ready' ? (
        <MonitorCompactState
          state={monitorInvestigationSectionState(state, alerts?.state)}
          prefix="monitorSignals.alerts"
        />
      ) : null}
      {alerts ? <MonitorSignalSource>{t('monitorSignals.sources.currentAlerts')}</MonitorSignalSource> : null}
    </MonitorSignalSection>
  );
}

function ReadyAlerts({ previews, total }: { previews: MonitorAlertPreview[]; total: number }) {
  const { t } = useTranslation();
  const notRecorded = t('monitorSignals.alerts.notRecorded');
  return (
    <div className={styles.readyBody}>
      <strong className={styles.total}>{t('monitorSignals.alerts.activeCount', { count: total })}</strong>
      <ul className={styles.alertList}>
        {previews.map(alert => (
          <li key={alert.id}>
            <div className={styles.alertIdentity}>
              <strong>{alert.summary ?? notRecorded}</strong>
              <Tag>{alert.severity?.toUpperCase() ?? notRecorded}</Tag>
            </div>
            <span>{alert.status}</span>
            <small>{alertTime(alert.activeAt, notRecorded)}</small>
          </li>
        ))}
      </ul>
    </div>
  );
}

function alertTime(value: number | null, notRecorded: string) {
  return value == null ? notRecorded : (formatMonitorTimestamp(value) ?? notRecorded);
}
