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
import { Typography } from 'antd';

import { HertzBeatTracingGanttChartResult, type HertzBeatPersesPrimitiveMessages } from '@/platform/perses';

import type {
  InvestigationEvidenceState,
  InvestigationPersesResults,
  LogInvestigationViewState
} from '../model/explore-investigation-contract';
import traceStyles from './explore-investigation-trace.module.css';
import { InvestigationBlockState, InvestigationSection } from './explore-investigation-view-primitives';

type ReadyState = Extract<LogInvestigationViewState, { kind: 'ready' }>;
type Props = {
  state: ReadyState;
  evidenceCurrent: boolean;
  messages: HertzBeatPersesPrimitiveMessages;
  onFocusTrace: () => void;
};

export function InvestigationLogTrace(props: Props) {
  const { t } = useTranslation();
  const trace = props.state.snapshot.trace;
  const panel = readyGantt(trace.state, props.state.perses.gantt);
  const noTraceContext = trace.state === 'empty' && trace.reason === 'not_correlated';
  return (
    <InvestigationSection
      title={t('exploreInvestigation.sections.traces')}
      action={panel ? props.onFocusTrace : undefined}
      actionLabel={t('exploreInvestigation.actions.focusTrace')}
      evidenceCurrent={props.evidenceCurrent}
    >
      {panel ? (
        <>
          {panel.outcome.truncated === true ? (
            <Typography.Text type="warning" role="note">
              {t('exploreInvestigation.trace.loadedSpanLimitNotice')}
            </Typography.Text>
          ) : null}
          <HertzBeatTracingGanttChartResult
            className={traceStyles.ganttRuntime}
            title={t('exploreInvestigation.logs.exactTrace')}
            ariaLabel={t('exploreInvestigation.logs.exactTrace')}
            messages={props.messages}
            query={panel.query}
            outcome={panel.outcome}
          />
        </>
      ) : noTraceContext ? (
        <InvestigationBlockState state="empty" noTraceContext />
      ) : (
        <InvestigationBlockState state={nonReady(trace.state)} reason={trace.reason} />
      )}
    </InvestigationSection>
  );
}

function readyGantt(blockState: InvestigationEvidenceState, panel: InvestigationPersesResults['gantt']) {
  return blockState === 'ready' && panel?.outcome.state === 'ready' ? { ...panel, outcome: panel.outcome } : undefined;
}

function nonReady(state: InvestigationEvidenceState): 'empty' | 'unavailable' {
  return state === 'empty' ? 'empty' : 'unavailable';
}
