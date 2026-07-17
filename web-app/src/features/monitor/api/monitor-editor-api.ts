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

import { apiMessageGet, apiMessagePost, apiMessagePut } from '@/core/http/api-message';
import type { MonitorCollector, MonitorParamDefine } from './monitor-contract';
import {
  array, byte, MonitorContractError, nonemptyString, nonnegativeInteger, nullableNonnegativeInteger,
  nullablePositiveInteger, nullableString, nullableStringMap, positiveInteger, record
} from './monitor-contract-parser';

export async function loadMonitorParamDefines(app: string, signal?: AbortSignal) {
  const value = await apiMessageGet<unknown>(`/api/apps/${encodeURIComponent(app)}/params`, signal ? { signal } : undefined);
  return array(value, 'monitor param defines').map((entry, index) => parseMonitorParamDefine(entry, index, app));
}

export async function loadMonitorCollectors(signal?: AbortSignal) {
  const collectors: MonitorCollector[] = [];
  const names = new Set<string>();
  let pageIndex = 0;
  let totalPages = 1;
  do {
    if (pageIndex >= 20) throw new MonitorContractError('Collector inventory exceeds the supported safety bound');
    const path = `/api/collector?pageIndex=${pageIndex}&pageSize=200`;
    const value = signal ? await apiMessageGet<unknown>(path, { signal }) : await apiMessageGet<unknown>(path);
    const page = record(value, 'monitor collector page');
    const content = array(page.content, 'monitor collector content');
    const number = nonnegativeInteger(page.number, 'monitor collector page number');
    const size = positiveInteger(page.size, 'monitor collector page size');
    const totalElements = nonnegativeInteger(page.totalElements, 'monitor collector totalElements');
    totalPages = nonnegativeInteger(page.totalPages, 'monitor collector totalPages');
    if (number !== pageIndex || size !== 200 || totalPages !== Math.ceil(totalElements / size)
      || content.length > size || pageIndex + 1 < totalPages && content.length !== size) {
      throw new MonitorContractError('Collector page identity is inconsistent with the request');
    }
    content.forEach((entry, index) => {
      const summary = record(entry, `monitor collector summary[${index}]`);
      const collector = record(summary.collector, `monitor collector[${index}]`);
      const status = byte(collector.status, 'monitor collector status');
      if (status > 1) throw new MonitorContractError('monitor collector status must be online or offline');
      const name = nonemptyString(collector.name, 'monitor collector name');
      if (names.has(name)) throw new MonitorContractError('Collector identity must be unique');
      names.add(name);
      collectors.push({ name, online: status === 0 });
    });
    pageIndex += 1;
  } while (pageIndex < totalPages);
  return collectors;
}

export function detectMonitor(payload: unknown, signal?: AbortSignal) {
  return apiMessagePost<unknown>('/api/monitor/detect', payload,
    { signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(15_000)]) : AbortSignal.timeout(15_000) });
}

export function saveMonitor(mode: 'new' | 'edit', payload: unknown, signal?: AbortSignal) {
  const options = signal ? { signal } : undefined;
  return mode === 'new' ? apiMessagePost<unknown>('/api/monitor', payload, options)
    : apiMessagePut<unknown>('/api/monitor', payload, options);
}

function parseMonitorParamDefine(value: unknown, index: number, requestedApp: string): MonitorParamDefine {
  const item = record(value, `monitor param define[${index}]`);
  const requestApp = nonemptyString(requestedApp, 'requested monitor app');
  const app = item.app === null || item.app === undefined
    ? requestApp : nonemptyString(item.app, 'monitor param define app');
  if (app.toLowerCase() !== requestApp.toLowerCase()) {
    throw new MonitorContractError('Monitor param define app does not match request');
  }
  const name = nullableStringMap(item.name, 'monitor param define name');
  if (name === null) throw new MonitorContractError('monitor param define name must be an object');
  if (typeof item.required !== 'boolean' || typeof item.hide !== 'boolean') {
    throw new MonitorContractError('monitor param define flags must be boolean');
  }
  const options = item.options === null ? null : array(item.options, 'monitor param define options').map((entry, optionIndex) => {
    const option = record(entry, `monitor param define option[${optionIndex}]`);
    return { label: nonemptyString(option.label, 'monitor param define option label'),
      value: nonemptyString(option.value, 'monitor param define option value') };
  });
  const dependValue = item.depend === null ? null : record(item.depend, 'monitor param define depend');
  const depend = dependValue === null ? null : Object.fromEntries(Object.entries(dependValue).map(([field, entries]) => [field,
    array(entries, `monitor param define depend ${field}`).map(entry => {
      if (entry === null || ['string', 'number', 'boolean'].includes(typeof entry)) {
        return entry as string | number | boolean | null;
      }
      throw new MonitorContractError(`monitor param define depend ${field} entries must be scalar`);
    })
  ]));
  return {
    id: nullablePositiveInteger(item.id, 'monitor param define id'), app, name,
    field: nonemptyString(item.field, 'monitor param define field'),
    type: nonemptyString(item.type, 'monitor param define type'), required: item.required,
    defaultValue: nullableString(item.defaultValue, 'monitor param define defaultValue'),
    placeholder: nullableString(item.placeholder, 'monitor param define placeholder'),
    range: nullableString(item.range, 'monitor param define range'),
    limit: nullableNonnegativeInteger(item.limit, 'monitor param define limit'), options,
    keyAlias: nullableString(item.keyAlias, 'monitor param define keyAlias'),
    valueAlias: nullableString(item.valueAlias, 'monitor param define valueAlias'), depend, hide: item.hide
  };
}
