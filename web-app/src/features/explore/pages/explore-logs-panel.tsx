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
import { useState, type ReactNode } from 'react';

import { ExploreLogsFacetRail } from '../components/explore-logs-forms';
import { ExploreLogsComparisonDrawer } from '../components/explore-logs-comparison-drawer';
import { ExploreLogsRecoveryContext } from '../components/explore-logs-recovery-context';
import { LogFacetVisibilityButton } from '../components/explore-log-facet-visibility';
import { LogFacetVisibilityContext } from '../components/explore-log-facet-visibility-context';
import { useLogFacetWorkspace } from '../controller/use-log-facet-workspace';
import type { LogSyntaxDiagnostic } from '../model/explore-log-filter-failure';
import type { useExploreQueryCommand } from '../components/use-explore-query-command';
import type { useExplorePageController } from '../controller/use-explore-page-controller';
import type { useLogInspectorAnalysis } from '../controller/use-log-inspector-analysis';
import type { useLogQueryBuilder } from '../controller/use-log-query-builder';
import type { useLogScopeSuggestions } from '../controller/use-log-scope-suggestions';
import type { useLogSearchSuggestions } from '../controller/use-log-search-suggestions';
import type { useRecentLogSearches } from '../controller/use-recent-log-searches';
import { ExploreLogTrendRegion } from './explore-log-trend-region';
import { hasLogResultHeader } from './explore-log-result-header';
import { LogsQueryAuthoring } from './explore-logs-query-authoring';
import { ExploreWorkspaceLogFacets } from './explore-workspace-log-facets';
import styles from './explore-logs-workspace.module.css';

type Props = {
  controller: ReturnType<typeof useExplorePageController>;
  t: TFunction;
  editor: ReturnType<typeof useLogQueryBuilder>;
  suggestions: ReturnType<typeof useLogScopeSuggestions>;
  inspectorAnalysis: ReturnType<typeof useLogInspectorAnalysis>;
  results: ReactNode;
  history: ReturnType<typeof useRecentLogSearches>;
  searchSuggestions: ReturnType<typeof useLogSearchSuggestions>;
  command: ReturnType<typeof useExploreQueryCommand>;
  queryActions: ReactNode;
};

export function ExploreLogsPanel(props: Props) {
  const { controller, t, results } = props;
  const { query, submission } = controller;
  const live = query.signal === 'logs' && query.live;
  const [comparisonOpen, setComparisonOpen] = useState(false);
  const [comparisonDiagnostic, setComparisonDiagnostic] = useState<LogSyntaxDiagnostic | undefined>();
  const [calculatedOpen, setCalculatedOpen] = useState(false);
  const facetVisibility = useLogFacetWorkspace();
  const openComparison = (diagnostic?: LogSyntaxDiagnostic) => {
    setComparisonDiagnostic(diagnostic);
    setComparisonOpen(true);
  };
  return (
    <ExploreLogsRecoveryContext.Provider value={{ reviewSourceB: openComparison }}>
      <LogFacetVisibilityContext.Provider value={live ? null : facetVisibility}>
        <section
          className={styles.panel}
          role="region"
          id="explore-panel-logs"
          aria-labelledby="explore-heading-logs"
          data-layout="continuous"
        >
          <LogsQueryAuthoring {...props} {...{ openComparison, calculatedOpen, setCalculatedOpen }} />
          <LogsTrendAndResults {...{ controller, t, results }} facetsVisible={facetVisibility.visible} />
          {comparisonOpen && query.signal === 'logs' && submission.draft.signal === 'logs' && (
            <ExploreLogsComparisonDrawer
              draft={submission.draft}
              updateField={submission.updateField}
              close={() => setComparisonOpen(false)}
              diagnostic={comparisonDiagnostic}
              t={t}
            />
          )}
        </section>
      </LogFacetVisibilityContext.Provider>
    </ExploreLogsRecoveryContext.Provider>
  );
}

function LogsTrendAndResults({
  controller,
  t,
  results,
  facetsVisible
}: Pick<Props, 'controller' | 't' | 'results'> & { facetsVisible: boolean }) {
  const { query, submission } = controller;
  const live = query.signal === 'logs' && query.live;
  const showFacets = !live && facetsVisible;
  return (
    <>
      <div className={styles.trendRegion} data-explore-logs-region="trend">
        <ExploreLogTrendRegion controller={controller} t={t} />
      </div>
      <div className={styles.body} data-explore-logs-region="body" data-facets-visible={showFacets}>
        {!live && (
          <ExploreLogsFacetRail
            {...{ submission, t }}
            facets={<ExploreWorkspaceLogFacets controller={controller} enabled />}
            className={styles.facetRail ?? ''}
            hidden={!showFacets}
          />
        )}
        <div className={styles.resultPane}>
          {!live && !hasLogResultHeader(controller) && (
            <div className={styles.resultFallbackTools}>
              <LogFacetVisibilityButton />
            </div>
          )}
          {results}
        </div>
      </div>
    </>
  );
}
