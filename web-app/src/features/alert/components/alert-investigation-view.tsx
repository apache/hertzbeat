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

import { InvestigationAvailability } from '@/features/explore';

import type {
  AlertInvestigationTraceSummary,
  AlertInvestigationViewState
} from '../model/alert-investigation-contract';
import { AlertCollectionSection, AlertTopologySection } from './alert-investigation-context-evidence';
import { AlertInvestigationHeader } from './alert-investigation-header';
import { AlertLogsSection, AlertMetricsSection } from './alert-investigation-signal-runtime';
import { AlertTracesSection } from './alert-investigation-traces';
import styles from './alert-investigation-view.module.css';

type ReadyState = Extract<AlertInvestigationViewState, { kind: 'ready' }>;
type LogRecord = ReadyState['snapshot']['logs']['records'][number];

export function AlertInvestigationView({
  state,
  onBack,
  onOpenMetric,
  onOpenLog,
  onOpenTrace,
  onOpenTopology
}: {
  state: ReadyState;
  onBack: () => void;
  onOpenMetric?: (() => void) | undefined;
  onOpenLog: (record: LogRecord) => void;
  onOpenTrace: (trace: AlertInvestigationTraceSummary) => void;
  onOpenTopology?: (() => void) | undefined;
}) {
  const { t } = useTranslation();
  const stateLabels = {
    ready: t('alertInvestigation.states.available'),
    empty: t('alertInvestigation.states.empty'),
    unavailable: t('alertInvestigation.states.unavailable')
  };
  return (
    <main className={styles.workspace} data-alert-investigation="true" aria-label={t('alertInvestigation.title')}>
      <AlertInvestigationHeader route={state.route} snapshot={state.snapshot} onBack={onBack} />
      <InvestigationAvailability
        ariaLabel={t('alertInvestigation.availability')}
        stateLabels={stateLabels}
        items={[
          { key: 'metrics', label: t('alertInvestigation.sections.metrics'), state: state.snapshot.metrics.state },
          { key: 'logs', label: t('alertInvestigation.sections.logs'), state: state.snapshot.logs.state },
          { key: 'traces', label: t('alertInvestigation.sections.traces'), state: state.snapshot.traces.state },
          { key: 'topology', label: t('alertInvestigation.sections.topology'), state: state.snapshot.topology.state },
          {
            key: 'collection',
            label: t('alertInvestigation.sections.collection'),
            state: state.snapshot.collection.state
          }
        ]}
      />
      <AlertMetricsSection state={state} onOpen={onOpenMetric} />
      <AlertLogsSection state={state} onOpenLog={onOpenLog} />
      <AlertTracesSection state={state} onOpen={onOpenTrace} />
      <AlertTopologySection state={state} onOpen={onOpenTopology} />
      <AlertCollectionSection state={state} />
    </main>
  );
}
