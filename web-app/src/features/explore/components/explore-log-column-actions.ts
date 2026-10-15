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

import type { TFunction } from 'i18next';
import type { LogColumn, LogColumnControls } from '../model/explore-log-columns';
import { logColumnId, logColumnLabel } from '../model/explore-log-columns';
import type { LogDisplaySelection } from './explore-log-display-selection';
import { MAX_LOG_COLUMNS } from '../model/explore-log-columns';
import { columnCalculatedExpression } from '../model/explore-log-calculated-field-expression';
import { visibleColumnOrder, isAnchor, moveDisabled, columnRemoveDisabled, labelFor } from './explore-log-column-order';
import { applyColumnAction } from './explore-log-column-mutations';

export function columnActions(
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
