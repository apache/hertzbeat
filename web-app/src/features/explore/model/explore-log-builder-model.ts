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

import {
  parseLogFilterExpression,
  serializeLogFilterExpression,
  type LogFilterClause,
  type LogFilterOperator
} from './explore-log-filter-expression';

export type FilterScope = 'resource' | 'attribute';
export type ScopedClause = LogFilterClause & { scope: FilterScope; id: string };
export type LogQueryBuilderViewModel = {
  rows: ScopedClause[];
  valid: boolean;
  lossless: boolean;
  add: () => void;
  reset: () => void;
  update: (index: number, changes: Partial<ScopedClause>) => void;
  remove: (index: number) => void;
};
export const VALUELESS_OPERATORS = new Set<LogFilterOperator>(['EXISTS', 'NOT EXISTS']);
export function rowsFromDraft(resourceFilter: string, attributeFilter: string) {
  const resource = parseLogFilterExpression(resourceFilter);
  const attribute = parseLogFilterExpression(attributeFilter);
  if (!resource.valid || !attribute.valid) return undefined;
  return [
    ...resource.clauses.map((clause, index) => ({ ...clause, scope: 'resource' as const, id: `resource-${index}` })),
    ...attribute.clauses.map((clause, index) => ({ ...clause, scope: 'attribute' as const, id: `attribute-${index}` }))
  ];
}

export function emptyRow(): ScopedClause {
  return { scope: 'resource', field: '', operator: '=', value: '', id: crypto.randomUUID() };
}

export function serializeScope(rows: ScopedClause[], scope: FilterScope) {
  const scopedRows = rows.filter(row => row.scope === scope);
  if (!scopedRows.length) return '';
  if (scopedRows.some(row => !row.field.trim() || (!VALUELESS_OPERATORS.has(row.operator) && !row.value.trim()))) {
    return undefined;
  }
  const expression = serializeLogFilterExpression(
    scopedRows.map(row => ({ field: row.field, operator: row.operator, value: row.value }))
  );
  return expression != null && parseLogFilterExpression(expression).valid ? expression : undefined;
}
