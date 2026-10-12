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
import { DEFAULT_LOG_ANALYSIS } from './log-analysis';
import { logQuerySetRequest } from './log-query-set-client';

it('keeps source searches independent and sends no top-level search or legacy analysis controls', () => {
  const querySet = {
    version: 2 as const,
    queries: [
      {
        refId: 'a',
        alias: 'a',
        visible: true,
        search: 'service:api',
        searchSyntax: 'structured-v1' as const,
        analysis: { limit: 20, order: 'count-desc' as const, minCount: 1 }
      },
      {
        refId: 'b',
        alias: 'b',
        visible: false,
        search: 'service:worker',
        searchSyntax: 'structured-v1' as const,
        analysis: { limit: 20, order: 'count-desc' as const, minCount: 1 }
      }
    ],
    formulas: [{ refId: 'f1', alias: 'f1', visible: true, expression: 'a+b', functions: [{ name: 'abs' as const }] }],
    nextSourceOrdinal: 2,
    nextFormulaSeq: 2
  };
  const request = logQuerySetRequest(
    new URLSearchParams(
      'start=1000&end=2000&serviceName=shared&search=service%3Awrong&searchSyntax=structured-v1&logSort=desc'
    ),
    { from: 1000, to: 2000 },
    { ...DEFAULT_LOG_ANALYSIS, representation: 'timeseries', querySet }
  );
  expect(request).toMatchObject({ version: 2, queries: querySet.queries });
  expect(request.formulas).toEqual([{ refId: 'f1', alias: 'f1', visible: true, expression: 'a+b' }]);
  expect(request.parameters).toMatchObject({ serviceName: 'shared', view: 'timeseries' });
  expect(request.parameters).not.toHaveProperty('search');
  expect(request.parameters).not.toHaveProperty('searchSyntax');
  expect(request.parameters).not.toHaveProperty('logSort');
  expect(request.queries[0]?.search).toBe('service:api');
  expect(request.queries[1]?.search).toBe('service:worker');
});
