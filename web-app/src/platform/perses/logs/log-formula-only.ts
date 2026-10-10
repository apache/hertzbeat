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

import type { LogAnalysisResult } from './log-analysis';
import { normalizeLogBucketValue } from './log-throughput';
import { evaluateQueryFormula, parseQueryFormula } from '@/shared/query-context/query-formula';

export function formulaOnlyValues(data: LogAnalysisResult, formula: string) {
  const ast = parseQueryFormula(formula).ast;
  const evaluate = (value: number | null) => evaluateQueryFormula(ast, { a: value });
  const durationMs = data.window.end - data.window.start;
  return {
    truncated: data.truncated,
    groups: data.groups.map(group => {
      const a = normalizeLogBucketValue(
        data.measure ? (group.measurement?.value ?? null) : group.count,
        durationMs,
        data.transform
      );
      return {
        group,
        a,
        value: evaluate(a),
        buckets: group.buckets.map(bucket => ({
          start: bucket.start,
          value: evaluate(
            normalizeLogBucketValue(
              data.measure ? (bucket.measurement?.value ?? null) : bucket.count,
              data.intervalMs!,
              data.transform
            )
          )
        }))
      };
    })
  };
}
