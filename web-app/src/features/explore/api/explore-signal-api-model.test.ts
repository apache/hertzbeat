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
import { classifyExploreSignalError } from './explore-signal-api-model';
it('classifies only the dedicated HTTP400 filter contract without exposing server text', () => {
  expect(classifyExploreSignalError(new ApiMessageError('observability_log_filter_invalid', { status: 400 }))).toBe(
    'invalid_filter'
  );
  expect(classifyExploreSignalError(new ApiMessageError('observability_log_filter_invalid', { status: 500 }))).toBe(
    'error'
  );
  expect(classifyExploreSignalError(new ApiMessageError('raw SQL failure', { status: 400 }))).toBe('error');
});

it('classifies bounded calculated query failures without showing backend details', () => {
  expect(
    classifyExploreSignalError(
      new ApiMessageError('observability_log_filter_invalid', {
        status: 400,
        data: { reason: 'calculated_budget_exceeded' }
      })
    )
  ).toBe('calculated_budget_exceeded');
  expect(
    classifyExploreSignalError(
      new ApiMessageError('observability_log_filter_invalid', {
        status: 400,
        data: { reason: 'calculated_invalid_pattern' }
      })
    )
  ).toBe('calculated_invalid_pattern');
  expect(
    classifyExploreSignalError(
      new ApiMessageError('observability_log_filter_invalid', { status: 400, data: { reason: 'raw SQL failure' } })
    )
  ).toBe('invalid_filter');
  expect(
    classifyExploreSignalError(
      new ApiMessageError('observability_log_filter_invalid', {
        status: 500,
        data: { reason: 'calculated_budget_exceeded' }
      })
    )
  ).toBe('error');
  expect(
    classifyExploreSignalError(
      new ApiMessageError('raw SQL failure', { status: 400, data: { reason: 'calculated_budget_exceeded' } })
    )
  ).toBe('error');
  expect(classifyExploreSignalError(new ApiMessageError('calculated_budget_exceeded', { status: 400 }))).toBe(
    'calculated_budget_exceeded'
  );
  expect(classifyExploreSignalError(new ApiMessageError('calculated_invalid_pattern', { status: 400 }))).toBe(
    'calculated_invalid_pattern'
  );
  expect(classifyExploreSignalError(new ApiMessageError('calculated_budget_exceeded', { status: 500 }))).toBe('error');
});
