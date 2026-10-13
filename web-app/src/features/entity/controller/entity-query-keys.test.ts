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

import { entityQueryKeys } from './entity-query-keys';

describe('entity monitor query keys', () => {
  it('owns normalized filters and page identity beneath the entity detail scope', () => {
    expect(entityQueryKeys.monitors(7, { status: 2, app: ' website ', pageIndex: 1, pageSize: 50 })).toEqual([
      'entities',
      'detail',
      7,
      'monitors',
      { status: 2, app: 'website', pageIndex: 1, pageSize: 50 }
    ]);
    expect(entityQueryKeys.monitors(8, { pageIndex: 0, pageSize: 50 })).not.toEqual(
      entityQueryKeys.monitors(7, { pageIndex: 0, pageSize: 50 })
    );
  });
});
