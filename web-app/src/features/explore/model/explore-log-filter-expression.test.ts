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

import { describe, expect, it } from 'vitest';

import {
  parseLogFilterExpression,
  serializeLogFilterExpression,
  type LogFilterClause
} from './explore-log-filter-expression';

describe('Explore log filter expression', () => {
  it('parses every supported backend operator without splitting quoted or list values', () => {
    const parsed = parseLogFilterExpression(
      `service.name = "checkout api" AND region IN ('us-east-1', "eu,west"), message NOT CONTAINS 'health AND ready', debug EXISTS, secret NOT EXISTS, tier != canary`
    );

    expect(parsed).toEqual({
      valid: true,
      clauses: [
        { field: 'service.name', operator: '=', value: '"checkout api"' },
        { field: 'region', operator: 'IN', value: `('us-east-1', "eu,west")` },
        { field: 'message', operator: 'NOT CONTAINS', value: `'health AND ready'` },
        { field: 'debug', operator: 'EXISTS', value: '' },
        { field: 'secret', operator: 'NOT EXISTS', value: '' },
        { field: 'tier', operator: '!=', value: 'canary' }
      ]
    });
  });

  it('serializes builder clauses into a backend-compatible expression without losing clause meaning', () => {
    const clauses: LogFilterClause[] = [
      { field: 'service.version', operator: '=', value: '"2.0 beta"' },
      { field: 'cloud.region', operator: 'NOT IN', value: "('test-1', 'test-2')" },
      { field: 'http.route', operator: 'CONTAINS', value: "'/checkout'" },
      { field: 'authorization', operator: 'NOT EXISTS', value: '' }
    ];

    const serialized = serializeLogFilterExpression(clauses);
    expect(serialized).toBe(
      `service.version = "2.0 beta" AND cloud.region NOT IN ('test-1', 'test-2') AND http.route CONTAINS '/checkout' AND authorization NOT EXISTS`
    );
    expect(parseLogFilterExpression(serialized ?? '')).toEqual({ valid: true, clauses });
    expect(serializeLogFilterExpression([])).toBeUndefined();
  });

  it('rejects expressions that cannot make a lossless round trip through Builder', () => {
    for (const expression of [
      'unsafe key=value',
      'service.name:checkout',
      'service.name LIKE checkout',
      'region IN ()',
      `region IN ('us-east-1',)`,
      `message = 'unterminated`,
      'service.name=checkout,',
      'service.name=checkout AND service.name=payments'
    ]) {
      expect(parseLogFilterExpression(expression)).toEqual({ valid: false, raw: expression });
    }
  });

  for (const operator of ['IN', 'NOT IN'] as const) {
    for (const quote of ['"', "'"]) {
      it(`preserves ${operator} list delimiters after odd and even backslashes with ${quote} quotes`, () => {
        for (const count of [1, 2, 3, 4]) {
          const slash = '\\'.repeat(count);
          const first = count % 2 === 1 ? `${quote}a${slash}${quote},inside${quote}` : `${quote}a${slash}${quote}`;
          const value = `(${first}, ${quote}second${quote})`;
          const expression = `region ${operator} ${value} AND tier = stable`;
          const clauses: LogFilterClause[] = [
            { field: 'region', operator, value },
            { field: 'tier', operator: '=', value: 'stable' }
          ];
          expect(parseLogFilterExpression(expression)).toEqual({ valid: true, clauses });
          expect(serializeLogFilterExpression(clauses)).toBe(expression);
          // An even slash run closes the quote: this comma exposes an empty list item.
          if (count % 2 === 0) {
            const raw = `region ${operator} (${first},, ${quote}second${quote})`;
            expect(parseLogFilterExpression(raw)).toEqual({ valid: false, raw });
          }
        }
      });
    }
  }

  it('treats blank expressions as an authorized unfiltered query', () => {
    expect(parseLogFilterExpression('   ')).toEqual({ valid: true, clauses: [] });
  });
});
