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

import { expect, it } from 'vitest';
import { dashboardQuerySchema, validQueryVariables } from './hertzbeat-dashboard-query';
const query = {
  signal: 'logs',
  queryKind: 'analysis',
  search: '${literal} $__literal',
  context: { serviceName: '${serviceName}' },
  analysis: {
    version: 1,
    representation: 'table',
    limit: 20,
    order: 'count-desc',
    minCount: 1,
    comparison: { version: 1, search: '${other} $__other' }
  },
  logGroupSelection: { version: 1, groups: [{ field: 'attribute:key', kind: 'value', value: '${exact} $__exact' }] }
};
it('treats analytical source text and exact group values as literals without substitution', () => {
  const parsed = dashboardQuerySchema.parse(query);
  expect(validQueryVariables(parsed, new Set(['serviceName']))).toBe(true);
  expect(parsed).toEqual(query);
});
it.each([
  { serviceName: '${unknown}' },
  { serviceName: 'prefix-${serviceName}' },
  { instance: '${serviceName}' },
  { serviceName: '$__literal' }
])('still rejects unresolved analytical context variables', context => {
  expect(validQueryVariables(dashboardQuerySchema.parse({ ...query, context }), new Set(['serviceName']))).toBe(false);
});
it('requires approved analytical context variables to be declared', () => {
  expect(validQueryVariables(dashboardQuerySchema.parse(query), new Set())).toBe(false);
});
it('retains existing placeholder rejection for raw log queries', () => {
  const raw = dashboardQuerySchema.parse({ signal: 'logs', queryKind: 'table', search: '${literal}' });
  expect(validQueryVariables(raw, new Set())).toBe(false);
});
