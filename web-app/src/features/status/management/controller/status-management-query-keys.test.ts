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

import { statusManagementQueryKeys } from './status-management-query-keys';

describe('Status Management Query Keys', () => {
  it('keeps singleton resources stable', () => {
    expect(statusManagementQueryKeys.org()).toEqual(statusManagementQueryKeys.org());
    expect(statusManagementQueryKeys.components()).toEqual(statusManagementQueryKeys.components());
    expect(statusManagementQueryKeys.org()).not.toEqual(statusManagementQueryKeys.components());
  });

  it('includes every URL-owned incident query input', () => {
    const baseline = statusManagementQueryKeys.incidents({
      search: 'api',
      pageIndex: 0,
      pageSize: 8
    });

    expect(
      statusManagementQueryKeys.incidents({
        search: 'web',
        pageIndex: 0,
        pageSize: 8
      })
    ).not.toEqual(baseline);
    expect(
      statusManagementQueryKeys.incidents({
        search: 'api',
        pageIndex: 1,
        pageSize: 8
      })
    ).not.toEqual(baseline);
    expect(
      statusManagementQueryKeys.incidents({
        search: 'api',
        pageIndex: 0,
        pageSize: 20
      })
    ).not.toEqual(baseline);
  });
});
