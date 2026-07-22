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

import { useQuery } from '@tanstack/react-query';

import { loadRuntimeStatus } from '../api/runtime-status-api';
import type { RuntimeStatusViewModel } from '../model/runtime-status-contract';
import { unavailableRuntimeStatus } from '../model/runtime-status-model';
import { runtimeStatusQueryKeys } from './runtime-status-query-keys';

export const RUNTIME_STATUS_REFRESH_INTERVAL_MS = 30_000;

export function useRuntimeStatusController(): RuntimeStatusViewModel {
  const query = useQuery({
    queryKey: runtimeStatusQueryKeys.current(),
    queryFn: ({ signal }) => loadRuntimeStatus({ signal }),
    refetchInterval: RUNTIME_STATUS_REFRESH_INTERVAL_MS
  });

  if (query.isPending) return { state: 'loading', snapshot: null };
  if (query.error || !query.data) return { state: 'unavailable', snapshot: unavailableRuntimeStatus() };
  return { state: 'ready', snapshot: query.data };
}
