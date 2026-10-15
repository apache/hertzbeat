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
import { ApiMessageError } from '@/core/http/api-message';
import { classifyExploreSignalError } from '../api/explore-signal-api-model';
import { exploreFailureMessageKey, refreshFailureMessageKey } from './explore-result-messages';

it('gives a specific recovery message for calculated budget and invalid pattern failures', () => {
  const actualBudgetError = new ApiMessageError('observability_log_filter_invalid', {
    status: 400,
    data: { reason: 'calculated_budget_exceeded' }
  });
  const kind = classifyExploreSignalError(actualBudgetError);
  expect(kind).toBe('calculated_budget_exceeded');
  if (kind !== 'calculated_budget_exceeded') throw new Error('calculated budget classification changed');
  expect(exploreFailureMessageKey(kind)).toBe('explore.logCalculatedV2.queryBudgetExceeded');
  expect(exploreFailureMessageKey('calculated_budget_exceeded')).toBe('explore.logCalculatedV2.queryBudgetExceeded');
  expect(refreshFailureMessageKey('calculated_budget_exceeded')).toBe('explore.logCalculatedV2.queryBudgetExceeded');
  expect(exploreFailureMessageKey('calculated_invalid_pattern')).toBe('explore.logCalculatedV2.queryInvalidPattern');
});
