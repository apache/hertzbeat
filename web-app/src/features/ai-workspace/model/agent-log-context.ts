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

import {
  readOptionalText,
  readOptionalInteger,
  readInteger,
  readBoolean,
  optionalPresent,
  setInteger,
  setText,
  assign
} from './agent-context-fields';
import type { AgentLogRef, AgentLogSourceTarget } from './agent-workspace-contract';

export const logTargetQueryKeys = new Set([
  'source',
  'start',
  'end',
  'traceId',
  'spanId',
  'severityNumber',
  'severityText',
  'search',
  'serviceName',
  'serviceNamespace',
  'environment',
  'resourceFilter',
  'attributeFilter',
  'hideInternal',
  'hideNoise',
  'pageIndex',
  'pageSize',
  'returnTo'
]);

const maximumWindowMs = 7 * 24 * 60 * 60_000;
const safeId = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/u;
const severities = new Set(['TRACE', 'DEBUG', 'INFO', 'WARN', 'ERROR', 'FATAL']);

export function appendLogTargetParams(params: URLSearchParams, target: AgentLogSourceTarget) {
  const log = target.log;
  params.set('source', 'log');
  setInteger(params, 'start', log.start);
  setInteger(params, 'end', log.end);
  setText(params, 'traceId', log.traceId);
  setText(params, 'spanId', log.spanId);
  setInteger(params, 'severityNumber', log.severityNumber);
  setText(params, 'severityText', log.severityText);
  setText(params, 'search', log.search);
  setText(params, 'serviceName', log.serviceName);
  setText(params, 'serviceNamespace', log.serviceNamespace);
  setText(params, 'environment', log.environment);
  setText(params, 'resourceFilter', log.resourceFilter);
  setText(params, 'attributeFilter', log.attributeFilter);
  params.set('hideInternal', String(log.hideInternal));
  params.set('hideNoise', String(log.hideNoise));
  setInteger(params, 'pageIndex', log.pageIndex);
  setInteger(params, 'pageSize', log.pageSize);
}

export function explicitLogTarget(params: URLSearchParams): AgentLogSourceTarget | undefined {
  if (params.get('source') !== 'log' || !hasOnlyLogKeys(params)) return undefined;
  const start = readInteger(params, 'start', 1, Number.MAX_SAFE_INTEGER);
  const end = readInteger(params, 'end', 1, Number.MAX_SAFE_INTEGER);
  const hideInternal = readBoolean(params, 'hideInternal');
  const hideNoise = readBoolean(params, 'hideNoise');
  const pageIndex = readInteger(params, 'pageIndex', 0, 10_000);
  const pageSize = readInteger(params, 'pageSize', 1, 100);
  if (
    start === undefined ||
    end === undefined ||
    start >= end ||
    end - start > maximumWindowMs ||
    hideInternal === undefined ||
    hideNoise === undefined ||
    pageIndex === undefined ||
    pageSize === undefined
  )
    return undefined;
  const log: AgentLogRef = { start, end, hideInternal, hideNoise, pageIndex, pageSize };
  if (!appendOptionalLogScope(params, log)) return undefined;
  return { log };
}

function appendOptionalLogScope(params: URLSearchParams, log: AgentLogRef) {
  for (const key of ['traceId', 'spanId'] as const) {
    const value = readOptionalId(params, key);
    if (!optionalPresent(params, key, value)) return false;
    assign(log, key, value);
  }
  const severityNumber = readOptionalInteger(params, 'severityNumber', 1, 24);
  if (!optionalPresent(params, 'severityNumber', severityNumber)) return false;
  assign(log, 'severityNumber', severityNumber);
  const severityText = readOptionalSeverity(params);
  if (!optionalPresent(params, 'severityText', severityText)) return false;
  assign(log, 'severityText', severityText);
  for (const [key, maximum] of [
    ['search', 256],
    ['serviceName', 512],
    ['serviceNamespace', 512],
    ['environment', 512],
    ['resourceFilter', 2_048],
    ['attributeFilter', 2_048]
  ] as const) {
    const value = readOptionalText(params, key, maximum);
    if (!optionalPresent(params, key, value)) return false;
    assign(log, key, value);
  }
  return true;
}

function readOptionalSeverity(params: URLSearchParams) {
  if (!params.has('severityText')) return undefined;
  const value = params.get('severityText');
  return value && severities.has(value) ? (value as AgentLogRef['severityText']) : undefined;
}

function readOptionalId(params: URLSearchParams, key: string) {
  if (!params.has(key)) return undefined;
  const value = params.get(key);
  return value && safeId.test(value) ? value : undefined;
}

function hasOnlyLogKeys(params: URLSearchParams) {
  return [...params.keys()].every(key => logTargetQueryKeys.has(key) && params.getAll(key).length === 1);
}
