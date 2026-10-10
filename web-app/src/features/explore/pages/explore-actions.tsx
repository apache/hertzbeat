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

import type { useExplorePageController } from '../controller/use-explore-page-controller';
import type { SavedQueriesViewModel } from '../model/explore-saved-query-view-model';
import { ExploreSavedQueryActions } from '../components/explore-saved-query-actions';
import { ExploreDashboardAction } from '../components/explore-dashboard-action';
import { ExploreShareAction } from '../components/explore-share-action';
export function ExploreActions({
  controller,
  savedQueries
}: {
  controller: ReturnType<typeof useExplorePageController>;
  savedQueries: SavedQueriesViewModel;
}) {
  const { query, result } = controller;
  const evidence = 'evidence' in result ? result.evidence : result;
  const timeWindow = controller.transactions?.active
    ? controller.transactions.window
    : query.start != null && query.end != null
      ? { from: query.start, to: query.end }
      : 'window' in evidence
        ? evidence.window
        : undefined;
  const utilities = (
    <>
      <ExploreShareAction
        query={query}
        timeWindow={timeWindow}
        timeZone={query.timeZone ?? Intl.DateTimeFormat().resolvedOptions().timeZone}
        dirty={savedQueries.dirty}
      />
      <ExploreDashboardAction
        query={query}
        timeWindow={timeWindow}
        timeZone={query.timeZone ?? Intl.DateTimeFormat().resolvedOptions().timeZone}
        canWrite={savedQueries.canWrite}
        dirty={savedQueries.dirty}
        blocked={savedQueries.saveBlocked || savedQueries.busy}
      />
    </>
  );
  if (query.signal === 'logs') return null;
  return (
    <ExploreSavedQueryActions model={savedQueries} compact>
      {utilities}
    </ExploreSavedQueryActions>
  );
}
