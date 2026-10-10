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

import { normalizeLogBucketValue } from './log-throughput';
import { evaluateQueryFormula, parseQueryFormula } from '@/shared/query-context/query-formula';
import type { LogComparisonGroup, LogComparisonResult } from './log-comparison-result';
export type ComparisonSource = 'a' | 'b' | 'formula';
export function comparisonValues(data: LogComparisonResult, buckets = false) {
  const ast = data.formula ? parseQueryFormula(data.formula).ast : undefined;
  return (pair: Pick<LogComparisonGroup, 'a' | 'b'>, source: ComparisonSource): number | null => {
    const value = (id: 'a' | 'b') => {
      const raw = data.analysis.measure ? pair[id].measurement!.value : pair[id].count;
      return buckets ? normalizeLogBucketValue(raw, data.intervalMs!, data.analysis.transform) : raw;
    };
    return source === 'formula'
      ? ast
        ? evaluateQueryFormula(ast, { a: value('a'), b: value('b') })
        : null
      : value(source);
  };
}
