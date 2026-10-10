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
import { analysisLoadState } from './log-analysis-load-state';
it('recognizes only the authenticated 400 interval failure and never overrides loading', () => {
  const base = {
    isFetching: false,
    isPending: false,
    isError: true,
    error: new ApiMessageError('observability_log_analysis_interval_too_small', { status: 400 })
  };
  expect(analysisLoadState(base, true)).toBe('interval_too_small');
  expect(analysisLoadState({ ...base, isFetching: true }, true)).toBe('loading');
  expect(
    analysisLoadState(
      { ...base, error: new ApiMessageError('observability_log_analysis_interval_too_small', { status: 403 }) },
      true
    )
  ).toBe('permission');
});
