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

import type { TFunction } from 'i18next';
import { parseLogView } from '@/platform/perses';
import { Button } from 'antd';
import { useRef, type RefObject } from 'react';
import { useLogPreferenceScope } from '../controller/use-log-preference-scope';

import { ExploreLogStatistics } from '../components/explore-log-statistics';
import historyStyles from '../components/explore-history-result.module.css';
import { createExploreLogPersesResult } from '../model/explore-perses-result-model';
import { readLogAnalysisDraft } from '../model/explore-log-analysis';
import { readLogDisplayPreferences } from '../model/explore-log-display-preferences';
import { buildExplorePath, logTrendZoomPatch, mergeExploreQuery, type LogExploreQuery } from '../model/explore-model';
import type { useExplorePageController } from '../controller/use-explore-page-controller';
import { focusLogSyntaxDiagnostic } from '../components/focus-log-syntax-diagnostic';
import { trendAction, trendFailureMessage } from './explore-log-trend-failure';
import { QuerySetTrend } from './explore-query-set-log-trend';
import styles from './explore-logs-workspace.module.css';

export function ExploreLogTrendRegion({
  controller,
  t
}: {
  controller: ReturnType<typeof useExplorePageController>;
  t: TFunction;
}) {
  const scope = useLogPreferenceScope();
  const { query, result } = controller;
  const region = useRef<HTMLElement>(null);
  if (query.signal !== 'logs' || query.live || query.logRecordUid) return null;
  if (!timelineVisible(query.logView, scope)) return null;
  const showEvidence = currentLogEvidence(result);
  const state = result.kind === 'refreshing' ? 'refreshing' : showEvidence ? showEvidence.kind : result.kind;
  const hasQuerySet = hasLogQuerySet(controller);
  return (
    <section
      className={[historyStyles.logRegion, styles.trendShell].join(' ')}
      ref={region}
      data-explore-log-region="trend"
      data-trend-state={state}
      role="region"
      aria-label={t('exploreLog.trend')}
      aria-busy={state === 'loading' || state === 'refreshing'}
    >
      {hasQuerySet ? (
        <QuerySetTrend controller={controller} t={t} />
      ) : showEvidence ? (
        <CurrentTrend controller={controller} query={query} evidence={showEvidence} t={t} />
      ) : (
        <TrendPlaceholder controller={controller} region={region} state={state} t={t} />
      )}
    </section>
  );
}

function hasLogQuerySet(controller: Controller) {
  const query = controller.query;
  const draft = controller.submission?.draft;
  return Boolean(
    (query.signal === 'logs' && readLogAnalysisDraft(query.logAnalysis)?.querySet) ||
    (draft?.signal === 'logs' && readLogAnalysisDraft(draft.logAnalysis)?.querySet)
  );
}

function timelineVisible(logView: string | undefined, scope?: { workspaceId: string; username: string }) {
  if (logView === undefined) return readLogDisplayPreferences(scope).showTimeline !== false;
  try {
    return parseLogView(logView).showTimeline !== false;
  } catch {
    return true;
  }
}

type Result = ReturnType<typeof useExplorePageController>['result'];
type Controller = ReturnType<typeof useExplorePageController>;

function currentLogEvidence(result: Result) {
  if (result.kind === 'stale_error') return undefined;
  const evidence = result.kind === 'refreshing' ? result.evidence : result;
  return (evidence.kind === 'ready' || evidence.kind === 'empty') && evidence.signal === 'logs' ? evidence : undefined;
}

function CurrentTrend({
  controller,
  query,
  evidence,
  t
}: {
  controller: Controller;
  query: LogExploreQuery;
  evidence: NonNullable<ReturnType<typeof currentLogEvidence>>;
  t: TFunction;
}) {
  const { result, openPath } = controller;
  const current = result.kind === 'ready' || result.kind === 'empty';
  return (
    <ExploreLogStatistics
      defaultCollapsed={readLogAnalysisDraft(query.logAnalysis)?.representation === 'timeseries'}
      statistics={evidence.statistics}
      timeWindow={evidence.window}
      runtimeIdentity={
        createExploreLogPersesResult(query, evidence.data, evidence.window, evidence.revision).runtimeIdentity
      }
      retry={evidence.statistics.trend.kind === 'error' ? controller.refresh : undefined}
      onTimeWindowChange={
        current
          ? nextWindow => {
              const patch = logTrendZoomPatch(query, evidence.window, nextWindow);
              if (patch) openPath(buildExplorePath(mergeExploreQuery(query, patch)));
            }
          : undefined
      }
      t={t}
    />
  );
}

function TrendPlaceholder({
  controller,
  region,
  state,
  t
}: {
  controller: Controller;
  region: RefObject<HTMLElement | null>;
  state: string;
  t: TFunction;
}) {
  const result = controller.result;
  const action = trendAction(result);
  return (
    <div className={styles.trendPlaceholder}>
      <span role={state === 'loading' ? 'status' : 'alert'}>{trendFailureMessage(result, t, controller.query)}</span>
      {action === 'retry' && (
        <Button size="small" onClick={() => void controller.refresh()}>
          {t('common.retry')}
        </Button>
      )}
      {action === 'review' && (
        <Button size="small" onClick={() => focusCurrentQuery(region.current, result)}>
          {t('explore.recovery.reviewQuery')}
        </Button>
      )}
    </div>
  );
}

function focusCurrentQuery(region: HTMLElement | null, result: Result) {
  if (focusLogSyntaxDiagnostic(region, 'syntaxDiagnostic' in result ? result.syntaxDiagnostic : undefined)) return;
  region
    ?.closest('[data-explore-query-layout]')
    ?.querySelector<HTMLElement>('[data-log-comparison-source="a"] [data-log-search-input]')
    ?.focus();
}
