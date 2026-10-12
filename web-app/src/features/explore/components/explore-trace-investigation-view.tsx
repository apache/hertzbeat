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

import type { SpanFilterControls } from '../model/explore-span-filter';
/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { useTranslation } from 'react-i18next';

import type {
  InvestigationBlock,
  InvestigationEvidenceState,
  TraceInvestigationViewState
} from '../model/explore-investigation-contract';
import { TraceSupportingEvidence } from './explore-trace-supporting-evidence';
import { investigationPrimitiveMessages } from './explore-investigation-messages';
import { InvestigationTraceEvidence } from './explore-investigation-trace-evidence';
import { InvestigationContextBand } from './explore-investigation-view-primitives';
import styles from './explore-investigation-view.module.css';
import workspaceStyles from './explore-trace-workspace.module.css';
import { ExploreTraceDetailContext } from './explore-trace-detail-context';

type ReadyState = Extract<TraceInvestigationViewState, { kind: 'ready' }>;
type Props = SpanFilterControls & {
  drawerPresentation?: boolean;
  state: ReadyState;
  evidenceCurrent: boolean;
  evidenceIdentity?: string | undefined;
  onBack: () => void;
  onRefresh: () => void;
  onSelectSpan: (spanId: string) => void;
  onOpenLogs: () => void;
  onOpenSpanLogs?: (() => void) | undefined;
  onOpenMetrics?: (() => void) | undefined;
  onOpenTopology?: (() => void) | undefined;
};

export function ExploreTraceInvestigationView(props: Props) {
  const { state, evidenceCurrent } = props;
  const { t } = useTranslation();
  const { snapshot, perses } = state;
  const messages = investigationPrimitiveMessages(t);
  const ganttState = persesState(snapshot.gantt, perses.gantt);
  const logsState = persesState(snapshot.sameTraceLogs, perses.logs);
  const metricsState = combinedMetricsState(state);
  return (
    <section
      className={`${styles.workspace} ${workspaceStyles.workspace}`}
      data-explore-investigation="true"
      data-trace-presentation={props.drawerPresentation ? 'drawer' : undefined}
      aria-label={t('exploreInvestigation.title')}
    >
      <TraceInvestigationContext
        state={state}
        drawerPresentation={props.drawerPresentation === true}
        onBack={props.onBack}
        onRefresh={props.onRefresh}
        gantt={ganttState}
        logs={logsState}
        metrics={metricsState}
      />
      <span role="status" className={workspaceStyles.selectionStatus}>
        {!evidenceCurrent ? t('exploreInvestigation.trace.updatingSelection') : ''}
      </span>
      <InvestigationTraceEvidence
        showSummary={!props.drawerPresentation}
        onAddSpanFilter={props.onAddSpanFilter}
        onApplySpanFilters={props.onApplySpanFilters}
        spanFilterDisabledReason={props.spanFilterDisabledReason}
        spanFilterPending={props.spanFilterPending}
        perses={perses}
        logRecords={snapshot.sameTraceLogs.logs}
        ganttReason={snapshot.gantt.reason}
        logsReason={snapshot.sameTraceLogs.reason}
        ganttState={ganttState}
        logsState={logsState}
        selectedSpanId={state.route.spanId ?? snapshot.selectedSpanId ?? undefined}
        inspectorInitiallyOpen={state.route.spanId != null}
        evidenceIdentity={props.evidenceIdentity}
        evidenceCurrent={evidenceCurrent}
        messages={messages}
        onSelectSpan={props.onSelectSpan}
        onOpenLogs={props.onOpenLogs}
        onOpenSpanLogs={props.onOpenSpanLogs}
      />
      <TraceSupportingEvidence
        state={state}
        evidenceCurrent={evidenceCurrent}
        onOpenMetrics={props.onOpenMetrics}
        onOpenTopology={props.onOpenTopology}
      />
    </section>
  );
}

function TraceInvestigationContext({
  state,
  drawerPresentation,
  onBack,
  onRefresh,
  gantt,
  logs,
  metrics
}: Pick<Props, 'state' | 'drawerPresentation' | 'onBack' | 'onRefresh'> &
  Record<'gantt' | 'logs' | 'metrics', InvestigationEvidenceState>) {
  return (
    <>
      {drawerPresentation && <ExploreTraceDetailContext state={state} onBack={onBack} onRefresh={onRefresh} />}
      <div className={workspaceStyles.contextStrip} data-trace-context-strip>
        {!drawerPresentation && (
          <InvestigationContextBand window={state.route.window} onBack={onBack} onRefresh={onRefresh} />
        )}
        <TraceAvailability gantt={gantt} logs={logs} metrics={metrics} topology={state.snapshot.dependencies.state} />
      </div>
    </>
  );
}

function TraceAvailability({
  gantt,
  logs,
  metrics,
  topology
}: Record<'gantt' | 'logs' | 'metrics' | 'topology', InvestigationEvidenceState>) {
  const { t } = useTranslation();
  const states = { traces: gantt, logs, metrics, topology };
  return (
    <section
      className={workspaceStyles.availability}
      data-trace-availability
      aria-label={t('exploreInvestigation.availability')}
    >
      {Object.entries(states).map(([signal, state]) => {
        const label = t(`exploreInvestigation.sections.${signal}`);
        const explanation = t(`exploreInvestigation.states.${state === 'ready' ? 'available' : state}`);
        return (
          <span key={signal} data-state={state} title={explanation} aria-label={`${label}: ${explanation}`}>
            {label}: {t(`exploreInvestigation.trace.availabilityStates.${state}`)}
          </span>
        );
      })}
      {(gantt !== 'ready' || logs !== 'ready') && <p role="note">{t('exploreInvestigation.trace.correlationGap')}</p>}
    </section>
  );
}

function persesState(
  block: InvestigationBlock,
  panel: { outcome: { state: string } } | undefined
): InvestigationEvidenceState {
  if (block.state !== 'ready') return block.state;
  if (panel?.outcome.state === 'ready') return 'ready';
  return panel?.outcome.state === 'empty' ? 'empty' : 'unavailable';
}

function combinedMetricsState(state: ReadyState): InvestigationEvidenceState {
  if (state.snapshot.red.state === 'ready' && state.snapshot.red.summary) return 'ready';
  if (state.snapshot.metrics.state === 'ready' && state.perses.metrics.some(panel => panel.outcome.state === 'ready'))
    return 'ready';
  if (state.snapshot.red.state === 'empty' && state.snapshot.metrics.state === 'empty') return 'empty';
  return 'unavailable';
}
