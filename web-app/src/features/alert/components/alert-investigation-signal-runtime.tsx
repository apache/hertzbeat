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

import { Button } from 'antd';
import { useTranslation } from 'react-i18next';

import {
  InvestigationBlockState,
  InvestigationMetricPanels,
  InvestigationSection,
  investigationPrimitiveMessages,
  investigationUnixNanoToEpochMillis
} from '@/features/explore';
import { HertzBeatLogsTableResult } from '@/platform/perses';

import type { AlertInvestigationViewState } from '../model/alert-investigation-contract';
import styles from './alert-investigation-view.module.css';

type ReadyState = Extract<AlertInvestigationViewState, { kind: 'ready' }>;
const maximumLogFocusActions = 5;
const messageScope = {
  root: 'alertInvestigation',
  empty: 'states.empty',
  unavailable: 'states.unavailable'
};

export function AlertMetricsSection({ state, onOpen }: { state: ReadyState; onOpen?: (() => void) | undefined }) {
  const { t } = useTranslation();
  const panels = state.perses.metrics.flatMap(panel =>
    panel.outcome.state === 'ready' ? [{ ...panel, outcome: panel.outcome }] : []
  );
  return (
    <InvestigationSection
      title={t('alertInvestigation.sections.metrics')}
      action={panels.length > 0 ? onOpen : undefined}
      actionLabel={t('alertInvestigation.actions.openMetrics')}
      evidenceCurrent
    >
      <AnchorMarker state={state} />
      <InvestigationMetricPanels
        metricBlock={state.snapshot.metrics}
        panels={panels}
        messages={investigationPrimitiveMessages(t, messageScope)}
      />
    </InvestigationSection>
  );
}

export function AlertLogsSection({
  state,
  onOpenLog
}: {
  state: ReadyState;
  onOpenLog: (record: ReadyState['snapshot']['logs']['records'][number]) => void;
}) {
  const { t } = useTranslation();
  const panel = state.perses.logs;
  return (
    <InvestigationSection title={t('alertInvestigation.sections.logs')} evidenceCurrent>
      {state.snapshot.logs.state === 'ready' && panel?.outcome.state === 'ready' ? (
        <div className={styles.signalBody}>
          <HertzBeatLogsTableResult
            title={t('alertInvestigation.sections.logs')}
            ariaLabel={t('alertInvestigation.sections.logs')}
            messages={investigationPrimitiveMessages(t, messageScope)}
            query={panel.query}
            outcome={panel.outcome}
          />
          <ol className={styles.logFocusList} aria-label={t('alertInvestigation.logs.focusActions')}>
            {state.snapshot.logs.records.slice(0, maximumLogFocusActions).map(record => (
              <li key={record.logRecordUid}>
                <code>{record.logRecordUid}</code>
                <time>{formatLogTime(record.timeUnixNano, state.route.window.timeZone, t)}</time>
                <Button
                  aria-label={`${t('alertInvestigation.actions.openLog')}: ${record.logRecordUid}`}
                  size="small"
                  onClick={() => onOpenLog(record)}
                >
                  {t('alertInvestigation.actions.openLog')}
                </Button>
              </li>
            ))}
          </ol>
        </div>
      ) : (
        <SignalBlockState state={state.snapshot.logs.state} />
      )}
    </InvestigationSection>
  );
}

function AnchorMarker({ state }: { state: ReadyState }) {
  const { t } = useTranslation();
  const formatter = new Intl.DateTimeFormat(undefined, {
    dateStyle: 'short',
    timeStyle: 'medium',
    timeZone: state.route.window.timeZone
  });
  return (
    <div className={styles.anchorMarker} data-alert-anchor="true">
      <span>{t('alertInvestigation.metrics.before')}</span>
      <strong>{`${t('alertInvestigation.metrics.anchor')} · ${formatter.format(state.snapshot.window.anchor)}`}</strong>
      <span>{t('alertInvestigation.metrics.after')}</span>
    </div>
  );
}

export function SignalBlockState({ state }: { state: 'ready' | 'empty' | 'unavailable' }) {
  const { t } = useTranslation();
  const normalized = state === 'empty' ? 'empty' : 'unavailable';
  return <InvestigationBlockState state={normalized} message={t(`alertInvestigation.states.${normalized}`)} />;
}

function formatLogTime(value: string, timeZone: string, t: (key: string) => string) {
  const millis = investigationUnixNanoToEpochMillis(value);
  return millis == null
    ? t('alertInvestigation.notRecorded')
    : new Intl.DateTimeFormat(undefined, { dateStyle: 'short', timeStyle: 'medium', timeZone }).format(millis);
}
