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

import type { MetricView } from '@/platform/perses';
import type { TFunction } from 'i18next';
import type { ExactTimeWindow } from '@/shared/query-context';

import type { MetricExploreQuery } from '../model/explore-query';
import type { MetricConsole } from '../model/explore-signal-contract';
import type { MetricResultState } from '../model/explore-signal-model';
import { ExploreMessageResult, ExploreResultFrame } from './explore-state-panel';
import { MetricReadyResult } from './metric-ready-result';
import { SignalEmptyState, SignalResultFrame } from './signal-result-frame';

type MetricResultProps = {
  onViewChange?: ((view: MetricView) => void) | undefined;
  data?: MetricConsole | undefined;
  state: MetricResultState;
  retry: () => Promise<void>;
  t: TFunction;
  query: MetricExploreQuery;
  timeWindow: ExactTimeWindow | undefined;
  revision: number;
  onOpenLogs?: (() => void) | undefined;
  onTimeWindowChange?: ((window: ExactTimeWindow) => void) | undefined;
};

export function MetricResult({
  data,
  state,
  retry,
  t,
  query,
  timeWindow,
  revision,
  onTimeWindowChange,
  onOpenLogs,
  onViewChange
}: MetricResultProps) {
  if (state.kind === 'selection_required') {
    return <ExploreMessageResult kind="empty" message={t('exploreMetric.selectMetric')} />;
  }
  if (state.kind === 'error') {
    return <MetricFailure message={state.message} retry={retry} t={t} />;
  }
  if (state.kind === 'invalid_query') {
    return <ExploreMessageResult kind="error" message={t('explore.metricComposition.states.invalid_query')} />;
  }
  if (state.kind === 'storage_unavailable') {
    return <MetricFailure message={t('explore.states.storageUnavailable')} retry={retry} t={t} />;
  }
  if (state.kind === 'missing_context') {
    return <ExploreMessageResult kind="empty" message={t('explore.states.missingContext')} />;
  }
  if (state.kind === 'unsupported_query') {
    return <ExploreMessageResult kind="unsupported" message={t('explore.states.unsupportedQuery')} />;
  }
  if (state.kind === 'contract_error' || (state.kind === 'ready' && (!timeWindow || !data))) {
    return <MetricFailure message={t('explore.states.contractError')} retry={retry} t={t} />;
  }
  if (state.kind === 'empty') return <MetricEmptyResult t={t} />;
  return (
    <ExploreResultFrame>
      <MetricReadyResult
        onViewChange={onViewChange}
        data={data!}
        series={state.series}
        query={query}
        timeWindow={timeWindow!}
        revision={revision}
        t={t}
        onTimeWindowChange={onTimeWindowChange}
        onOpenLogs={onOpenLogs}
      />
    </ExploreResultFrame>
  );
}

function MetricFailure({
  message,
  retry,
  t
}: {
  message?: string | undefined;
  retry: () => Promise<void>;
  t: TFunction;
}) {
  return (
    <ExploreMessageResult
      kind="error"
      message={message ?? t('explore.loadFailed')}
      retry={retry}
      retryLabel={t('common.retry')}
    />
  );
}

function MetricEmptyResult({ t }: { t: TFunction }) {
  return (
    <ExploreResultFrame>
      <SignalResultFrame title={t('explore.signals.metrics')} count={0} unit={t('exploreMetric.series')}>
        <SignalEmptyState
          title={t('explore.empty.metrics')}
          hint={t('explore.recovery.metrics')}
          reviewQueryLabel={t('explore.recovery.reviewQuery')}
        />
      </SignalResultFrame>
    </ExploreResultFrame>
  );
}
