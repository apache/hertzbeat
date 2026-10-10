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
import type { LogInspectorAnalysisControls } from '../model/explore-log-inspector-analysis';
import type { LogSortControls } from '../model/explore-log-order';
import type { MetricView } from '@/platform/perses';
import type { LogInspectorFilterControls } from '../model/explore-log-inspector-filter';
import { useTranslation } from 'react-i18next';
import type { ExactTimeWindow } from '@/shared/query-context';

import { ExploreInvalidLogFilter } from '../components/explore-invalid-log-filter';
import { LiveLogPanel } from './explore-live-log-panel';
import type { ExploreQuery } from '../model/explore-model';
import type { ExploreCurrentResultState, ExplorePageResultState } from '../model/explore-result-model';
import { ExploreLoadingResult, ExploreMessageResult } from '../components/explore-state-panel';
import { ExploreMetricResult } from './explore-metric-result';
import { exploreFailureMessageKey, refreshFailureMessageKey, isExploreQueryFailure } from './explore-result-messages';
import { ExplorePersesLogPanel } from './explore-perses-log-panel';
import { ExplorePersesTracePanel } from './explore-perses-trace-panel';

type ResultPanelProps = LogInspectorFilterControls &
  LogInspectorAnalysisControls & {
    logOrder?: LogSortControls | undefined;
    query: ExploreQuery;
    result: ExplorePageResultState;
    retry: () => Promise<void>;
    openPath: (path: string) => void;
    onMetricViewChange?: ((view: MetricView) => void) | undefined;
    onTimeWindowChange?: ((window: ExactTimeWindow) => void) | undefined;
  };

export function ExploreResultPanel(props: ResultPanelProps) {
  const { result, ...common } = props;
  const { query, retry } = common;
  const { t } = useTranslation();
  if (result.kind === 'invalid') return null;
  if (result.kind === 'loading') return <ExploreLoadingResult />;
  if (result.kind === 'permission')
    return <ExploreMessageResult kind="permission" message={t('common.permission.roleRequiredDescription')} />;
  if (result.kind === 'invalid_filter') return <ExploreInvalidLogFilter {...result} />;
  if (isExploreQueryFailure(result))
    return (
      <ExploreMessageResult
        kind="error"
        message={t(exploreFailureMessageKey(result.kind))}
        retry={retry}
        retryLabel={t('common.retry')}
      />
    );
  if (result.kind === 'live') return query.signal === 'logs' ? <LiveLogPanel {...common} query={query} /> : null;
  if (result.kind === 'refreshing')
    return (
      <RetainedResult
        {...common}
        result={result.evidence}
        evidenceCurrent={false}
        message={<ExploreMessageResult kind="loading" message={t('explore.states.refreshing')} />}
      />
    );
  if (result.kind === 'stale_error')
    return (
      <RetainedResult
        {...common}
        result={result.evidence}
        evidenceCurrent={false}
        message={
          result.errorKind === 'invalid_filter' ? (
            <ExploreInvalidLogFilter retained {...result} />
          ) : (
            <ExploreMessageResult
              kind="unavailable"
              message={t('explore.states.staleError', { reason: t(refreshFailureMessageKey(result.errorKind)) })}
              retry={retry}
              retryLabel={t('common.retry')}
            />
          )
        }
      />
    );
  return <RetainedResult {...common} result={result} evidenceCurrent={true} message={null} />;
}

function RetainedResult({
  message,
  ...props
}: Omit<ResultPanelProps, 'result'> & {
  result: ExploreCurrentResultState;
  message: React.ReactNode;
  evidenceCurrent: boolean;
}) {
  return (
    <>
      {message}
      <HistoricalResult
        {...props}
        onAddLogFilter={props.evidenceCurrent ? props.onAddLogFilter : undefined}
        evidenceCurrent={props.evidenceCurrent}
      />
    </>
  );
}

function HistoricalResult({
  query,
  result,
  retry,
  openPath,
  onTimeWindowChange,
  onMetricViewChange,
  evidenceCurrent,
  ...logControls
}: Omit<ResultPanelProps, 'result'> & { result: ExploreCurrentResultState; evidenceCurrent: boolean }) {
  if (result.kind === 'metric') {
    return query.signal === 'metrics' ? (
      <ExploreMetricResult
        query={query}
        result={result}
        retry={retry}
        openPath={openPath}
        evidenceCurrent={evidenceCurrent}
        onTimeWindowChange={onTimeWindowChange}
        onViewChange={onMetricViewChange}
      />
    ) : null;
  }
  if (result.signal === 'logs' && query.signal === 'logs')
    return (
      <ExplorePersesLogPanel
        {...logControls}
        data={result.data}
        calculated={result.calculated}
        statistics={result.statistics}
        query={query}
        openPath={openPath}
        timeWindow={result.window}
        revision={result.revision}
        evidenceCurrent={evidenceCurrent}
        showTrend={false}
      />
    );
  if (result.signal === 'traces' && query.signal === 'traces')
    return (
      <ExplorePersesTracePanel
        data={result.data}
        query={query}
        openPath={openPath}
        timeWindow={result.window}
        revision={result.revision}
        evidenceCurrent={evidenceCurrent}
      />
    );
  return null;
}
