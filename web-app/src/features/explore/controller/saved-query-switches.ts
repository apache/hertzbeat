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

import type { Location, NavigateFunction } from 'react-router-dom';
import { buildExplorePath, mergeExploreQuery, type ExploreQuery } from '../model/explore-model';
import { readSavedQuery, type SavedQueryRecord } from '../model/explore-saved-query-model';

type SwitchContext = {
  query: ExploreQuery;
  open: boolean;
  busy: boolean;
  editing: boolean;
  dirty: boolean;
  activeChanged: boolean;
  discard: boolean;
  navigate: NavigateFunction;
};

function preserveViewsHash(path: string, query: ExploreQuery, open: boolean) {
  return query.signal === 'logs' && open ? `${path}#saved-queries` : path;
}

export function selectSavedView(
  savedView: string | undefined,
  query: ExploreQuery,
  open: boolean,
  navigate: NavigateFunction
) {
  if (savedView === query.savedView) return;
  void navigate(preserveViewsHash(buildExplorePath(mergeExploreQuery(query, { savedView })), query, open), {
    replace: true
  });
}

export function setSavedQueriesOpen(visible: boolean, location: Location, navigate: NavigateFunction) {
  void navigate(
    { pathname: location.pathname, search: location.search, hash: visible ? '#saved-queries' : '' },
    { replace: true }
  );
}

export function switchSavedQuery(record: SavedQueryRecord, context: SwitchContext) {
  if (blocksViewSwitch(context)) return false;
  const result = readSavedQuery(record);
  if (result.kind !== 'ready') return false;
  navigateToQuery({ ...result.query, savedView: record.viewKey }, context);
  return true;
}

export function switchDefaultView(context: SwitchContext) {
  if (blocksViewSwitch(context)) return;
  navigateToQuery({ signal: context.query.signal, timeRange: 'last-15m' }, context);
}

function blocksViewSwitch({ busy, editing, dirty, activeChanged, discard }: SwitchContext) {
  return busy || ((editing || dirty || activeChanged) && !discard);
}

function navigateToQuery(query: ExploreQuery, context: SwitchContext) {
  void context.navigate(preserveViewsHash(buildExplorePath(query), context.query, context.open), {
    state: { replaceExploreQuery: true }
  });
}
