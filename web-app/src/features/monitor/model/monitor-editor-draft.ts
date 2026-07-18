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

import type {
  Monitor,
  MonitorDetail,
  MonitorParam,
  MonitorParamDefine,
  MonitorScrape
} from '../api/monitor-api';
import {
  MONITOR_DISCOVERY_INSTANCE,
  MonitorParamDraftError,
  type MonitorEditorDraft,
  type MonitorParamDraft
} from './monitor-editor-model';
import { monitorParamFormValue, numberDefineRange } from './monitor-param-codec';

export function buildMonitorParams(
  defines: MonitorParamDefine[],
  existing: MonitorParam[] = []
): MonitorParamDraft[] {
  const values = new Map(existing.map(param => [param.field, param]));
  return defines.map(define => {
    const current = values.get(define.field);
    return current ? { ...current, paramValue: monitorParamFormValue(define, current.paramValue) } : {
      field: define.field,
      type: paramType(define.type),
      paramValue: defaultValue(define)
    };
  });
}

export function createMonitorEditorDraft(
  detail: MonitorDetail | undefined,
  app: string,
  scrape: MonitorScrape,
  defines: MonitorParamDefine[]
): MonitorEditorDraft {
  const supportedTypes = new Set(['text', 'number', 'host', 'password', 'boolean', 'radio', 'textarea',
    'key-value', 'array', 'metrics-field']);
  defines.forEach(define => {
    if (!supportedTypes.has(define.type)) throw new MonitorParamDraftError(define.field);
    if (define.type === 'number') numberDefineRange(define);
  });
  const existing = detail?.params ?? [];
  if (detail && existing.some(param => !defines.some(define => define.field === param.field))) {
    throw new MonitorParamDraftError(existing.find(param => !defines.some(define => define.field === param.field))!.field);
  }
  return {
    monitor: detail ? normalizeMonitorSchedule(detail.monitor) : { id: 0, app, name: '', instance: '', status: 0, type: 0,
      intervals: 60, scheduleType: 'interval', cronExpression: null, scrape },
    collector: detail?.collector ?? '',
    params: buildMonitorParams(defines, existing),
    grafanaDashboard: detail?.grafanaDashboard ?? {
      monitorId: null, folderUid: null, slug: null, status: null, uid: null, url: null, version: null,
      enabled: false, template: null
    },
    invalidParamFields: []
  };
}

export function transitionMonitorEditorDraft(
  draft: MonitorEditorDraft,
  previousDefines: MonitorParamDefine[],
  nextDefines: MonitorParamDefine[],
  scrape: MonitorScrape
): MonitorEditorDraft {
  const previous = new Map(previousDefines.map(define => [define.field, define]));
  const current = new Map(draft.params.map(param => [param.field, param]));
  const defaults = buildMonitorParams(nextDefines);
  const params = defaults.map(param => {
    const nextDefine = nextDefines.find(define => define.field === param.field)!;
    const previousDefine = previous.get(param.field);
    const existing = current.get(param.field);
    // Discovery-source credentials belong to that source and must never cross into another source draft.
    return previousDefine?.app === nextDefine.app && existing ? existing : param;
  });
  const instance = monitorInstanceForScrapeTransition(scrape);
  return { ...draft, monitor: { ...draft.monitor, scrape, instance }, params,
    invalidParamFields: draft.invalidParamFields.filter(field => nextDefines.some(define => define.field === field)) };
}

export function isMonitorParamVisible(define: MonitorParamDefine, params: MonitorParamDraft[]) {
  if (!define.depend) return true;
  const values = new Map(params.map(param => [param.field, param.paramValue]));
  return Object.entries(define.depend).every(([field, accepted]) => {
    const current = dependencyScalar(values.get(field));
    return current !== undefined && accepted.some(value => dependencyScalar(value) === current);
  });
}

export function groupMonitorParamDefines(defines: MonitorParamDefine[]) {
  return {
    basic: defines.filter(define => !define.hide),
    advanced: defines.filter(define => define.hide)
  };
}

function defaultValue(define: MonitorParamDefine) {
  if (define.type === 'boolean' && define.defaultValue === null) return false;
  return monitorParamFormValue(define, define.defaultValue);
}

function paramType(type?: string) {
  if (type === 'number') return 0;
  if (type === 'key-value') return 3;
  if (type === 'array') return 4;
  return 1;
}

function normalizeMonitorSchedule(monitor: Monitor): Monitor {
  const scheduleType = monitor.scheduleType ?? 'interval';
  const intervals = scheduleType === 'interval' ? monitor.intervals ?? 60 : monitor.intervals;
  return { ...monitor, scheduleType, ...(intervals === undefined ? {} : { intervals }) };
}

function monitorInstanceForScrapeTransition(scrape: MonitorScrape) {
  return scrape === 'static' ? '' : MONITOR_DISCOVERY_INSTANCE;
}

function dependencyScalar(value: unknown) {
  return value === null || ['string', 'number', 'boolean'].includes(typeof value) ? String(value) : undefined;
}
