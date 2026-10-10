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

import { parseQueryFormula } from '@/shared/query-context/query-formula';
import { logQuerySetCellValues } from '../model/log-query-set-cell-values';
import type { LogQuerySet } from './log-query-set';
import type { LogQuerySetResult } from './log-query-set-result';

function signature(source: LogQuerySetResult['sources'][number]) {
  return JSON.stringify(
    source.analysis.grouping?.dimensions.map(item => item.field) ??
      (source.analysis.field ? [source.analysis.field] : [])
  );
}

export function logQuerySetValues(data: LogQuerySetResult, requestedFormulas?: LogQuerySet['formulas']) {
  const visible = [...data.sources, ...data.formulas].filter(item => item.visible).map(item => item.refId);
  const signatures = new Map(data.sources.map(source => [source.refId, signature(source)]));
  const domains = [...new Set(data.sources.map(signature))];
  const groups = domains.flatMap(domain => {
    const sources = data.sources.filter(source => signature(source) === domain);
    const groupsBySource = sources.map(
      source => new Map(source.groups.map(group => [JSON.stringify(group.keys), group]))
    );
    const formulas = data.formulas
      .filter(formula => (signatures.get(formula.dependsOn[0] ?? '') ?? signature(data.sources[0]!)) === domain)
      .map(formula => ({
        refId: formula.refId,
        ast: parseQueryFormula(formula.expression).ast,
        functions: requestedFormulas?.find(item => item.refId === formula.refId)?.functions ?? []
      }));
    const groupVisible = [...sources.map(source => source.refId), ...formulas.map(formula => formula.refId)].filter(
      refId => visible.includes(refId)
    );
    return sources[0]!.groups.map(group => {
      const matched = groupsBySource.map(byKey => byKey.get(JSON.stringify(group.keys))!);
      const bucketsBySource = matched.map(item => new Map(item.buckets.map(bucket => [bucket.start, bucket.cell])));
      const groupValues = logQuerySetCellValues(
        sources,
        formulas,
        matched.map(item => item.cell),
        data.window.end - data.window.start
      );
      const buckets = group.buckets.map(bucket => ({
        start: bucket.start,
        values: logQuerySetCellValues(
          sources,
          formulas,
          bucketsBySource.map(byStart => byStart.get(bucket.start)!),
          data.intervalMs!
        )
      }));
      for (const formula of formulas) {
        if (!formula.functions.length) continue;
        let points = buckets.map(bucket => bucket.values[formula.refId] ?? null);
        for (const fn of formula.functions) points = applyFormulaFunction(points, fn, data.intervalMs);
        buckets.forEach((bucket, index) => {
          bucket.values[formula.refId] = points[index] ?? null;
        });
        const hasSeriesFunction = formula.functions.some(fn => fn.name === 'cumsum' || fn.name === 'integral');
        groupValues[formula.refId] = hasSeriesFunction
          ? (points.at(-1) ?? null)
          : applyPointFunctions(groupValues[formula.refId] ?? null, formula.functions);
      }
      return {
        keys: group.keys,
        visible: groupVisible,
        values: groupValues,
        buckets
      };
    });
  });
  return { visible, groups };
}

function applyFormulaFunction(
  points: (number | null)[],
  fn: NonNullable<LogQuerySet['formulas'][number]['functions']>[number],
  intervalMs: number | null
) {
  if (fn.name === 'cumsum' || fn.name === 'integral') {
    if (fn.name === 'integral' && intervalMs === null) return points.map(() => null);
    let total = 0;
    return points.map(value => {
      if (value === null) return null;
      total += fn.name === 'integral' ? value * (intervalMs! / 1000) : value;
      return Number.isFinite(total) ? total : null;
    });
  }
  return points.map(value => applyPointFunction(value, fn));
}

function applyPointFunctions(
  value: number | null,
  functions: NonNullable<LogQuerySet['formulas'][number]['functions']>
) {
  return functions.reduce<number | null>((current, fn) => applyPointFunction(current, fn), value);
}

function applyPointFunction(
  value: number | null,
  fn: NonNullable<LogQuerySet['formulas'][number]['functions']>[number]
) {
  if (value === null) return null;
  const result =
    fn.name === 'abs'
      ? Math.abs(value)
      : fn.name === 'log2'
        ? value > 0
          ? Math.log2(value)
          : null
        : fn.name === 'log10'
          ? value > 0
            ? Math.log10(value)
            : null
          : fn.name === 'pow'
            ? Math.pow(value, fn.exponent)
            : value;
  return result !== null && Number.isFinite(result) ? result : null;
}
