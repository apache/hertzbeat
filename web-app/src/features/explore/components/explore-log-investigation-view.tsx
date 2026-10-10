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

import { HertzBeatLogsTableResult } from '@/platform/perses';

import type {
  InvestigationEvidenceState,
  InvestigationPersesResults,
  LogInvestigationViewState
} from '../model/explore-investigation-contract';
import { InvestigationLogTrace } from './explore-investigation-log-trace';
import { InvestigationLogTopology } from './explore-investigation-log-topology';
import { investigationPrimitiveMessages } from './explore-investigation-messages';
import { InvestigationMetrics } from './explore-investigation-metrics';
import { InvestigationSelectedLog } from './explore-investigation-selected-log';
import { InvestigationLogPreviewNotice } from './investigation-log-preview-notice';
import {
  InvestigationAvailability,
  InvestigationBlockState,
  InvestigationContextBand,
  InvestigationSection
} from './explore-investigation-view-primitives';
import logStyles from './explore-investigation-log.module.css';
import styles from './explore-investigation-view.module.css';

type ReadyState = Extract<LogInvestigationViewState, { kind: 'ready' }>;
type Props = {
  state: ReadyState;
  evidenceCurrent: boolean;
  onBack: () => void;
  onRefresh: () => void;
  onFocusTrace: () => void;
  onOpenMetrics?: (() => void) | undefined;
  onOpenTopology?: (() => void) | undefined;
};

export function ExploreLogInvestigationView(props: Props) {
  const { state, evidenceCurrent } = props;
  const { t } = useTranslation();
  const messages = investigationPrimitiveMessages(t);
  const { snapshot, perses } = state;
  const selectedLog = snapshot.selectedLog.state === 'ready' ? snapshot.selectedLog.log : null;
  const nearbyPanel = readyLogs(snapshot.nearbyLogs.state, perses.logs);
  const metricsState = readyMetricsState(state);
  return (
    <section
      className={styles.workspace}
      data-explore-investigation="true"
      aria-label={t('exploreInvestigation.title')}
    >
      <InvestigationContextBand window={state.route.window} onBack={props.onBack} onRefresh={props.onRefresh} />
      <LogAvailability
        logs={snapshot.selectedLog.state}
        traces={traceEvidenceState(state)}
        metrics={metricsState}
        topology={props.onOpenTopology ? 'ready' : 'unavailable'}
      />
      <LogEvidenceSection
        state={state}
        selectedLog={selectedLog}
        nearbyPanel={nearbyPanel}
        messages={messages}
        evidenceCurrent={evidenceCurrent}
      />
      <InvestigationLogTrace
        state={state}
        messages={messages}
        evidenceCurrent={evidenceCurrent}
        onFocusTrace={props.onFocusTrace}
      />
      <LogMetricsSection
        state={state}
        evidenceState={metricsState}
        evidenceCurrent={evidenceCurrent}
        messages={messages}
        onOpen={props.onOpenMetrics}
      />
      <InvestigationLogTopology evidenceCurrent={evidenceCurrent} onOpen={props.onOpenTopology} />
    </section>
  );
}

function LogAvailability({
  logs,
  traces,
  metrics,
  topology
}: Record<'logs' | 'traces' | 'metrics' | 'topology', InvestigationEvidenceState>) {
  const { t } = useTranslation();
  return (
    <InvestigationAvailability
      items={[
        { key: 'logs', label: t('explore.signals.logs'), state: logs },
        { key: 'traces', label: t('exploreInvestigation.sections.traces'), state: traces },
        { key: 'metrics', label: t('exploreInvestigation.sections.metrics'), state: metrics },
        { key: 'topology', label: t('exploreInvestigation.sections.topology'), state: topology }
      ]}
    />
  );
}

