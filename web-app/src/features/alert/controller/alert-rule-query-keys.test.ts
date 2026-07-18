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

import type { AlertRuleQuery } from '../alert-rule-model';
import { alertRuleQueryKeys } from './alert-rule-query-keys';

describe('Alert Rule Query Keys', () => {
  it('preserves the complete list query as the established cache identity', () => {
    const query: AlertRuleQuery = { search: 'cpu', pageIndex: 2, pageSize: 15 };

    expect(alertRuleQueryKeys.list(query)).toEqual(['alert-rules', query]);
  });

  it('uses the normalized detail id as the complete backend query identity', () => {
    expect(alertRuleQueryKeys.detail(7)).toEqual(['alert-rules', 'detail', 7]);
    expect(alertRuleQueryKeys.detail(8)).toEqual(['alert-rules', 'detail', 8]);
    expect(alertRuleQueryKeys.detail(null)).toEqual(['alert-rules', 'detail', null]);
  });
});
