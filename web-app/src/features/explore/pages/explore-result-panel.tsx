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

import { useTranslation } from 'react-i18next';

import { useLiveLogController } from '../controller/use-live-log-controller';
import { useTraceDetailController } from '../controller/use-trace-detail-controller';
import type { ExploreQuery, LogExploreQuery, TraceExploreQuery } from '../model/explore-model';
import type { ExploreCurrentResultState, ExplorePageResultState } from '../model/explore-result-model';
import type { ExplorePageResult, TraceRow } from '../model/explore-signal-contract';
import { ExploreLoadingResult, ExploreMessageResult, ExploreResultFrame } from '../components/explore-state-panel';
import { LogResult } from '../components/log-result';
import { MetricResult } from '../components/metric-result';
import { TraceResult } from '../components/trace-result';

type ResultPanelProps = {
  query: ExploreQuery;
  result: ExplorePageResultState;
  retry: () => Promise<void>;
  openPath: (path: string) => void;
};

export function ExploreResultPanel({ query, result, retry, openPath }: ResultPanelProps) {
  const { t } = useTranslation();
  if (result.kind === 'invalid') return null;
  if (result.kind === 'loading') return <ExploreLoadingResult />;
  if (result.kind === 'permission')
    return <ExploreMessageResult kind="permission" message={t('common.permission.roleRequiredDescription')} />;
  if (result.kind === 'transport_error' || result.kind === 'contract_error' || result.kind === 'error')
    return <FailureResult kind={result.kind} retry={retry} />;
  if (result.kind === 'live')
    return query.signal === 'logs' ? <LiveLogPanel query={query} openPath={openPath} /> : null;
  if (result.kind === 'refreshing')
    return (
      <RetainedResult
        resultKey="refreshing"
        query={query}
        result={result.evidence}
        retry={retry}
        openPath={openPath}
        message={<ExploreMessageResult kind="loading" message={t('explore.states.refreshing')} />}
      />
    );
  if (result.kind === 'stale_error')
    return (
      <RetainedResult
        resultKey="stale-error"
        query={query}
        result={result.evidence}
        retry={retry}
        openPath={openPath}
        message={
          <ExploreMessageResult
            kind="unavailable"
            message={t('explore.states.staleError', { reason: t(refreshFailureMessageKey(result.errorKind)) })}
            retry={retry}
            retryLabel={t('common.retry')}
          />
        }
      />
    );
  return (
    <HistoricalResult key="current" query={query} result={result} retry={retry} openPath={openPath} evidenceCurrent />
  );
}

function FailureResult({
  kind,
  retry
}: {
  kind: 'transport_error' | 'contract_error' | 'error';
  retry: () => Promise<void>;
}) {
  const { t } = useTranslation();
  const messageKey = failureMessageKey(kind);
  return <ExploreMessageResult kind="error" message={t(messageKey)} retry={retry} retryLabel={t('common.retry')} />;
}

function failureMessageKey(kind: 'transport_error' | 'contract_error' | 'error') {
  if (kind === 'transport_error') return 'explore.states.transportError';
  if (kind === 'contract_error') return 'explore.states.contractError';
  return 'explore.loadFailed';
}

function RetainedResult({
  message,
  resultKey,
  ...props
}: Omit<ResultPanelProps, 'result'> & {
  result: ExploreCurrentResultState;
  message: React.ReactNode;
  resultKey: string;
}) {
  return (
    <>
      {message}
      <HistoricalResult key={resultKey} {...props} evidenceCurrent={false} />
    </>
  );
}

function refreshFailureMessageKey(errorKind: Extract<ExplorePageResultState, { kind: 'stale_error' }>['errorKind']) {
  if (errorKind === 'permission') return 'common.permission.roleRequiredDescription';
  if (errorKind === 'transport_error') return 'explore.states.transportError';
  if (errorKind === 'contract_error') return 'explore.states.contractError';
  return 'explore.loadFailed';
}

function LiveLogPanel({ query, openPath }: { query: LogExploreQuery; openPath: (path: string) => void }) {
  const { t } = useTranslation();
  const live = useLiveLogController(query);
  return (
    <ExploreResultFrame>
      <LogResult query={query} t={t} navigate={openPath} live={live} />
    </ExploreResultFrame>
  );
}

function HistoricalResult({
  query,
  result,
  retry,
  openPath,
  evidenceCurrent
}: Omit<ResultPanelProps, 'result'> & { result: ExploreCurrentResultState; evidenceCurrent: boolean }) {
  const { t } = useTranslation();
  if (result.kind === 'metric') {
    return query.signal === 'metrics' ? (
      <MetricResult data={result.data} state={result.state} retry={retry} t={t} />
    ) : null;
  }
  if (result.signal === 'logs' && query.signal === 'logs')
    return (
      <ExploreResultFrame>
        <LogResult data={result.data} query={query} t={t} navigate={openPath} evidenceCurrent={evidenceCurrent} />
      </ExploreResultFrame>
    );
  if (result.signal === 'traces' && query.signal === 'traces')
    return <TracePanel data={result.data} query={query} openPath={openPath} evidenceCurrent={evidenceCurrent} />;
  return null;
}

function TracePanel({
  data,
  query,
  openPath,
  evidenceCurrent
}: {
  data: ExplorePageResult<TraceRow>;
  query: TraceExploreQuery;
  openPath: (path: string) => void;
  evidenceCurrent: boolean;
}) {
  const { t } = useTranslation();
  const trace = useTraceDetailController(query, openPath, evidenceCurrent);
  return (
    <ExploreResultFrame>
      <TraceResult data={data} t={t} trace={trace} evidenceCurrent={evidenceCurrent} />
    </ExploreResultFrame>
  );
}
