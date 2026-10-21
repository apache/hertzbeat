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

import { createElement } from 'react';
import { ArrowDownOutlined, ArrowUpOutlined } from '@ant-design/icons';
import type { LogFieldSort } from '@/shared/log-sort';
import type { CalculatedPageResponse } from '@/features/explore';
import type { TFunction } from 'i18next';
import {
  DEFAULT_LOG_COLUMNS,
  DEFAULT_TRACE_COLUMNS,
  logColumnId,
  logColumnSortField,
  type HertzBeatDashboardDocument,
  type HertzBeatLogRow,
  type HertzBeatLogTableDisplay,
  type LogColumn
} from '@/platform/perses';
import { orderHertzBeatLogRowsForPerses } from '@/platform/perses';
type Plugin = HertzBeatDashboardDocument['spec']['panels'][string]['spec']['plugin'];
export function dashboardTraceDisplay(plugin: Plugin) {
  return plugin.kind === 'TraceTable'
    ? { columns: plugin.spec.columns ?? DEFAULT_TRACE_COLUMNS, density: plugin.spec.density ?? ('compact' as const) }
    : undefined;
}
export function dashboardLogDisplay(
  plugin: Plugin,
  source: HertzBeatLogRow[],
  t: TFunction,
  sort?: 'newest' | 'oldest',
  timeZone?: string,
  logSort?: LogFieldSort,
  calculated?: CalculatedPageResponse
): HertzBeatLogTableDisplay {
  const options = plugin.kind === 'LogsTable' ? plugin.spec : {};
  const rows = orderHertzBeatLogRowsForPerses(source, calculated || logSort ? 'preserve' : sort);
  const baseColumns = options.columns ?? (calculated ? DEFAULT_LOG_COLUMNS : undefined);
  const columns: HertzBeatLogTableDisplay['columns'] = baseColumns?.map(column => ({
    id: logColumnId(column),
    ...sortedColumnHeader(column, logSort, sort, t),
    label: columnLabel(column, t),
    kind: column.kind === 'time' || column.kind === 'message' ? column.kind : 'field',
    getValue: index => rowValue(rows[index], column)
  }));
  if (calculated && columns) columns.push(...calculatedColumns(calculated));
  return {
    timeZone,
    density: options.density ?? 'compact',
    wrap: options.allowWrap ?? false,
    showTime: options.showTime ?? true,
    columns
  };
}
function calculatedColumns(calculated: CalculatedPageResponse): NonNullable<HertzBeatLogTableDisplay['columns']> {
  return calculated.executed.calculatedFields.fields
    .flatMap(field => field.outputs)
    .map(output => ({
      id: `calculated:${output.name}`,
      label: `#${output.name}`,
      kind: 'field' as const,
      getValue: (index: number) => {
        const value = calculated.result.rows[index]?.derived[output.name];
        return value == null ? undefined : String(value);
      }
    }));
}
function rowValue(row: HertzBeatLogRow | undefined, column: LogColumn): string | undefined {
  if (!row) return undefined;
  let value: unknown;
  if (column.kind === 'field') value = fieldValue(row[column.scope], column.path);
  else if (column.kind === 'service') value = row.resource?.['service.name'] ?? row.resource?.service_name;
  else if (column.kind === 'severity') value = row.severityText ?? row.severityNumber;
  else if (column.kind === 'traceId' || column.kind === 'spanId') value = row[column.kind];
  return scalarText(value);
}
function scalarText(value: unknown): string | undefined {
  return typeof value === 'string' ||
    typeof value === 'boolean' ||
    (typeof value === 'number' && Number.isFinite(value))
    ? String(value)
    : undefined;
}
function fieldValue(value: unknown, path: string[]): unknown {
  for (const part of path) {
    if (!value || typeof value !== 'object' || !Object.hasOwn(value, part)) return undefined;
    value = (value as Record<string, unknown>)[part];
  }
  return value;
}
export function dashboardTableViewParams(plugin: Plugin): Record<string, string> {
  if (plugin.kind === 'LogsTable')
    return {
      logView: JSON.stringify({
        version: 1,
        columns:
          plugin.spec.columns ??
          DEFAULT_LOG_COLUMNS.filter(column => plugin.spec.showTime !== false || column.kind !== 'time'),
        density: plugin.spec.density ?? 'compact',
        wrap: plugin.spec.allowWrap ?? false
      })
    };
  return {};
}

function sortedColumnHeader(
  column: LogColumn,
  logSort: LogFieldSort | undefined,
  sort: 'newest' | 'oldest' | undefined,
  t: TFunction
) {
  const field = logColumnSortField(column);
  const direction = logSort
    ? field === logSort.field
      ? logSort.direction
      : undefined
    : column.kind === 'time'
      ? sort === 'oldest'
        ? 'asc'
        : 'desc'
      : undefined;
  if (!direction) return {};
  const label = columnLabel(column, t);
  const meaning = logSort
    ? t(`explore.logSort.${logSort.type}${direction === 'asc' ? 'Asc' : 'Desc'}`)
    : t(`explore.logColumns.${sort ?? 'newest'}`);
  return {
    ariaSort: direction === 'asc' ? ('ascending' as const) : ('descending' as const),
    header: createElement(
      'span',
      { title: `${label} — ${meaning}` },
      label,
      ' ',
      createElement(direction === 'asc' ? ArrowUpOutlined : ArrowDownOutlined, { 'aria-hidden': true })
    )
  };
}

function columnLabel(column: LogColumn, t: TFunction) {
  return column.kind === 'field'
    ? `${column.scope}[${column.path.map(part => JSON.stringify(part)).join('][')}]`
    : t(`explore.logColumns.fields.${column.kind}`);
}
