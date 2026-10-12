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

import { evaluateQueryFormula, type QueryFormulaNode } from '@/shared/query-context/query-formula';
import type { LogQuerySetCell, LogQuerySetResult } from '../logs/log-query-set-result';
import { normalizeLogBucketValue } from '../logs/log-throughput';

/** Calculates aligned cells; callers own grouping and result validation. */
export function logQuerySetCellValues(
  sources: LogQuerySetResult['sources'],
  formulas: { refId: string; ast: QueryFormulaNode }[],
  cells: LogQuerySetCell[],
  duration: number
) {
  const sourceValues = Object.fromEntries(
    sources.map((source, index) => {
      const cell = cells[index]!;
      return [
        source.refId,
        normalizeLogBucketValue(
          source.analysis.measure ? (cell.measurement?.value ?? null) : cell.count,
          duration,
          source.analysis.transform
        )
      ];
    })
  ) as Record<string, number | null>;
  return Object.assign(
    sourceValues,
    Object.fromEntries(formulas.map(formula => [formula.refId, evaluateQueryFormula(formula.ast, sourceValues)]))
  );
}
