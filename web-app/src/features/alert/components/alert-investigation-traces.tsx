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
  InvestigationSection,
  investigationDurationNanoToMillis,
  investigationUnixNanoToEpochMillis
} from '@/features/explore';

import type { AlertInvestigationViewState } from '../model/alert-investigation-contract';
import { SignalBlockState } from './alert-investigation-signal-runtime';
import styles from './alert-investigation-view.module.css';

type ReadyState = Extract<AlertInvestigationViewState, { kind: 'ready' }>;
type Trace = ReadyState['snapshot']['traces']['traces'][number];

export function AlertTracesSection({ state, onOpen }: { state: ReadyState; onOpen: (trace: Trace) => void }) {
  const { t } = useTranslation();
  return (
    <InvestigationSection title={t('alertInvestigation.sections.traces')} evidenceCurrent>
      {state.snapshot.traces.state === 'ready' ? (
        <div className={styles.tableScroll}>
          <table className={styles.evidenceTable}>
            <thead>
              <tr>
                {['traceId', 'service', 'start', 'duration', 'status', 'spans'].map(column => (
                  <th key={column}>{t(`alertInvestigation.traces.${column}`)}</th>
                ))}
                <th>{t('alertInvestigation.actions.openTrace')}</th>
              </tr>
            </thead>
            <tbody>
              {state.snapshot.traces.traces.map(trace => (
                <TraceRow key={trace.traceId} trace={trace} timeZone={state.route.window.timeZone} onOpen={onOpen} />
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <SignalBlockState state={state.snapshot.traces.state} />
      )}
    </InvestigationSection>
  );
}

function TraceRow({ trace, timeZone, onOpen }: { trace: Trace; timeZone: string; onOpen: (trace: Trace) => void }) {
  const { t } = useTranslation();
  const start = investigationUnixNanoToEpochMillis(trace.startTimeUnixNano);
  const duration = investigationDurationNanoToMillis(trace.durationNanos);
  return (
    <tr>
      <td className={styles.identifier} title={trace.traceId}>
        {trace.traceId}
      </td>
      <td>{trace.serviceName}</td>
      <td>{start == null ? t('alertInvestigation.notRecorded') : formatTime(start, timeZone)}</td>
      <td>{duration == null ? t('alertInvestigation.notRecorded') : `${duration.toLocaleString()} ms`}</td>
      <td>{t(`alertInvestigation.traceStatus.${trace.status}`)}</td>
      <td>{trace.spanCount.toLocaleString()}</td>
      <td>
        <Button size="small" onClick={() => onOpen(trace)}>
          {t('alertInvestigation.actions.openTrace')}
        </Button>
      </td>
    </tr>
  );
}

function formatTime(value: number, timeZone: string) {
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'short', timeStyle: 'medium', timeZone }).format(value);
}
