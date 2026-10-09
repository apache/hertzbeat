/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
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
