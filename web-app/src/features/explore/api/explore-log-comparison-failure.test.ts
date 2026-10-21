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
import { comparisonFilterFailure } from './explore-log-comparison-failure';
it('retains recognized source/reason and never guesses shared or malformed details', () => {
  const failure = (data: unknown) =>
    comparisonFilterFailure(new ApiMessageError('observability_log_filter_invalid', { status: 400, data }));
  expect(failure({ source: 'b', reason: 'cidr_unsupported' })).toEqual({ source: 'b', reason: 'cidr_unsupported' });
  expect(failure({ source: 'b' })).toEqual({ source: 'b', reason: undefined });
  expect(failure(null)).toEqual({ source: undefined, reason: undefined });
  expect(failure({ source: 'c', reason: 'private_backend_detail' })).toEqual({ source: undefined, reason: undefined });
  expect(
    comparisonFilterFailure(
      new ApiMessageError('observability_log_filter_invalid', { status: 403, data: { source: 'b' } })
    )
  ).toBeUndefined();
});
it('binds source b diagnostics to its submitted expression and ignores unidentified shared errors', () => {
  const error = (source?: string) =>
    new ApiMessageError('observability_log_filter_invalid', {
      status: 400,
      data: { source, syntaxIssue: 'missing_value', start: 8, end: 8 }
    });
  const sources = {
    a: { query: 'status:ERROR', searchSyntax: 'structured-v1' },
    b: { search: 'service:', searchSyntax: 'structured-v1' }
  };
  expect(comparisonFilterFailure(error('b'), sources)?.diagnostic).toEqual({
    issue: 'missing_value',
    start: 8,
    end: 8,
    expression: 'service:'
  });
  expect(comparisonFilterFailure(error(), sources)?.diagnostic).toBeUndefined();
});
