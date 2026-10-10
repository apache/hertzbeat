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

import { ApiMessageError } from '@/core/http/api-message';
import type { UseQueryResult } from '@tanstack/react-query';
import { classifyExploreSignalError } from '../api/explore-signal-api-model';
function analysisFailureState(error: unknown): 'interval_too_small' | 'permission' | 'unavailable' | 'error' {
  if (
    error instanceof ApiMessageError &&
    error.status === 400 &&
    error.message === 'observability_log_analysis_interval_too_small'
  )
    return 'interval_too_small';
  const kind = classifyExploreSignalError(error);
  if (kind === 'permission') return 'permission';
  return kind === 'transport_error' ? 'unavailable' : 'error';
}

export function analysisLoadState(
  result: Pick<UseQueryResult<unknown>, 'isFetching' | 'isPending' | 'isError' | 'error'>,
  active: boolean
): 'idle' | 'loading' | 'ready' | 'interval_too_small' | 'permission' | 'unavailable' | 'error' {
  if (!active) return 'idle';
  if (result.isFetching || result.isPending) return 'loading';
  if (result.isError) return analysisFailureState(result.error);
  return 'ready';
}
