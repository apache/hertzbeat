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

import type { AlertQuery } from '../model/alert-model';
import { alertCenterQueryKeys } from './alert-center-query-keys';

describe('Alert Center Query Keys', () => {
  it('includes every filter and pagination input in list identity', () => {
    const query: AlertQuery = {
      search: 'latency',
      status: 'firing',
      severity: 'critical',
      serviceName: 'checkout',
      serviceNamespace: 'shop',
      environment: 'prod',
      pageIndex: 2,
      pageSize: 15
    };

    expect(alertCenterQueryKeys.groups(query)).toEqual([
      'alert-center',
      'groups',
      'latency',
      'firing',
      'critical',
      'checkout',
      'shop',
      'prod',
      2,
      15
    ]);
    expect(alertCenterQueryKeys.root()).toEqual(['alert-center']);
    expect(alertCenterQueryKeys.summary()).toEqual(['alert-center', 'summary']);
  });
});
