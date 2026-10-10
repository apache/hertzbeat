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

import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import { usePublishShellInvestigation } from '@/shared/investigation';
import type { ExactTimeWindow } from '@/shared/query-context';

import historyStyles from '../components/explore-history-result.module.css';
import { useLogView } from '../controller/use-log-view';
import { availableLogColumns } from '../model/explore-log-columns';
import { ExploreLogStatistics } from '../components/explore-log-statistics';
import { ExploreMessageResult } from '../components/explore-state-panel';
import { LogResults } from './explore-perses-log-results';
import { materializeLogInvestigation } from '../model/explore-agent-handoff';
import { createExploreLogPersesResult } from '../model/explore-perses-result-model';
import { buildExplorePath, logTrendZoomPatch, mergeExploreQuery, type LogExploreQuery } from '../model/explore-model';
import type { LogHistoryEvidence } from '../model/explore-signal-contract';
import type { ExplorePersesLogPanelProps } from '../model/explore-perses-log-panel-props';
export type { ExplorePersesLogPanelProps } from '../model/explore-perses-log-panel-props';

export function ExplorePersesLogPanel(props: ExplorePersesLogPanelProps) {
  const { data, statistics, query, openPath, timeWindow, revision, evidenceCurrent, showTrend = true } = props;
  const { t } = useTranslation();
  const availableColumns = useMemo(() => availableLogColumns(data.content), [data.content]);
  const display = useLogView(
    query,
    logView => openPath(buildExplorePath(mergeExploreQuery(query, { logView }))),
    availableColumns
  );
  const evidence = useMemo(() => currentLogEvidence(data, evidenceCurrent), [data, evidenceCurrent]);
  usePublishShellInvestigation(
    useMemo(() => materializeLogInvestigation(query, evidence, timeWindow), [evidence, query, timeWindow])
  );
  if (!timeWindow) return <ExploreMessageResult kind="error" message={t('explore.states.contractError')} />;
  const result = createExploreLogPersesResult(query, data, timeWindow, revision);
  const onTrendTimeWindowChange = evidenceCurrent
    ? (nextWindow: ExactTimeWindow) => openLogTrendZoom(query, timeWindow, nextWindow, openPath)
    : undefined;
  const statisticsView = (
    <ExploreLogStatistics
      statistics={statistics}
      timeWindow={timeWindow}
      runtimeIdentity={result.runtimeIdentity}
      onTimeWindowChange={onTrendTimeWindowChange}
      t={t}
    />
  );
  return (
    <>
      {showTrend && display.preferences.showTimeline !== false && (
        <section className={historyStyles.logRegion} data-explore-log-region="trend">
          {statisticsView}
        </section>
      )}
      <section className={historyStyles.logRegion} data-explore-log-region="result">
        <LogResults
          {...props}
          timeWindow={timeWindow}
          result={result}
          display={display}
          availableColumns={availableColumns}
        />
      </section>
    </>
  );
}

function openLogTrendZoom(
  query: LogExploreQuery,
  evidenceWindow: ExactTimeWindow,
  requestedWindow: ExactTimeWindow,
  openPath: (path: string) => void
) {
  const patch = logTrendZoomPatch(query, evidenceWindow, requestedWindow);
  if (patch) openPath(buildExplorePath(mergeExploreQuery(query, patch)));
}

function currentLogEvidence(data: LogHistoryEvidence['page'], current: boolean) {
  return current
    ? { totalElements: data.totalElements, number: data.number, size: data.size, contentCount: data.content.length }
    : undefined;
}
