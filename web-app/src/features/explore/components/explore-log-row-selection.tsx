/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import { logArrival } from '@/shared/log-arrival';
import type { TFunction } from 'i18next';
import { resolveLogRowHeight } from '@/platform/perses';
import { logSeverityLabel } from '@/shared/log-severity';
import { appliedLogColumnSort, type LogSortControls } from '../model/explore-log-order';
import {
  MAX_LOG_COLUMNS,
  availableLogColumns,
  logColumnId,
  logColumnLabel,
  logColumnValue,
  validLogColumns,
  type LogColumn,
  type LogColumnControls
} from '../model/explore-log-columns';
import type { CalculatedPageResponse, LogRow } from '../model/explore-signal-contract';
import type { LogExploreQuery } from '../model/explore-model';
import { logBody, logServiceName, logTimestampMs } from '../model/explore-signal-model';
import { ExploreLogOrderHeader } from './explore-log-order';
import { calculatedLogColumns } from './explore-calculated-log-columns';
import type { HertzBeatLogColumn } from '@/platform/perses';
import { columnCalculatedExpression } from '../model/explore-log-calculated-field-expression';

type LogDisplaySelection = {
  showTime?: boolean | undefined;
  standardizeHeaders?: boolean | undefined;
  rowHeight?: 'small' | 'medium' | 'large' | undefined;
  density?: 'compact' | 'comfortable' | undefined;
  wrap?: boolean | undefined;
  contentDisplay?: 'message' | 'attributes' | 'stack' | undefined;
  showContent?: boolean | undefined;
  onShowTimeChange?: ((show: boolean) => void) | undefined;
  onShowContentChange?: ((show: boolean) => void) | undefined;
};

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

function columnActions(
  column: LogColumn,
  index: number,
  columns: LogColumn[],
  available: LogColumn[],
  controls: LogColumnControls,
  t: TFunction,
  display: LogDisplaySelection | undefined,
  onCalculateField: ((expression: string) => void) | undefined
) {
  const options = columnActionOptions(columns, available, column, t, display);
  const visibleColumns = visibleColumnOrder(columns, display);
  const visibleIndex = visibleColumns.findIndex(item => logColumnId(item) === logColumnId(column));
  const insertDisabled = columns.length >= MAX_LOG_COLUMNS || !options.insert.length;
  const moveLeftDisabled = moveDisabled(column, visibleColumns[visibleIndex - 1]);
  const moveRightDisabled = moveDisabled(column, visibleColumns[visibleIndex + 1]);
  return {
    menuLabel: t('explore.logColumns.actions'),
    calculateField: t('explore.logFieldMenu.calculateField'),
    showCalculate: Boolean(onCalculateField && columnCalculatedExpression(column)),
    moveLeft: t('explore.logColumns.moveLeft', { field: labelFor(column, t, display) }),
    moveRight: t('explore.logColumns.moveRight', { field: labelFor(column, t, display) }),
    showMove: column.kind !== 'time' && column.kind !== 'message',
    insertLeft: t('explore.logColumns.insertLeft'),
    insertRight: t('explore.logColumns.insertRight'),
    replace: t('explore.logColumns.replace'),
    remove: t('explore.logColumns.remove', { field: labelFor(column, t, display) }),
    insertLeftDisabled: !insertDisabled && column.kind !== 'time' ? false : true,
    insertRightDisabled: !insertDisabled && column.kind !== 'message' ? false : true,
    moveLeftDisabled,
    moveRightDisabled,
    replaceDisabled: isAnchor(column) || !options.replace.length,
    removeDisabled: columnRemoveDisabled(column, columns, display),
    insertOptions: insertDisabled ? [] : options.insert,
    replaceOptions: options.replace,
    onAction: (key: string) => {
      const expression = columnCalculatedExpression(column);
      if (key === 'calculate-field' && expression) onCalculateField?.(expression);
      else applyColumnAction(key, column, index, available, controls, display);
    }
  };
}

function columnActionOptions(
  columns: LogColumn[],
  available: LogColumn[],
  current: LogColumn,
  t: TFunction,
  display: LogDisplaySelection | undefined
) {
  const selected = new Set(columns.map(logColumnId));
  const label = (column: LogColumn) => ({
    id: logColumnId(column),
    label: logColumnLabel(column, t, display?.standardizeHeaders)
  });
  return {
    insert: available.filter(column => !selected.has(logColumnId(column))).map(label),
    replace: available
      .filter(column => logColumnId(column) !== logColumnId(current) && !selected.has(logColumnId(column)))
      .map(label)
  };
}

function visibleColumnOrder(columns: LogColumn[], display: LogDisplaySelection | undefined) {
  return columns.filter(
    column =>
      (display?.showTime !== false || column.kind !== 'time') &&
      (display?.showContent !== false || column.kind !== 'message')
  );
}

function isAnchor(column: LogColumn | undefined): boolean {
  return column?.kind === 'time' || column?.kind === 'message';
}

function moveDisabled(column: LogColumn, neighbor: LogColumn | undefined) {
  return !neighbor || isAnchor(column) || isAnchor(neighbor);
}

