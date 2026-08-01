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
import { MonitorContractError, type MonitorCollector } from '../model/monitor-contract';
import { monitorCollectorPageSize, parseMonitorCollectorPage, parseMonitorParamDefines } from './monitor-editor-schema';

export async function loadMonitorParamDefines(app: string, signal?: AbortSignal) {
  const value = await apiMessageGet(`/api/apps/${encodeURIComponent(app)}/params`, signal ? { signal } : undefined);
  return parseMonitorParamDefines(value, app);
}

export async function loadMonitorCollectors(signal?: AbortSignal) {
  const collectors: MonitorCollector[] = [];
  let pageIndex = 0;
  let paginationMetadata: CollectorPaginationMetadata | undefined;
  do {
    const path = `/api/collector?pageIndex=${pageIndex}&pageSize=${monitorCollectorPageSize}`;
    const value = signal ? await apiMessageGet(path, { signal }) : await apiMessageGet(path);
    const page = parseMonitorCollectorPage(value, pageIndex);
    const pageMetadata = { totalElements: page.totalElements, totalPages: page.totalPages, size: page.size };
    // Page zero fixes the expected totals and size; later metadata drift cannot terminate the bounded scan early.
    if (paginationMetadata && !sameCollectorPaginationMetadata(paginationMetadata, pageMetadata)) {
      throw new MonitorContractError('Collector pagination metadata changed during pagination');
    }
    paginationMetadata ??= pageMetadata;
    collectors.push(...page.collectors);
    pageIndex += 1;
  } while (pageIndex < paginationMetadata.totalPages);
  requireUniqueMonitorCollectors(collectors);
  if (collectors.length !== paginationMetadata.totalElements) {
    throw new MonitorContractError('Collector inventory is incomplete');
  }
  return collectors;
}

type CollectorPaginationMetadata = { totalElements: number; totalPages: number; size: number };

function sameCollectorPaginationMetadata(left: CollectorPaginationMetadata, right: CollectorPaginationMetadata) {
  return left.totalElements === right.totalElements && left.totalPages === right.totalPages && left.size === right.size;
}

function requireUniqueMonitorCollectors(collectors: MonitorCollector[]) {
  const names = new Set(collectors.map(collector => collector.name));
  if (names.size !== collectors.length) throw new MonitorContractError('Collector identity must be unique');
}

export function detectMonitor(payload: unknown, signal?: AbortSignal) {
  // The backend owns the collection and query deadlines because monitor
  // definitions can legitimately allow longer timeouts. Keep only the
  // caller's lifecycle signal here so a cold JDBC/Arrow initialization is not
  // reported as a connection failure while navigation can still cancel work.
  return apiMessagePost('/api/monitor/detect', payload, signal ? { signal } : undefined);
}

export function saveMonitor(mode: 'new' | 'edit', payload: unknown, signal?: AbortSignal) {
  const options = signal ? { signal } : undefined;
  return mode === 'new'
    ? apiMessagePost('/api/monitor', payload, options)
    : apiMessagePut('/api/monitor', payload, options);
}
