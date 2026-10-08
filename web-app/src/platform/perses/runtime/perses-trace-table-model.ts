import type { HertzBeatTraceDisplay } from './perses-trace-display';
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

import type { TraceTableServerPagination } from '@perses-dev/trace-table-plugin';
import type { TraceTableColumnOverrides, TraceTableRow } from '@perses-dev/trace-table-plugin';
import type { TFunction } from 'i18next';
import type { TraceEvidence } from '@/shared/trace-evidence';

export type TraceTableHost = {
  display?: HertzBeatTraceDisplay | undefined;
  rows: TraceEvidence[];
  serverPagination?: TraceTableServerPagination | undefined;
  links?: Readonly<Record<string, string>> | undefined;
  unavailableLinks?: Readonly<Record<string, string>> | undefined;
  onNavigate?: ((path: string) => void) | undefined;
};

export function traceName(row: TraceEvidence, t: TFunction) {
  const span =
    row.rootState === 'unique' ? { serviceName: row.serviceName, spanName: row.rootSpanName } : row.representativeSpan;
  return [span.serviceName, span.spanName].filter(Boolean).join(': ') || t('explore.perses.traceTable.unnamedSpan');
}

export function traceDuration(value: number | null) {
  if (value == null) return '—';
  if (value === 0) return '0 ms';
  if (value < 1) return '<1 ms';
  return new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }).format(value) + ' ms';
}

type ComparatorFactory = NonNullable<NonNullable<TraceTableColumnOverrides['durationMs']>['getSortComparator']>;

export const nullLastTraceDuration: ComparatorFactory = direction => (a: unknown, b: unknown, aCell, bCell) => {
  if (a == null || b == null)
    return a == null ? (b == null ? String(aCell.id).localeCompare(String(bCell.id)) : 1) : -1;
  const comparison = Number(a) - Number(b);
  return comparison ? comparison * (direction === 'desc' ? -1 : 1) : String(aCell.id).localeCompare(String(bCell.id));
};

export function traceLookup(rows: TraceEvidence[]) {
  return new Map(rows.map(row => [row.traceId, row]));
}

export function requireTraceRow(rows: ReadonlyMap<string, TraceEvidence>, row: TraceTableRow) {
  const evidence = rows.get(row.traceId);
  if (!evidence) throw new Error('Trace table evidence no longer matches its row');
  return evidence;
}
