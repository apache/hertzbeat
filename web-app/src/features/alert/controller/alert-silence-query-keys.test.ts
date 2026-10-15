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

import type { AlertSilenceQuery } from '../model/alert-silence-model';
import { alertSilenceQueryKeys } from './alert-silence-query-keys';

const query: AlertSilenceQuery = { search: 'maintenance', pageIndex: 2, pageSize: 15 };

describe('Alert Silence query keys', () => {
  it('includes every backend list input in stable order', () => {
    expect(alertSilenceQueryKeys.list(query)).toEqual(['alert-silence-policies', 'list', 'maintenance', 2, 15]);
  });

  it.each([
    ['search', { search: 'deployment' }],
    ['pageIndex', { pageIndex: 3 }],
    ['pageSize', { pageSize: 25 }]
  ] satisfies Array<[string, Partial<AlertSilenceQuery>]>)(
    'separates cache evidence when %s changes',
    (_field, patch) => {
      expect(alertSilenceQueryKeys.list({ ...query, ...patch })).not.toEqual(alertSilenceQueryKeys.list(query));
    }
  );
});
