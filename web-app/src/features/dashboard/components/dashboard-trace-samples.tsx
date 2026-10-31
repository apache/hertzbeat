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
import { Link } from 'react-router-dom';
import { CheckCircleOutlined, CloseCircleOutlined } from '@ant-design/icons';
import type { TraceRow } from '@/features/explore';
import type { DashboardTraceSignals } from '../model/dashboard-signals';
import { dashboardTraceSampleState, dashboardTraceSampleTarget } from '../model/dashboard-trace-samples';
import styles from './dashboard-signals.module.css';
export function DashboardTraceSamples({
  signals,
  verifiedZero
}: {
  signals: DashboardTraceSignals;
  verifiedZero: boolean;
}) {
  const { t } = useTranslation();
  if (verifiedZero)
    return (
      <p className={styles.traceEmpty}>
        <CheckCircleOutlined aria-hidden="true" /> {t('dashboard.v3.noErrorTraces')}
      </p>
    );
  const state = dashboardTraceSampleState(signals.traceSamples);
  if (state !== 'ready') {
    const messages = {
      loading: 'dashboard.v3.traceSamplesLoading',
      error: 'dashboard.v3.traceSamplesFailed',
      unsupported: 'dashboard.v3.traceSamplesUnsupported',
      unavailable: 'dashboard.v3.traceSamplesMissing'
    };
    return (
      <p className={styles.traceEmpty} role="status">
        {t(messages[state])}
      </p>
    );
  }
  return (
    <ul className={styles.traceSampleList}>
      {signals.traceSamples.data?.rows.slice(0, 2).map(row => (
        <TraceSample key={row.traceId} row={row} signals={signals} />
      ))}
    </ul>
  );
}
function TraceSample({ row, signals }: { row: TraceRow; signals: DashboardTraceSignals }) {
  const { t } = useTranslation();
  const name = row.rootSpanName ?? row.representativeSpan.spanName ?? row.traceId;
  const service = row.serviceName ?? row.representativeSpan.serviceName ?? '—';
  const duration =
    row.durationNanos === null
      ? '—'
      : `${(row.durationNanos / 1000000).toLocaleString(undefined, { maximumFractionDigits: 2 })} ms`;
  return (
    <li>
      <Link to={dashboardTraceSampleTarget(row, signals)} title={row.traceId}>
        <CloseCircleOutlined aria-hidden="true" />
        <span className={styles.traceSampleText}>
          <strong title={name}>{name}</strong>
          <small>
            {service} · {row.status?.toUpperCase() ?? '—'} ·{' '}
            {t('dashboard.v3.errorSpans', { count: row.errorSpanCount })}
          </small>
        </span>
        <span className={styles.traceSampleTime}>
          <span>{duration}</span>
          <small>{new Date(row.startTime ?? row.observedStartTime).toLocaleTimeString()}</small>
        </span>
      </Link>
    </li>
  );
}
