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

import { readDeploymentRoute, writeDeploymentRoute } from './deployment-route';

describe('deployment route state', () => {
  it('round-trips only a safe non-secret operation identity', () => {
    const route = readDeploymentRoute(new URLSearchParams('operationId=migration-01_A.b'));

    expect(route).toEqual({ operationId: 'migration-01_A.b', invalid: false });
    expect(writeDeploymentRoute(route.operationId).toString()).toBe('operationId=migration-01_A.b');
  });

  it.each([
    'operationId=',
    'operationId=../../private',
    `operationId=${'a'.repeat(129)}`,
    'operationId=one&operationId=two',
    'operationId=valid&password=private'
  ])('rejects and canonicalizes unsafe or ambiguous query state: %s', source => {
    expect(readDeploymentRoute(new URLSearchParams(source))).toEqual({ operationId: null, invalid: true });
    expect(writeDeploymentRoute(null).toString()).toBe('');
  });
});
