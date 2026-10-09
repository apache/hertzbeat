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
import { logOrderControls } from '../model/explore-log-order-controls';
import type { useLogInspectorAnalysis } from '../controller/use-log-inspector-analysis';
import { ExploreLogWorkspaceResults } from './explore-log-workspace-results';
import type { ReactNode } from 'react';
import type { useTraceAnalytics } from '../controller/use-trace-analytics';
import { ExploreTraceWorkspaceResults } from './explore-trace-workspace-results';
import { ExploreTraceStructureResults } from './explore-trace-structure-results';
import { encodeMetricView } from '@/platform/perses';
import type { useMetricPlanEditor } from '../controller/use-metric-plan-editor';
import type { TFunction } from 'i18next';
import { WorkspaceMetricCatalog } from './explore-workspace-metric-catalog';
import styles from '../components/explore-workbench.module.css';
import { useMetricInventory } from '../controller/use-metric-inventory';
import type { useExplorePageController } from '../controller/use-explore-page-controller';
import { logInspectorFilterPatch, type LogInspectorFilterTarget } from '../model/explore-log-inspector-filter';
import { draftFromQuery } from '../model/explore-submission-model';
import { metricTrendZoomPatch } from '../model/explore-model';
import { hasMetricQueryEvidence } from '../model/explore-result-model';
import { ExploreResultPanel } from './explore-result-panel';
import { submitLogDraftPatch } from './explore-workspace-log-draft-submit';

export function ExploreWorkspaceResults({
  controller,
  t,
  logFilterEnabled = true,
  metricEditor,
  traceAnalytics,
  inspectorAnalysis
}: {
  controller: ReturnType<typeof useExplorePageController>;
  t: TFunction;
  logFilterEnabled?: boolean;
  traceAnalytics?: ReturnType<typeof useTraceAnalytics> | undefined;
  metricEditor?: ReturnType<typeof useMetricPlanEditor>;
  inspectorAnalysis: ReturnType<typeof useLogInspectorAnalysis>;
}) {
  const inventory = useMetricInventory(controller.query);
  const metrics = controller.query.signal === 'metrics';
  const dirty = JSON.stringify(controller.submission.draft) !== JSON.stringify(draftFromQuery(controller.query));
  const result = (
    <ExploreResultPanel
      {...inspectorAnalysis.controls}
      logOrder={logOrderControls(controller.query, controller.submission)}
      query={controller.query}
      result={controller.result}
      logFilterScope={controller.query}
      logFilterPending={false}
      logFilterDraft={controller.submission.draft.signal === 'logs' ? controller.submission.draft : undefined}
      onAddLogFilter={
        logFilterEnabled ? (target, operator, mode) => addLogFilter(controller, target, operator, mode) : undefined
      }
      retry={controller.refresh}
      openPath={controller.openPath}
      onTimeWindowChange={window => zoomMetricTrend(controller, window)}
      onMetricViewChange={view => controller.updateQuery({ metricView: encodeMetricView(view) })}
    />
  );
  return (
    <div className={metrics ? styles.metricWorkspace : styles.resultRegion} data-explore-region="results">
      {metrics && (
        <WorkspaceMetricCatalog controller={controller} metricEditor={metricEditor} inventory={inventory} t={t} />
      )}
      {metrics ? (
        <div className={styles.metricResult}>
          {dirty && hasMetricQueryEvidence(controller.result) && (
            <p className={styles.draftNotice}>{t('exploreMetric.pendingDraft')}</p>
          )}
          {result}
        </div>
      ) : (
        <SignalWorkspaceResults controller={controller} traceAnalytics={traceAnalytics} dirty={dirty} t={t}>
          {result}
        </SignalWorkspaceResults>
      )}
    </div>
  );
}

function addLogFilter(
  controller: ReturnType<typeof useExplorePageController>,
  target: LogInspectorFilterTarget,
  operator: '=' | '!=',
  mode?: 'replace'
) {
  const { query, submission } = controller;
  if (
    query.signal !== 'logs' ||
    submission.draft.signal !== 'logs' ||
    !['ready', 'live'].includes(controller.result.kind)
  )
    return false;
  const patch = logInspectorFilterPatch(submission.draft, target, operator, query, mode);
  if (!patch) return false;
  return submitLogDraftPatch(submission, patch);
}

function zoomMetricTrend(
  controller: ReturnType<typeof useExplorePageController>,
  window: Parameters<typeof metricTrendZoomPatch>[1]
) {
  if (controller.result.kind !== 'metric') return;
  const patch = metricTrendZoomPatch(controller.result.window, window);
  if (patch) controller.updateQuery(patch);
}

function SignalWorkspaceResults({
  controller,
  traceAnalytics,
  dirty,
  t,
  children
}: {
  controller: ReturnType<typeof useExplorePageController>;
  traceAnalytics?: ReturnType<typeof useTraceAnalytics> | undefined;
  dirty: boolean;
  t: TFunction;
  children: ReactNode;
}) {
  const showDraftNotice = dirty && controller.result.kind === 'ready' && controller.query.signal !== 'logs';
  return (
    <>
      {showDraftNotice && (
        <p className={styles.draftNotice} role="status">
          {t('exploreMetric.pendingDraft')}
        </p>
      )}
      {controller.query.signal === 'traces' && controller.query.traceStructure !== undefined ? (
        <ExploreTraceStructureResults controller={controller} query={controller.query}>
          {children}
        </ExploreTraceStructureResults>
      ) : controller.query.signal === 'traces' && traceAnalytics ? (
        <ExploreTraceWorkspaceResults controller={controller} analytics={traceAnalytics}>
          {children}
        </ExploreTraceWorkspaceResults>
      ) : (
        <ExploreLogWorkspaceResults controller={controller} t={t}>
          {children}
        </ExploreLogWorkspaceResults>
      )}
    </>
  );
}
