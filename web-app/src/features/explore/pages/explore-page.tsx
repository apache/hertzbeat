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

import { ExploreQueryBar } from '../components/explore-query-bar';
import { ExploreLoadingResult, ExploreMessageResult, ExploreResultFrame } from '../components/explore-state-panel';
import { ExploreWorkbench } from '../components/explore-workbench';
import { LogResult } from '../components/log-result';
import { MetricResult } from '../components/metric-result';
import { TraceResult } from '../components/trace-result';
import { useExplorePageController, type ExplorePageResultState } from '../controller/use-explore-page-controller';
import { useLiveLogController } from '../controller/use-live-log-controller';
import { useTraceDetailController } from '../controller/use-trace-detail-controller';
import type { ExploreQuery, LogExploreQuery, TraceExploreQuery } from '../model/explore-model';
import type { ExplorePageResult, TraceRow } from '../model/explore-signal-contract';
import styles from './explore-page.module.css';

export function ExplorePage() {
  const { t } = useTranslation();
  const controller = useExplorePageController();
  return (
    <div className={styles.page}>
      <ExploreWorkbench
        query={controller.query}
        t={t}
        updateQuery={controller.updateQuery}
        refresh={controller.refresh}
      />
      <ExploreQueryBar
        query={controller.query}
        t={t}
        updateQuery={controller.updateQuery}
        submission={controller.submission}
      />
      <ResultPanel
        query={controller.query}
        result={controller.result}
        retry={controller.refresh}
        openPath={controller.openPath}
      />
    </div>
  );
}

function ResultPanel({
  query,
  result,
  retry,
  openPath
}: {
  query: ExploreQuery;
  result: ExplorePageResultState;
  retry: () => Promise<void>;
  openPath: (path: string) => void;
}) {
  const { t } = useTranslation();
  if (result.kind === 'invalid') return null;
  if (result.kind === 'loading') return <ExploreLoadingResult />;
  if (result.kind === 'transport_error')
    return (
      <ExploreMessageResult
        type="error"
        message={t('explore.states.transportError')}
        retry={retry}
        retryLabel={t('common.retry')}
      />
    );
  if (result.kind === 'contract_error')
    return (
      <ExploreMessageResult
        type="error"
        message={t('explore.states.contractError')}
        retry={retry}
        retryLabel={t('common.retry')}
      />
    );
  if (result.kind === 'storage_unavailable')
    return (
      <ExploreMessageResult
        type="error"
        message={t('explore.states.storageUnavailable')}
        retry={retry}
        retryLabel={t('common.retry')}
      />
    );
  if (result.kind === 'missing_context')
    return <ExploreMessageResult type="info" message={t('explore.states.missingContext')} />;
  if (result.kind === 'unsupported_query')
    return <ExploreMessageResult type="warning" message={t('explore.states.unsupportedQuery')} />;
  if (result.kind === 'error')
    return (
      <ExploreMessageResult
        type="error"
        message={t('explore.loadFailed')}
        retry={retry}
        retryLabel={t('common.retry')}
      />
    );
  if (result.kind === 'live')
    return query.signal === 'logs' ? <LiveLogPanel query={query} openPath={openPath} /> : null;
  return <HistoricalResult query={query} result={result} openPath={openPath} />;
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
  openPath
}: {
  query: ExploreQuery;
  result: Extract<ExplorePageResultState, { kind: 'ready' | 'empty' }>;
  openPath: (path: string) => void;
}) {
  const { t } = useTranslation();
  if (result.signal === 'metrics' && query.signal === 'metrics')
    return (
      <ExploreResultFrame>
        <MetricResult data={result.data} t={t} />
      </ExploreResultFrame>
    );
  if (result.signal === 'logs' && query.signal === 'logs')
    return (
      <ExploreResultFrame>
        <LogResult data={result.data} query={query} t={t} navigate={openPath} />
      </ExploreResultFrame>
    );
  if (result.signal === 'traces' && query.signal === 'traces')
    return <TracePanel data={result.data} query={query} openPath={openPath} />;
  return null;
}

function TracePanel({
  data,
  query,
  openPath
}: {
  data: ExplorePageResult<TraceRow>;
  query: TraceExploreQuery;
  openPath: (path: string) => void;
}) {
  const { t } = useTranslation();
  const trace = useTraceDetailController(query, openPath);
  return (
    <ExploreResultFrame>
      <TraceResult data={data} t={t} trace={trace} />
    </ExploreResultFrame>
  );
}
