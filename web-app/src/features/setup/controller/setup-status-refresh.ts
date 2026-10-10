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

import type { SetupStatus } from '../model/setup-contract';

export type SetupStatusRefreshResult =
  { succeeded: true; status: SetupStatus } | { succeeded: false; status: SetupStatus | null };

export type SetupStatusRefresh = (signal?: AbortSignal) => Promise<SetupStatusRefreshResult>;

export function successfulSetupStatusRefresh(status: SetupStatus): SetupStatusRefreshResult {
  return { succeeded: true, status };
}

export function failedSetupStatusRefresh(status: SetupStatus | null = null): SetupStatusRefreshResult {
  return { succeeded: false, status };
}

export async function safeSetupStatusRefresh(refresh: SetupStatusRefresh) {
  try {
    return await refresh();
  } catch {
    return failedSetupStatusRefresh();
  }
}
