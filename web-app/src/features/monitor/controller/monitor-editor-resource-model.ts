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

import {
  type MonitorApp,
  type MonitorCollector,
  type MonitorDetail,
  type MonitorParamDefine,
  type MonitorScrape
} from '../api/monitor-api';
import { normalizeMonitorScrape, type MonitorEditorMode } from '../api/monitor-contract';
import {
  createMonitorEditorDraft,
  MonitorParamDraftError
} from '../model/monitor-editor-model';
import { isSelectableMonitorApp } from '../model/monitor-model';

export type MonitorEditorCanonicalInput = {
  mode: MonitorEditorMode;
  id: number | undefined;
  app: string;
  apps: MonitorApp[] | undefined;
  collectors: MonitorCollector[] | undefined;
  defines: MonitorParamDefine[];
  detail: MonitorDetail | undefined;
  mainDefines: MonitorParamDefine[] | undefined;
  scrape: MonitorScrape;
  sdDefines: MonitorParamDefine[] | undefined;
};

export function selectMonitorEditorApp(
  mode: MonitorEditorMode,
  requestedApp: string,
  detail: MonitorDetail | undefined,
  apps: MonitorApp[] | undefined
) {
  if (mode === 'edit') return detail?.monitor.app ?? '';
  return apps?.some(app => app.value === requestedApp && isSelectableMonitorApp(app))
    ? requestedApp
    : '';
}

export function combineMonitorEditorDefines(
  main: MonitorParamDefine[],
  sd: MonitorParamDefine[],
  scrape: MonitorScrape
) {
  const fields = new Set<string>();
  const eligibleMain = scrape === 'static' ? main : main.filter(define => define.field !== 'host');
  return [...(scrape === 'static' ? [] : sd), ...eligibleMain]
    .filter(define => !fields.has(define.field) && fields.add(define.field));
}

export function createMonitorEditorCanonicalDraft(input: MonitorEditorCanonicalInput) {
  if (!readyForDraft(input)) return undefined;
  try {
    // Changing discovery mode keeps monitor identity but rebuilds its parameter shape.
    if (input.mode === 'edit' && input.detail
      && normalizeMonitorScrape(input.detail.monitor.scrape) !== input.scrape) {
      return createTransitionedDraft(input);
    }
    return createMonitorEditorDraft(input.detail, input.app, input.scrape, input.defines);
  } catch (error) {
    if (error instanceof MonitorParamDraftError) return error;
    throw error;
  }
}

function createTransitionedDraft(input: MonitorEditorCanonicalInput) {
  const fresh = createMonitorEditorDraft(undefined, input.app, input.scrape, input.defines);
  if (!input.detail) return fresh;
  return {
    ...fresh,
    monitor: { ...input.detail.monitor, scrape: input.scrape },
    collector: input.detail.collector ?? '',
    grafanaDashboard: input.detail.grafanaDashboard ?? fresh.grafanaDashboard
  };
}

function readyForDraft(input: MonitorEditorCanonicalInput) {
  return input.apps !== undefined
    && input.collectors !== undefined
    && Boolean(input.app)
    && input.mainDefines !== undefined
    && (input.scrape === 'static' || input.sdDefines !== undefined)
    && (input.mode === 'new' || input.id !== undefined && input.detail !== undefined);
}
