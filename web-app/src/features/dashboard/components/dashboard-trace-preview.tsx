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
import { buildExplorePath } from '@/features/explore';
import type { TraceHistogram } from '@/platform/perses';
import { dashboardReadState } from '../model/dashboard-overview';
import type { DashboardTraceSignals } from '../model/dashboard-signals';
import { NodeIndexOutlined, FullscreenOutlined } from '@ant-design/icons';
import styles from './dashboard-signals.module.css';
import { DashboardTraceSamples } from './dashboard-trace-samples';
export function DashboardTracePreview({ signals }: { signals: DashboardTraceSignals }) {
  const { t } = useTranslation();
  const target = buildExplorePath({
    signal: 'traces',
    timeRange: 'last-15m',
    start: signals.clock.start,
    end: signals.clock.end,
    timeZone: 'UTC',
    serviceName: signals.serviceName || undefined,
    environment: signals.environment || undefined
  });
  return (
    <section className={`${styles.region} ${styles.traceCard}`} aria-labelledby="start-traces-title">
      <header>
        <h3 id="start-traces-title">
          <NodeIndexOutlined aria-hidden="true" /> {t('dashboard.workspace.signals.traces.title')}
        </h3>
        <Link to={target} aria-label={t('dashboard.v3.openExplore')} title={t('dashboard.v3.openExplore')}>
          <FullscreenOutlined aria-hidden="true" />
        </Link>
      </header>
      <TraceEvidence signals={signals} />
    </section>
  );
}

function TraceEvidence({ signals }: { signals: DashboardTraceSignals }) {
  const { t } = useTranslation();
  const evidence = signals.traces.isSuccess && !signals.traces.isFetching ? signals.traces.data : undefined;
  const data = evidence?.state === 'ready' ? evidence.data : null;
  return (
    <>
      {data && evidence?.coverage ? (
        <>
          <div className={styles.traceSummary}>
            <div>
              <span>{t('dashboard.v2.matchedTraces')}</span>
              <strong>{data.totalCount.toLocaleString()}</strong>
            </div>
            <div>
              <span>{t('dashboard.v2.errorTraces')}</span>
              <strong data-error={data.errorCount > 0}>{data.errorCount.toLocaleString()}</strong>
            </div>
          </div>
          <TraceDetails evidence={evidence} data={data} signals={signals} />
        </>
      ) : (
        <p className={styles.empty} role="status">
          {t(dashboardReadState(signals.traces) === 'loading' ? 'dashboard.v2.loading' : 'dashboard.v2.unavailable')}
        </p>
      )}
    </>
  );
}

function TraceDetails({
  evidence,
  data,
  signals
}: {
  evidence: TraceHistogram;
  data: NonNullable<TraceHistogram['data']>;
  signals: DashboardTraceSignals;
}) {
  const { t } = useTranslation();
  return (
    <div className={styles.traceItems}>
      <DashboardTraceSamples
        signals={signals}
        verifiedZero={data.errorCount === 0 && evidence.coverage?.mode === 'window'}
      />
      {evidence.coverage?.mode === 'window' && data.totalCount > 0 && (
        <div className={styles.traceRatio}>
          {t('dashboard.v2.errorRatio')} <strong>{((data.errorCount / data.totalCount) * 100).toFixed(1)}%</strong>
        </div>
      )}
    </div>
  );
}
