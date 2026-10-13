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

import {
  HertzBeatMetricTimeSeriesResult,
  type HertzBeatMetricQueryOutcome,
  type HertzBeatPersesPrimitiveMessages
} from '@/platform/perses';

import type { EntitySignalViewState } from '../model/entity-signal-view-model';
import { EntitySignalSection } from './entity-signal-section';
import { SummaryValue } from './entity-signal-evidence';
import styles from './entity-signal-view.module.css';

type ReadyState = Extract<EntitySignalViewState, { kind: 'ready' }>;

export function EntitySignalMetricsSection({
  state,
  messages,
  open
}: {
  state: ReadyState;
  messages: HertzBeatPersesPrimitiveMessages;
  open: () => void;
}) {
  const { t } = useTranslation();
  if (state.capabilities.metrics !== 'available' || state.red?.state !== 'ready' || !state.redMetrics) return null;
  const red = state.red;
  return (
    <EntitySignalSection title={t('entity.signals.sections.metrics')} action={open}>
      <RedSummary red={red} />
      <RedMetricGrid state={state} messages={messages} />
    </EntitySignalSection>
  );
}

function RedSummary({ red }: { red: Extract<NonNullable<ReadyState['red']>, { state: 'ready' }> }) {
  const { t } = useTranslation();
  return (
    <div className={styles.redSummary}>
      <SummaryValue label={t('entity.signals.red.requestRate')} value={formatRate(red.summary.requestRatePerSecond)} />
      <SummaryValue label={t('entity.signals.red.errorRate')} value={formatPercent(red.summary.errorRate)} />
      <SummaryValue label={t('entity.signals.red.latencyP95')} value={formatLatency(red.summary.latencyP95Ms)} />
      <SummaryValue label={t('entity.signals.red.requests')} value={formatNumber(red.summary.requestCount)} />
    </div>
  );
}

function RedMetricGrid({ state, messages }: { state: ReadyState; messages: HertzBeatPersesPrimitiveMessages }) {
  if (!state.redMetrics) return null;
  const window = state.plan.logsQuery.timeWindow;
  const panels = [
    { key: 'requestRate' as const, metric: 'request_rate_per_second', label: 'requestRate' },
    { key: 'errorRate' as const, metric: 'error_rate', label: 'errorRate' },
    { key: 'latencyP95' as const, metric: 'latency_p95_ms', label: 'latencyP95' }
  ];
  return (
    <div className={styles.metricGrid}>
      {panels.map(panel => (
        <RedMetricPanel
          key={panel.key}
          label={panel.label}
          messages={messages}
          metric={panel.metric}
          outcome={state.redMetrics![panel.key]}
          window={window}
        />
      ))}
    </div>
  );
}

function RedMetricPanel({
  label,
  messages,
  metric,
  outcome,
  window
}: {
  label: string;
  messages: HertzBeatPersesPrimitiveMessages;
  metric: string;
  outcome: HertzBeatMetricQueryOutcome;
  window: ReadyState['plan']['logsQuery']['timeWindow'];
}) {
  const { t } = useTranslation();
  if (outcome.state !== 'ready') return null;
  return (
    <HertzBeatMetricTimeSeriesResult
      title={t(`entity.signals.red.${label}`)}
      ariaLabel={t(`entity.signals.aria.${label}`)}
      messages={messages}
      query={{ signal: 'metrics', queryKind: 'time-series', timeWindow: window, metric: { name: metric } }}
      outcome={outcome}
    />
  );
}

function formatRate(value: number) {
  return `${new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }).format(value)}/s`;
}
function formatPercent(value: number) {
  return new Intl.NumberFormat(undefined, { style: 'percent', maximumFractionDigits: 2 }).format(value);
}
function formatLatency(value: number | null) {
  return value == null ? '—' : `${new Intl.NumberFormat(undefined, { maximumFractionDigits: 1 }).format(value)} ms`;
}
function formatNumber(value: number) {
  return new Intl.NumberFormat().format(value);
}
