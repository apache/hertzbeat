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

import type { MonitorAction, MonitorPage } from '../model/monitor-contract';

export function shouldReconcileFailedMonitorCopy(action: MonitorAction, error: unknown) {
  return action === 'copy' && error instanceof ApiMessageError && (error.code === 3 || error.status === 404);
}

export async function reconcileFailedMonitorCopy(
  action: MonitorAction,
  error: unknown,
  reread: () => Promise<MonitorPage>
) {
  if (!shouldReconcileFailedMonitorCopy(action, error)) return;
  try {
    await reread();
  } catch {
    // The command remains failed; the canonical list read owns its availability evidence.
  }
}
