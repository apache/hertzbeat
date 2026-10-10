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