function LogEvidenceSection({
  state,
  selectedLog,
  nearbyPanel,
  messages,
  evidenceCurrent
}: {
  state: ReadyState;
  selectedLog: ReadyState['snapshot']['selectedLog']['log'];
  nearbyPanel: ReturnType<typeof readyLogs>;
  messages: ReturnType<typeof investigationPrimitiveMessages>;
  evidenceCurrent: boolean;
}) {
  const { t } = useTranslation();
  return (
    <InvestigationSection title={t('explore.signals.logs')} evidenceCurrent={evidenceCurrent}>
      <InvestigationLogPreviewNotice
        rows={[
          ...(selectedLog ? [selectedLog] : []),
          ...(state.snapshot.nearbyLogs.state === 'ready'
            ? [...state.snapshot.nearbyLogs.before, ...state.snapshot.nearbyLogs.after]
            : [])
        ]}
      />
      {selectedLog ? (
        <div className={logStyles.logWorkspace}>
          <InvestigationSelectedLog row={selectedLog} timeZone={state.route.window.timeZone} />
          <section className={logStyles.nearbyLogs} aria-label={t('exploreInvestigation.sections.nearbyLogs')}>
            <header>
              <h3>{t('exploreInvestigation.sections.nearbyLogs')}</h3>
              <p>{t('exploreInvestigation.logs.nearbyScope')}</p>
            </header>
            {nearbyPanel ? (
              <HertzBeatLogsTableResult
                title={t('exploreInvestigation.sections.nearbyLogs')}
                ariaLabel={t('exploreInvestigation.sections.nearbyLogs')}
                messages={messages}
                query={nearbyPanel.query}
                outcome={nearbyPanel.outcome}
              />
            ) : (
              <InvestigationBlockState
                state={nonReady(state.snapshot.nearbyLogs.state)}
                reason={state.snapshot.nearbyLogs.reason}
              />
            )}
          </section>
        </div>
      ) : (
        <InvestigationBlockState
          state={nonReady(state.snapshot.selectedLog.state)}
          reason={state.snapshot.selectedLog.reason}
        />
      )}
    </InvestigationSection>
  );
}

function LogMetricsSection({
  state,
  evidenceState,
  evidenceCurrent,
  messages,
  onOpen
}: {
  state: ReadyState;
  evidenceState: InvestigationEvidenceState;
  evidenceCurrent: boolean;
  messages: ReturnType<typeof investigationPrimitiveMessages>;
  onOpen?: (() => void) | undefined;
}) {
  const { t } = useTranslation();
  return (
    <InvestigationSection
      title={t('exploreInvestigation.sections.metrics')}
      action={onOpen}
      actionLabel={t('exploreInvestigation.actions.openMetrics')}
      evidenceCurrent={evidenceCurrent}
    >
      {evidenceState === 'ready' ? (
        <InvestigationMetrics metricBlock={state.snapshot.metrics} panels={state.perses.metrics} messages={messages} />
      ) : (
        <InvestigationBlockState state={nonReady(evidenceState)} reason={state.snapshot.metrics.reason} />
      )}
    </InvestigationSection>
  );
}

function traceEvidenceState(state: ReadyState): InvestigationEvidenceState {
  if (state.snapshot.trace.state !== 'ready') return state.snapshot.trace.state;
  if (state.perses.gantt?.outcome.state === 'ready') return 'ready';
  return state.perses.gantt?.outcome.state === 'empty' ? 'empty' : 'unavailable';
}

function readyMetricsState(state: ReadyState): InvestigationEvidenceState {
  if (state.snapshot.metrics.state !== 'ready') return state.snapshot.metrics.state;
  if (state.perses.metrics.some(panel => panel.outcome.state === 'ready')) return 'ready';
  return state.perses.metrics.some(panel => panel.outcome.state === 'empty') ? 'empty' : 'unavailable';
}

function readyLogs(blockState: InvestigationEvidenceState, panel: InvestigationPersesResults['logs']) {
  return blockState === 'ready' && panel?.outcome.state === 'ready' ? { ...panel, outcome: panel.outcome } : undefined;
}

function nonReady(state: InvestigationEvidenceState): 'empty' | 'unavailable' {
  return state === 'empty' ? 'empty' : 'unavailable';
}
