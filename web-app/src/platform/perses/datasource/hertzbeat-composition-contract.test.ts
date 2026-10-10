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
import { hertzBeatQuerySchema } from './hertzbeat-query-contract';
const query = {
  signal: 'metrics',
  queryKind: 'composition',
  timeWindow: { from: 1000, to: 2000 },
  plan: {
    version: 1,
    queries: [
      { refId: 'a', metric: 'requests_total' },
      { refId: 'b', metric: 'errors_total' }
    ],
    formulas: [{ id: 'f1', expression: 'b / a' }]
  }
};
describe('controlled metric composition document', () => {
  it('accepts a typed bounded plan without reducing it to its first source', () => {
    expect(hertzBeatQuerySchema.parse(query)).toEqual(query);
  });
  it.each([
    { formulas: [{ id: 'f1', expression: 'missing(a)' }] },
    { formulas: [{ id: 'f1', expression: 'a / c' }] },
    {
      queries: [
        { refId: 'a', metric: 'requests_total' },
        { refId: 'a', metric: 'errors_total' }
      ]
    },
    { queries: [{ refId: 'a', metric: 'select * from metrics' }] }
  ])('rejects invalid plans before any request %j', changes => {
    expect(hertzBeatQuerySchema.safeParse({ ...query, plan: { ...query.plan, ...changes } }).success).toBe(false);
  });
});
