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

import type { LogColumn, LogColumnControls } from '../model/explore-log-columns';
import { logColumnId, validLogColumns } from '../model/explore-log-columns';
import type { LogDisplaySelection } from './explore-log-display-selection';
import { visibleColumnOrder, isAnchor, moveDisabled } from './explore-log-column-order';

export function applyColumnAction(
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

export function columnReorderHandlers(
  logColumns: LogColumnControls | undefined,
  display: LogDisplaySelection | undefined
) {
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
