/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
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
