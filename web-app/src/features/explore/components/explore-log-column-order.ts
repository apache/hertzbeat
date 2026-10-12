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
import type { LogColumn } from '../model/explore-log-columns';
import { logColumnId, validLogColumns, logColumnLabel } from '../model/explore-log-columns';
import type { LogDisplaySelection } from './explore-log-display-selection';

export function visibleColumnOrder(columns: LogColumn[], display: LogDisplaySelection | undefined) {
  return columns.filter(
    column =>
      (display?.showTime !== false || column.kind !== 'time') &&
      (display?.showContent !== false || column.kind !== 'message')
  );
}

export function isAnchor(column: LogColumn | undefined): boolean {
  return column?.kind === 'time' || column?.kind === 'message';
}

export function moveDisabled(column: LogColumn, neighbor: LogColumn | undefined) {
  return !neighbor || isAnchor(column) || isAnchor(neighbor);
}

export function columnRemoveDisabled(
  column: LogColumn,
  columns: LogColumn[],
  display: LogDisplaySelection | undefined
) {
  if (column.kind === 'time') return !display?.onShowTimeChange || display.showTime === false;
  if (column.kind === 'message') return !display?.onShowContentChange || display.showContent === false;
  return !validLogColumns(columns.filter(item => logColumnId(item) !== logColumnId(column)));
}

export function labelFor(column: LogColumn, t: TFunction, display: LogDisplaySelection | undefined) {
  return logColumnLabel(column, t, display?.standardizeHeaders);
}
