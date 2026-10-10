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

import type { UseQueryResult } from '@tanstack/react-query';
import { classifyExploreSignalError, logFilterFailureReason } from '../api/explore-signal-api-model';
import { logSyntaxDiagnostic } from '../api/explore-log-syntax-diagnostic';
import { analysisLoadState } from './log-analysis-load-state';
export function transactionLoadState(
  result: Pick<UseQueryResult<unknown>, 'isFetching' | 'isPending' | 'isError' | 'error'>,
  active: boolean,
  expression: string | undefined,
  syntax: string | undefined
) {
  const state = analysisLoadState(result, active);
  const invalid = state === 'error' && classifyExploreSignalError(result.error) === 'invalid_filter';
  return {
    state: invalid ? ('invalid_filter' as const) : state,
    invalidFilterReason: invalid ? logFilterFailureReason(result.error) : undefined,
    syntaxDiagnostic: invalid ? logSyntaxDiagnostic(result.error, expression, syntax) : undefined
  };
}
