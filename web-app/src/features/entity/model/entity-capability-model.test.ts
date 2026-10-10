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

import { entityCapabilities } from './entity-capability-model';

describe('entity capabilities', () => {
  it.each([
    [['ADMIN'], { canWrite: true, canDelete: true }],
    [['USER'], { canWrite: true, canDelete: false }],
    [['GUEST'], { canWrite: false, canDelete: false }],
    [[], { canWrite: false, canDelete: false }]
  ] as const)('maps session roles %s to write and delete admission', (roles, expected) => {
    expect(entityCapabilities(roles)).toEqual(expected);
  });
});