function columnRemoveDisabled(column: LogColumn, columns: LogColumn[], display: LogDisplaySelection | undefined) {
  if (column.kind === 'time') return !display?.onShowTimeChange || display.showTime === false;
  if (column.kind === 'message') return !display?.onShowContentChange || display.showContent === false;
  return !validLogColumns(columns.filter(item => logColumnId(item) !== logColumnId(column)));
}

function labelFor(column: LogColumn, t: TFunction, display: LogDisplaySelection | undefined) {
  return logColumnLabel(column, t, display?.standardizeHeaders);
}

function applyColumnAction(
  key: string,
  column: LogColumn,
  index: number,
  available: LogColumn[],
  controls: LogColumnControls,
  display: LogDisplaySelection | undefined
) {
  if (key === 'move-left' || key === 'move-right') {
    moveColumnAction(key === 'move-left' ? -1 : 1, column, controls, display);
    return;
  }
  if (key === 'remove') {
    removeColumnAction(column, controls, display);
    return;
  }
  applyCandidateAction(key, index, available, controls);
}

function moveColumnAction(
  direction: -1 | 1,
  column: LogColumn,
  controls: LogColumnControls,
  display: LogDisplaySelection | undefined
) {
  const visible = visibleColumnOrder(controls.columns, display);
  const index = visible.findIndex(item => logColumnId(item) === logColumnId(column));
  const neighbor = visible[index + direction];
  if (index < 0 || moveDisabled(column, neighbor)) return;
  const from = controls.columns.findIndex(item => logColumnId(item) === logColumnId(column));
  const to = controls.columns.findIndex(item => logColumnId(item) === logColumnId(neighbor!));
  const next = [...controls.columns];
  [next[from], next[to]] = [next[to]!, next[from]!];
  controls.onColumnsChange(next);
}

function removeColumnAction(column: LogColumn, controls: LogColumnControls, display: LogDisplaySelection | undefined) {
  if (column.kind === 'time') return display?.onShowTimeChange?.(false);
  if (column.kind === 'message') return display?.onShowContentChange?.(false);
  const next = controls.columns.filter(item => logColumnId(item) !== logColumnId(column));
  if (validLogColumns(next)) controls.onColumnsChange(next);
}

function applyCandidateAction(key: string, index: number, available: LogColumn[], controls: LogColumnControls) {
  const separator = key.indexOf(':');
  if (separator < 0) return;
  const action = key.slice(0, separator);
  const option = available.find(item => logColumnId(item) === key.slice(separator + 1));
  if (!option) return;
  const next = [...controls.columns];
  if (action === 'replace') next[index] = option;
  else if (action === 'insert-left') next.splice(index, 0, option);
  else if (action === 'insert-right') next.splice(index + 1, 0, option);
  else return;
  if (validLogColumns(next)) controls.onColumnsChange(next);
}

function columnReorderHandlers(logColumns: LogColumnControls | undefined, display: LogDisplaySelection | undefined) {
  if (!logColumns) return { onColumnMove: undefined, onColumnDrop: undefined };
  return {
    onColumnMove: (columnId: string, direction: 'left' | 'right') => {
      const column = logColumns.columns.find(item => logColumnId(item) === columnId);
      if (!column) return;
      const visible = visibleColumnOrder(logColumns.columns, display);
      const index = visible.findIndex(item => logColumnId(item) === columnId);
      const neighbor = visible[index + (direction === 'left' ? -1 : 1)];
      if (moveDisabled(column, neighbor)) return;
      const next = [...logColumns.columns];
      const from = next.findIndex(item => logColumnId(item) === columnId);
      const to = next.findIndex(item => logColumnId(item) === logColumnId(neighbor!));
      [next[from], next[to]] = [next[to]!, next[from]!];
      logColumns.onColumnsChange(next);
    },
    onColumnDrop: (sourceId: string, targetId: string, after: boolean) => {
      const sourceIndex = logColumns.columns.findIndex(column => logColumnId(column) === sourceId);
      const targetIndex = logColumns.columns.findIndex(column => logColumnId(column) === targetId);
      if (sourceIndex === targetIndex) return;
      const source = logColumns.columns[sourceIndex];
      const target = logColumns.columns[targetIndex];
      const visible = visibleColumnOrder(logColumns.columns, display);
      const visibleSourceIndex = visible.findIndex(item => logColumnId(item) === sourceId);
      const visibleTargetIndex = visible.findIndex(item => logColumnId(item) === targetId);
      if (!source || !target || isAnchor(source) || isAnchor(target)) return;
      if (visibleSourceIndex < 0 || visibleTargetIndex < 0) return;
      const low = Math.min(visibleSourceIndex, visibleTargetIndex);
      const high = Math.max(visibleSourceIndex, visibleTargetIndex);
      if (visible.slice(low, high + 1).some(isAnchor)) return;
      const next = [...logColumns.columns];
      next.splice(sourceIndex, 1);
      const insertion = targetIndex - Number(sourceIndex < targetIndex) + Number(after);
      next.splice(insertion, 0, source);
      logColumns.onColumnsChange(next);
    }
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
