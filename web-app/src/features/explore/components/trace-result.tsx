/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import type { TFunction } from 'i18next';

import type { ExplorePageResult, TraceRow } from '../model/explore-signal-contract';
import type { TraceDetailState } from '../model/explore-signal-model';
import { SignalEmptyState, SignalResultFrame } from './signal-result-frame';
import { TraceDetail } from './trace-detail';
import styles from './trace-result.module.css';
import { TraceTable } from './trace-table';

export type TraceDetailView = {
  state: TraceDetailState;
  openTrace: (traceId: string) => void;
  close: () => void;
  selectSpan: (spanId: string) => void;
  retry: () => Promise<void>;
  changePage: (page: number) => void;
  openRelatedLogs: () => void;
  openRelatedMetrics: () => void;
};

export function TraceResult({
  data,
  t,
  trace
}: {
  data: ExplorePageResult<TraceRow>;
  t: TFunction;
  trace: TraceDetailView;
}) {
  const detailOpen = trace.state.kind !== 'closed';
  const selectedTraceId = trace.state.kind === 'closed' ? undefined : trace.state.traceId;
  return (
    <SignalResultFrame title={t('explore.signals.traces')} count={data.totalElements}>
      <div className={styles.workspace} data-detail-open={detailOpen}>
        <div className={styles.resultPane}>
          {data.totalElements === 0 ? (
            <SignalEmptyState title={t('explore.empty.traces')} hint={t('explore.description')} />
          ) : (
            <TraceTable
              data={data}
              t={t}
              detailOpen={detailOpen}
              selectedTraceId={selectedTraceId}
              openTrace={trace.openTrace}
              changePage={trace.changePage}
            />
          )}
        </div>
        {trace.state.kind !== 'closed' && (
          <TraceDetail
            state={trace.state}
            t={t}
            close={trace.close}
            selectSpan={trace.selectSpan}
            retry={trace.retry}
            openRelatedLogs={trace.openRelatedLogs}
            openRelatedMetrics={trace.openRelatedMetrics}
          />
        )}
      </div>
    </SignalResultFrame>
  );
}
