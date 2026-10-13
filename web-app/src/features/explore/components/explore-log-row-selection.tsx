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

import { logArrival } from '@/shared/log-arrival';
import type { TFunction } from 'i18next';
import { resolveLogRowHeight } from '@/platform/perses';
import { logSeverityLabel } from '@/shared/log-severity';
import { appliedLogColumnSort, type LogSortControls } from '../model/explore-log-order';
import {
  availableLogColumns,
  logColumnId,
  logColumnLabel,
  logColumnValue,
  type LogColumn,
  type LogColumnControls
} from '../model/explore-log-columns';
import type { CalculatedPageResponse, LogRow } from '../model/explore-signal-contract';
import type { LogExploreQuery } from '../model/explore-model';
import { logBody, logServiceName, logTimestampMs } from '../model/explore-signal-model';
import { ExploreLogOrderHeader } from './explore-log-order';
import { calculatedLogColumns } from './explore-calculated-log-columns';
import type { HertzBeatLogColumn } from '@/platform/perses';
import type { LogDisplaySelection } from './explore-log-display-selection';
import { columnActions } from './explore-log-column-actions';
import { columnReorderHandlers } from './explore-log-column-mutations';

export function logRowSelection(
  rows: LogRow[],
  query: LogExploreQuery,
  display: LogDisplaySelection | undefined,
  selectedIndex: number | undefined,
  controlsId: string,
  onSelect: (index: number) => void,
  t: TFunction,
  logColumns?: LogColumnControls,
  logOrder?: LogSortControls,
  calculated?: CalculatedPageResponse,
  onCalculateField?: (expression: string) => void
) {
  return {
    timeZone: query.timeZone,
    columns: [
      ...mappedColumns(logColumns, rows, query, t, logOrder, display, onCalculateField),
      ...calculatedLogColumns(rows, calculated, query, logOrder, t)
    ],
    ariaLabel: tableLabel(query, t),
    controlsId,
    columnLabels: columnLabels(t),
    showTime: display?.showTime,
    rowHeight: resolveLogRowHeight(display),
    contentDisplay: display?.contentDisplay,
    showContent: display?.showContent ?? true,
    standardizeHeaders: display?.standardizeHeaders ?? true,
    selectedIndex,
    getArrival: query.live ? (index: number) => logArrival(rows[index]) : undefined,
    getAriaLabel: (index: number) => logAriaLabel(rows, index, query, t),
    getSeverityLabel: (index: number) => severityLabel(rows, index),
    getServiceLabel: (index: number) => serviceLabel(rows, index),
    messageSearch: query.query,
    ...columnReorderHandlers(logColumns, display),
    reorderHint: t('explore.logColumns.reorderHint'),
    onSelect
  };
}

function tableLabel(query: LogExploreQuery, t: TFunction) {
  return t(query.live ? 'explore.liveFlow.logsTable' : 'explore.perses.logsTable');
}

function mappedColumns(
  controls: LogColumnControls | undefined,
  rows: LogRow[],
  query: LogExploreQuery,
  t: TFunction,
  order: LogSortControls | undefined,
  display: LogDisplaySelection | undefined,
  onCalculateField: ((expression: string) => void) | undefined
): HertzBeatLogColumn[] {
  const available = availableLogColumns(rows);
  return (controls?.columns ?? []).map((column, index, columns) =>
    mappedLogColumn(column, index, columns, available, controls, rows, query, t, order, display, onCalculateField)
  );
}

function columnLabels(t: TFunction) {
  return {
    time: t('explore.time'),
    severity: t('explore.severity'),
    service: t('explore.service'),
    message: t('explore.message')
  };
}

function logAriaLabel(rows: LogRow[], index: number, query: LogExploreQuery, t: TFunction) {
  const row = rows[index];
  return row ? logInteractionLabel(row, t) : t(query.live ? 'explore.liveFlow.logsTable' : 'explore.perses.logsTable');
}

function severityLabel(rows: LogRow[], index: number) {
  const row = rows[index];
  return row ? logSeverityLabel(row) : undefined;
}

function serviceLabel(rows: LogRow[], index: number) {
  const row = rows[index];
  return row ? logServiceName(row) : undefined;
}

function mappedLogColumn(
  column: LogColumn,
  index: number,
  columns: LogColumn[],
  available: LogColumn[],
  controls: LogColumnControls | undefined,
  rows: LogRow[],
  query: LogExploreQuery,
  t: TFunction,
  logOrder: LogSortControls | undefined,
  display: LogDisplaySelection | undefined,
  onCalculateField: ((expression: string) => void) | undefined
): HertzBeatLogColumn {
  const label = logColumnLabel(column, t, display?.standardizeHeaders ?? true);
  const actions = controls
    ? columnActions(column, index, columns, available, controls, t, display, onCalculateField)
    : undefined;
  return {
    id: logColumnId(column),
    label,
    reorderable: column.kind !== 'time' && column.kind !== 'message',
    actions,
    ariaSort: appliedLogColumnSort(column, query),
    header: (
      <ExploreLogOrderHeader
        column={column}
        controls={logOrder}
        t={t}
        live={Boolean(query.live)}
        direction={appliedLogColumnSort(column, query)}
        labelOverride={label}
      />
    ),
    kind: column.kind === 'traceId' || column.kind === 'spanId' ? 'field' : column.kind,
    getValue: (index: number) => (rows[index] ? logColumnValue(rows[index], column) : undefined)
  };
}

function logInteractionLabel(row: LogRow, t: TFunction) {
  const timestamp = logTimestampMs(row);
  const time = timestamp ? new Date(timestamp).toLocaleString() : t('explore.perses.notRecorded');
  return `${time} · ${logSeverityLabel(row) ?? '—'} · ${boundedInteractionSummary(logBody(row) ?? t('explore.perses.notRecorded'))}`;
}

function boundedInteractionSummary(value: string) {
  const normalized = value.replace(/\s+/gu, ' ').trim();
  return normalized.length <= 80 ? normalized : `${normalized.slice(0, 79)}…`;
}
