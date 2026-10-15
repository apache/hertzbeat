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

import type { AlertActionCapabilities } from './alert-action-capability';
import type { AlertInhibitRecovery } from './alert-inhibit-state';

export function alertInhibitRouteRecovery(
  recovery: AlertInhibitRecovery | undefined,
  capabilities: AlertActionCapabilities,
  hasDraft: boolean
) {
  if (!recovery) return { recovery: undefined, canRetry: false };
  const canRetry = canRetryAlertInhibitRecovery(recovery, capabilities);
  if (recovery.kind === 'save' && capabilities.canWrite && hasDraft) {
    return { recovery: undefined, canRetry };
  }
  return { recovery, canRetry };
}

export function canRetryAlertInhibitRecovery(
  recovery: AlertInhibitRecovery | undefined,
  capabilities: AlertActionCapabilities
) {
  if (!recovery) return false;
  return recovery.kind === 'delete' ? capabilities.canDelete : capabilities.canWrite;
}
