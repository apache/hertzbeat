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

import { describe, expect, it } from 'vitest';
import { DEFAULT_LOG_ANALYSIS, encodeLogAnalysis, parseLogAnalysis } from './log-analysis';
import {
  addLogFormula,
  addLogSource,
  canMigrateLogQuerySet,
  migrateLogQuerySet,
  removeLogSource,
  validLogQuerySet
} from './log-query-set';

const a = {
  refId: 'a',
  alias: 'a',
  visible: true,
  search: 'service:api',
  searchSyntax: 'structured-v1' as const,
  analysis: { limit: 20, order: 'count-desc' as const, minCount: 1 }
};
const initial = { version: 2 as const, queries: [a], formulas: [], nextSourceOrdinal: 1, nextFormulaSeq: 1 };

describe('bounded log query set', () => {
  it('persists in version 1 analysis without rewriting the old comparison contract', () => {
    const state = { ...DEFAULT_LOG_ANALYSIS, representation: 'timeseries' as const, querySet: initial };
    expect(parseLogAnalysis(encodeLogAnalysis(state)).querySet).toEqual(initial);
    expect(() => encodeLogAnalysis({ ...state, comparison: { version: 1, search: '' } })).toThrow();
  });

  it('keeps source and formula IDs monotonic after deletion', () => {
    const withB = addLogSource(initial);
    const withC = addLogSource(withB);
    const withoutB = removeLogSource(withC, 'b');
    expect(addLogSource(withoutB).queries.map(query => query.refId)).toEqual(['a', 'c', 'd']);
    expect(removeLogSource(withC, 'a').queries.map(query => query.refId)).toEqual(['b', 'c']);
    const withF1 = addLogFormula(initial);
    expect(addLogFormula({ ...withF1, formulas: [] }).formulas[0]?.refId).toBe('f2');
    expect(
      addLogSource({ ...initial, queries: [{ ...a, visible: false, timeShiftMs: 3600000 }] }).queries[1]
    ).toMatchObject({ visible: true, search: 'service:api', timeShiftMs: 3600000 });
  });

  it('clones the latest source search and analysis when adding a query', () => {
    const configured = {
      ...initial,
      queries: [
        {
          ...a,
          analysis: {
            grouping: { version: 1 as const, dimensions: [{ field: 'builtin:serviceName', limit: 5 }] },
            limit: 5,
            order: 'count-desc' as const,
            minCount: 4
          },
          timeShiftMs: 3_600_000
        }
      ]
    };
    const withB = addLogSource(configured);
    expect(withB.queries[1]).toMatchObject({
      refId: 'b',
      alias: 'b',
      visible: true,
      search: 'service:api',
      searchSyntax: 'structured-v1',
      timeShiftMs: 3_600_000,
      analysis: configured.queries[0]!.analysis
    });

    withB.queries[1]!.search = '@event.name:latest';
    withB.queries[1]!.searchSyntax = 'structured-v1';
    const withC = addLogSource(withB);
    expect(withC.queries[2]).toMatchObject({ search: '@event.name:latest', timeShiftMs: 3_600_000 });
  });

  it('rejects references to removed sources, formulas, and incompatible ordered groups', () => {
    const withB = { ...addLogSource(initial), nextFormulaSeq: 2 };
    expect(
      validLogQuerySet({ ...withB, formulas: [{ refId: 'f1', alias: 'f1', visible: true, expression: 'a+b' }] })
    ).toBe(true);
    expect(
      validLogQuerySet({
        ...initial,
        nextFormulaSeq: 2,
        formulas: [{ refId: 'f1', alias: 'f1', visible: true, expression: 'a+b' }]
      })
    ).toBe(false);
    expect(
      validLogQuerySet({ ...withB, formulas: [{ refId: 'f1', alias: 'f1', visible: true, expression: 'f1*2' }] })
    ).toBe(false);
    expect(
      validLogQuerySet({
        ...withB,
        queries: [a, { ...withB.queries[1]!, analysis: { ...a.analysis, field: 'builtin:serviceName' } }],
        formulas: [{ refId: 'f1', alias: 'f1', visible: true, expression: 'a+b' }]
      })
    ).toBe(false);
  });

  it('validates ordered formula functions and bounded power parameters', () => {
    const base = {
      ...addLogFormula(initial),
      formulas: [
        {
          refId: 'f1',
          alias: 'f1',
          visible: true,
          expression: 'a',
          functions: [{ name: 'abs' as const }, { name: 'pow' as const, exponent: 2 }]
        }
      ]
    };
    expect(validLogQuerySet(base)).toBe(true);
    expect(
      validLogQuerySet({
        ...base,
        formulas: [{ ...base.formulas[0]!, functions: [{ name: 'pow' as const, exponent: 99 }] }]
      })
    ).toBe(false);
  });

  it('enforces grouped limits and backend-compatible aliases', () => {
    expect(validLogQuerySet({ ...initial, queries: [{ ...a, alias: 'bad\nname' }] })).toBe(false);
    expect(
      validLogQuerySet({
        ...initial,
        queries: [
          {
            ...a,
            analysis: {
              ...a.analysis,
              grouping: { version: 1, dimensions: [{ field: 'builtin:serviceName', limit: 5 }] },
              limit: 20
            }
          }
        ]
      })
    ).toBe(false);
    const grouped = {
      ...DEFAULT_LOG_ANALYSIS,
      representation: 'timeseries' as const,
      grouping: { version: 1 as const, dimensions: [{ field: 'builtin:serviceName', limit: 40 }] },
      limit: 40
    };
    expect(canMigrateLogQuerySet(grouped)).toBe(false);
    expect(() => migrateLogQuerySet(grouped, '')).toThrow();
  });
});
