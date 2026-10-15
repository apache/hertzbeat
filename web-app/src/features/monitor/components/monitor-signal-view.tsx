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

import type { InvestigationTimeWindow, SignalKind } from '@/shared/query-context';

import type { MonitorMetricCatalogEvidence } from '../model/monitor-detail-model';
import type { MonitorInvestigationViewState } from '../model/monitor-investigation-model';
import { MonitorSignalAlerts } from './monitor-signal-alerts';
import { MonitorSignalAvailability } from './monitor-signal-availability';
import { MonitorBoundEntitySection, MonitorOtlpEvidenceSection } from './monitor-signal-binding';
import { MonitorSignalCollection } from './monitor-signal-collection';
import styles from './monitor-signal-view.module.css';

type MonitorSignalViewProps = {
  state: MonitorInvestigationViewState;
  nativeMetrics: MonitorMetricCatalogEvidence;
  openSignal: (signal: SignalKind) => void;
  openEntity: (entityId: number, window: InvestigationTimeWindow) => void;
};

export function MonitorSignalView({ state, nativeMetrics, openSignal, openEntity }: MonitorSignalViewProps) {
  const { t } = useTranslation();
  return (
    <section className={styles.workspace} aria-label={t('monitorSignals.title')}>
      <MonitorSignalAvailability nativeMetrics={nativeMetrics} state={state} />
      <div className={styles.evidenceGrid}>
        <MonitorSignalAlerts state={state} />
        <MonitorSignalCollection state={state} />
        <MonitorBoundEntitySection state={state} openEntity={openEntity} />
        <MonitorOtlpEvidenceSection state={state} openSignal={openSignal} />
      </div>
    </section>
  );
}
