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
import type { ExploreQuery } from './explore-model';
import { calculatedCatalogQuery } from './explore-calculated-source-catalog';

it('reads the raw field catalog in the same hard scope without projecting calculated search text', () => {
  const query = {
    signal: 'logs',
    logCalculatedV2: '{"version":2}',
    query: 'service:api OR #token:GET',
    searchSyntax: 'structured-v2',
    logSort: '{"field":"calculated:token"}',
    serviceName: 'api',
    start: 120001,
    end: 240000
  } as ExploreQuery;
  expect(calculatedCatalogQuery(query)).toMatchObject({
    query: '',
    searchSyntax: 'structured-v1',
    logCalculatedV2: undefined,
    logSort: undefined,
    serviceName: 'api',
    start: 120001,
    end: 240000
  });
});
