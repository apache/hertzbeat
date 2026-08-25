/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { alertCenterUnfilteredQuery, collectAlertCenterGroups } from './alert-center-page-collection';
import type { AlertGroup, AlertPage, AlertQuery } from './alert-model';

export type AlertCenterExportRange = {
  start: string;
  end: string;
};

type AlertCenterExportPageLoader = (query: AlertQuery, signal?: AbortSignal) => Promise<AlertPage>;

export function alertCenterAllExportQuery(): AlertQuery {
  return alertCenterUnfilteredQuery();
}

/** Collects the backend's validated pages without mutating the submitted filter scope. */
export async function collectAlertCenterExportGroups(
  query: AlertQuery,
  load: AlertCenterExportPageLoader,
  signal?: AbortSignal
) {
  return collectAlertCenterGroups(query, load, signal);
}

/** Server-local timestamps are sortable in the validated YYYY-MM-DD HH:mm:ss representation. */
export function filterAlertGroupsByUpdatedRange(groups: readonly AlertGroup[], range: AlertCenterExportRange) {
  return groups.filter(
    group => group.gmtUpdate !== null && group.gmtUpdate >= range.start && group.gmtUpdate <= range.end
  );
}
