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

import type { MetricConsole } from '../model/explore-signal-contract';
import type { MetricResultState } from '../model/explore-signal-model';
import { ExploreMessageResult, ExploreResultFrame } from './explore-state-panel';
import { MetricReadyResult } from './metric-ready-result';
import { SignalEmptyState, SignalResultFrame } from './signal-result-frame';

type MetricResultProps = {
  data: MetricConsole;
  state: MetricResultState;
  retry: () => Promise<void>;
  t: TFunction;
};

export function MetricResult({ data, state, retry, t }: MetricResultProps) {
  if (state.kind === 'error') {
    return <MetricFailure message={state.message ?? t('explore.loadFailed')} retry={retry} t={t} />;
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
  if (state.kind === 'empty') return <MetricEmptyResult t={t} />;
  return (
    <ExploreResultFrame>
      <MetricReadyResult data={data} series={state.series} t={t} />
    </ExploreResultFrame>
  );
}

function MetricFailure({ message, retry, t }: { message: string; retry: () => Promise<void>; t: TFunction }) {
  return <ExploreMessageResult kind="error" message={message} retry={retry} retryLabel={t('common.retry')} />;
}

function MetricEmptyResult({ t }: { t: TFunction }) {
  return (
    <ExploreResultFrame>
      <SignalResultFrame title={t('explore.signals.metrics')} count={0} unit={t('exploreMetric.series')}>
        <SignalEmptyState title={t('explore.empty.metrics')} hint={t('explore.description')} />
      </SignalResultFrame>
    </ExploreResultFrame>
  );
}
