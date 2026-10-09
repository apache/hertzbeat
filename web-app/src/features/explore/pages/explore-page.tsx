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

import { HertzBeatTimeZoneProvider } from '@/platform/perses';
import { normalizeInvestigationTimeZone } from '@/shared/query-context';
import type { TFunction } from 'i18next';
import { useMetricPlanEditor } from '../controller/use-metric-plan-editor';
import { useTranslation } from 'react-i18next';

import { OperationalPage } from '@/shared/operational-page';

import { useExplorePageController } from '../controller/use-explore-page-controller';
import { useTraceAnalytics } from '../controller/use-trace-analytics';
import { useLogScopeSuggestions } from '../controller/use-log-scope-suggestions';
import { useLogQueryBuilder } from '../controller/use-log-query-builder';
import { useLogInspectorAnalysis } from '../controller/use-log-inspector-analysis';
import { traceViewPatch } from '../model/explore-trace-view';
import { ExploreFocusedLogPage } from './explore-focused-investigation';
import { ExploreTraceDrawer } from './explore-trace-drawer';
import { ExploreWorkspaceResults } from './explore-workspace-results';
import { ExploreLogsWorkspace } from './explore-logs-workspace';
import { ExploreOtherSignalsWorkspace } from './explore-other-signals-workspace';
import { useExploreSavedQueries } from '../controller/use-explore-saved-queries';
import type { SavedQueriesViewModel } from '../model/explore-saved-query-view-model';

export function ExplorePage() {
  const { t } = useTranslation();
  const controller = useExplorePageController();
  const savedQueries = useExploreSavedQueries(
    controller.query,
    controller.submission.draft,
    !controller.transactions.active || controller.transactions.state === 'ready'
  );
  if (controller.investigationRoute.kind === 'log' && controller.query.signal === 'logs') {
    return (
      <HertzBeatTimeZoneProvider
        timeZone={
          normalizeInvestigationTimeZone(controller.query.timeZone) ?? Intl.DateTimeFormat().resolvedOptions().timeZone
        }
      >
        <OperationalPage mode="workspace">
          <ExploreFocusedLogPage
            query={controller.query}
            t={t}
            updateQuery={controller.updateQuery}
            time={controller.time}
            openPath={controller.openPath}
            savedQueries={savedQueries}
          />
        </OperationalPage>
      </HertzBeatTimeZoneProvider>
    );
  }
  return (
    <HertzBeatTimeZoneProvider
      timeZone={
        normalizeInvestigationTimeZone(controller.query.timeZone) ?? Intl.DateTimeFormat().resolvedOptions().timeZone
      }
    >
      <ExploreHistoricalWorkspace controller={controller} t={t} savedQueries={savedQueries} />
      {controller.investigationRoute.kind === 'trace' && controller.focusedQuery.signal === 'traces' && (
        <ExploreTraceDrawer controller={controller} t={t} />
      )}
    </HertzBeatTimeZoneProvider>
  );
}

function ExploreHistoricalWorkspace({
  controller,
  t,
  savedQueries
}: {
  controller: ReturnType<typeof useExplorePageController>;
  t: TFunction;
  savedQueries: SavedQueriesViewModel;
}) {
  const editor = useLogQueryBuilder(controller.submission);
  const inspectorAnalysis = useLogInspectorAnalysis(controller, editor.valid);
  const metricEditor = useWorkspaceMetricEditor(controller);
  const suggestions = useLogScopeSuggestions(controller.query, controller.result);
  const traceAnalytics = useTraceAnalytics(
    controller.query,
    controller.result,
    traceView => controller.updateQuery(traceViewPatch(controller.query, traceView)),
    controller.submission.draft
  );
  const results = (
    <ExploreWorkspaceResults
      controller={controller}
      t={t}
      traceAnalytics={traceAnalytics}
      logFilterEnabled={editor.valid}
      metricEditor={metricEditor}
      inspectorAnalysis={inspectorAnalysis}
    />
  );
  if (controller.query.signal === 'logs') {
    return (
      <ExploreLogsWorkspace {...{ controller, t, savedQueries, editor, suggestions, inspectorAnalysis, results }} />
    );
  }
  return (
    <ExploreOtherSignalsWorkspace
      {...{
        controller,
        t,
        savedQueries,
        editor,
        metricEditor,
        suggestions,
        traceAnalytics,
        inspectorAnalysis,
        results
      }}
    />
  );
}

function useWorkspaceMetricEditor(controller: ReturnType<typeof useExplorePageController>) {
  return useMetricPlanEditor(
    controller.submission,
    controller.query,
    controller.query.start && controller.query.end
      ? { from: controller.query.start, to: controller.query.end }
      : controller.time?.window
  );
}
