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

import { Tabs } from 'antd';
import type { TFunction } from 'i18next';
import { useTranslation } from 'react-i18next';

import {
  HertzBeatLogsTableResult,
  type HertzBeatPersesPrimitiveMessages,
  type HertzBeatLogQueryOutcome,
  type HertzBeatTraceGanttQueryOutcome
} from '@/platform/perses';

import type {
  InvestigationBlock,
  InvestigationEvidenceState,
  InvestigationPersesResults
} from '../model/explore-investigation-contract';
import type { InvestigationLogRecord } from '../model/explore-investigation-contract';
import { InvestigationLogPreviewNotice } from './investigation-log-preview-notice';
import { InvestigationTracePrimary, TraceSummary, TraceSpanAttributes } from './explore-investigation-trace-primary';
import styles from './explore-investigation-trace.module.css';
import { InvestigationBlockState, InvestigationSection } from './explore-investigation-view-primitives';
import { TraceOperationStatistics } from './trace-operation-statistics';

type ReadyGantt = NonNullable<InvestigationPersesResults['gantt']> & {
  outcome: Extract<HertzBeatTraceGanttQueryOutcome, { state: 'ready' }>;
};
type ReadyLogs = NonNullable<InvestigationPersesResults['logs']> & {
  outcome: Extract<HertzBeatLogQueryOutcome, { state: 'ready' }>;
};
type Props = SpanFilterControls & {
  showSummary?: boolean;
  perses: InvestigationPersesResults;
  logRecords: InvestigationLogRecord[];
  ganttState: InvestigationEvidenceState;
  ganttReason: InvestigationBlock['reason'];
  logsReason: InvestigationBlock['reason'];
  logsState: InvestigationEvidenceState;
  selectedSpanId?: string | undefined;
  inspectorInitiallyOpen?: boolean | undefined;
  evidenceCurrent: boolean;
  evidenceIdentity?: string | undefined;
  messages: HertzBeatPersesPrimitiveMessages;
  onSelectSpan: (spanId: string) => void;
  onOpenLogs: () => void;
  onOpenSpanLogs?: (() => void) | undefined;
};

export function InvestigationTraceEvidence(props: Props) {
  const { t } = useTranslation();
  const gantt = readyGantt(props.perses.gantt);
  const logs = readyLogs(props.perses.logs);
  const waterfall = (
    <InvestigationSection title={t('exploreInvestigation.sections.traces')} evidenceCurrent={props.evidenceCurrent}>
      {gantt ? (
        <InvestigationTracePrimary
          onAddSpanFilter={props.evidenceCurrent ? props.onAddSpanFilter : undefined}
          onApplySpanFilters={props.evidenceCurrent ? props.onApplySpanFilters : undefined}
          spanFilterDisabledReason={props.spanFilterDisabledReason}
          spanFilterPending={props.spanFilterPending}
          panel={gantt}
          selectedSpanId={props.selectedSpanId}
          inspectorInitiallyOpen={props.inspectorInitiallyOpen}
          evidenceCurrent={props.evidenceCurrent}
          evidenceIdentity={props.evidenceIdentity}
          messages={props.messages}
          onSelectSpan={props.onSelectSpan}
          onOpenLogs={props.onOpenSpanLogs}
        />
      ) : (
        <InvestigationBlockState state={nonReady(props.ganttState)} reason={props.ganttReason} />
      )}
    </InvestigationSection>
  );
  return (
    <div className={styles.traceEvidence}>
      {gantt && props.showSummary !== false ? (
        <TraceSummary detail={gantt.outcome.data} partial={gantt.outcome.truncated === true} />
      ) : null}
      <Tabs
        defaultActiveKey="waterfall"
        destroyOnHidden={false}
        items={[
          { key: 'waterfall', label: t('exploreInvestigation.trace.tabs.waterfall'), children: waterfall },
          operationStatisticsItem(props, gantt, t),
          {
            key: 'attributes',
            label: t('exploreInvestigation.trace.tabs.attributes'),
            children: gantt ? (
              <TraceSpanAttributes detail={gantt.outcome.data} selectedSpanId={props.selectedSpanId} />
            ) : (
              <InvestigationBlockState state={nonReady(props.ganttState)} reason={props.ganttReason} />
            )
          },
          { key: 'logs', label: t('explore.relatedLogs'), children: <TraceRelatedLogs {...props} logs={logs} /> }
        ]}
      />
    </div>
  );
}

function TraceRelatedLogs(props: Props & { logs: ReadyLogs | undefined }) {
  const { t } = useTranslation();
  return (
    <InvestigationSection
      title={t('exploreInvestigation.sections.logs')}
      action={props.onOpenLogs}
      actionLabel={t('exploreInvestigation.actions.openLogs')}
      evidenceCurrent={props.evidenceCurrent}
    >
      <InvestigationLogPreviewNotice rows={props.logRecords} />
      {props.logs ? (
        <HertzBeatLogsTableResult
          title={t('exploreInvestigation.sections.logs')}
          ariaLabel={t('exploreInvestigation.sections.logs')}
          messages={props.messages}
          query={props.logs.query}
          outcome={props.logs.outcome}
        />
      ) : (
        <InvestigationBlockState state={nonReady(props.logsState)} reason={props.logsReason} />
      )}
    </InvestigationSection>
  );
}

function readyGantt(panel: InvestigationPersesResults['gantt']): ReadyGantt | undefined {
  return panel?.outcome.state === 'ready' ? { ...panel, outcome: panel.outcome } : undefined;
}

function readyLogs(panel: InvestigationPersesResults['logs']): ReadyLogs | undefined {
  return panel?.outcome.state === 'ready' ? { ...panel, outcome: panel.outcome } : undefined;
}

function nonReady(state: InvestigationEvidenceState): 'empty' | 'unavailable' {
  return state === 'empty' ? 'empty' : 'unavailable';
}

function operationStatisticsItem(props: Props, gantt: ReadyGantt | undefined, t: TFunction) {
  return {
    key: 'operations',
    label: t('exploreInvestigation.trace.operationStatistics.title'),
    children: gantt ? (
      <TraceOperationStatistics
        spans={gantt.outcome.data.spans}
        partial={
          gantt.outcome.truncated === true ||
          gantt.outcome.data.rootState !== 'unique' ||
          gantt.outcome.data.missingParentCount > 0
        }
        evidenceCurrent={props.evidenceCurrent}
      />
    ) : (
      <InvestigationBlockState state={nonReady(props.ganttState)} reason={props.ganttReason} />
    )
  };
}
