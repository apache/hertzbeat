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

import type { AlertCenterOperationRecovery } from './alert-center-operation-state';

const alertStatusWriteRoles = new Set(['ADMIN', 'USER']);
const alertDeleteRoles = new Set(['ADMIN']);

export type AlertCapabilities = {
  canUpdateStatus: boolean;
  canDeleteGroups: boolean;
  canSelect: boolean;
};
export type AlertCenterActionPolicy = Pick<AlertCapabilities, 'canUpdateStatus' | 'canDeleteGroups' | 'canSelect'>;

/** Mirrors the shipped Sureness Alert Center policy for action admission. */
export function alertCapabilities(roles: readonly string[]): AlertCapabilities {
  const canUpdateStatus = hasAnyRole(roles, alertStatusWriteRoles);
  const canDeleteGroups = hasAnyRole(roles, alertDeleteRoles);
  return {
    canUpdateStatus,
    canDeleteGroups,
    canSelect: canUpdateStatus || canDeleteGroups
  };
}

export function canRetryAlertCenterRecovery(
  capabilities: Pick<AlertCapabilities, 'canUpdateStatus' | 'canDeleteGroups'>,
  recovery: AlertCenterOperationRecovery | null
) {
  if (!recovery) return false;
  return recovery.kind === 'delete' ? capabilities.canDeleteGroups : capabilities.canUpdateStatus;
}

export function hasAlertCenterRowActions(capabilities: Pick<AlertCapabilities, 'canDeleteGroups' | 'canUpdateStatus'>) {
  return capabilities.canDeleteGroups || capabilities.canUpdateStatus;
}

function hasAnyRole(roles: readonly string[], permitted: ReadonlySet<string>) {
  return roles.some(role => permitted.has(role));
}
