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

import isEqual from 'lodash/isEqual';

import { parseHertzBeatDashboardDocument, type HertzBeatDashboardDocument } from '@/platform/perses';

import {
  dashboardRevisionSchema,
  readSignalDashboard,
  SIGNAL_DASHBOARD_VERSION,
  type SignalDashboardRecord
} from './signal-dashboard-record';

export type SignalDashboardWrite = {
  dashboardKey: string;
  version: typeof SIGNAL_DASHBOARD_VERSION;
  document: HertzBeatDashboardDocument;
  revision?: number;
};

export function buildSignalDashboardWrite(value: unknown, original?: SignalDashboardRecord): SignalDashboardWrite {
  const document = parseHertzBeatDashboardDocument(value);
  const request: SignalDashboardWrite = {
    dashboardKey: document.metadata.name,
    version: SIGNAL_DASHBOARD_VERSION,
    document
  };
  if (!original) return request;
  const current = readSignalDashboard(original);
  if (original.dashboardKey !== request.dashboardKey || current.kind === 'unavailable') {
    throw new Error('Dashboard cannot be replaced with this document');
  }
  if (current.kind === 'legacy' && (!current.document || !isEqual(current.document, document))) {
    throw new Error('Legacy dashboard requires a lossless explicit conversion');
  }
  return { ...request, revision: dashboardRevisionSchema.parse(original.revision) };
}

export function matchesDashboardWrite(request: SignalDashboardWrite, response: SignalDashboardRecord): boolean {
  const result = readSignalDashboard(response);
  const revision = response.revision;
  return (
    result.kind === 'document' &&
    response.dashboardKey === request.dashboardKey &&
    typeof revision === 'number' &&
    Number.isSafeInteger(revision) &&
    revision >= 0 &&
    (request.revision == null ? revision === 0 : revision === request.revision + 1) &&
    isEqual(request.document, result.document)
  );
}
