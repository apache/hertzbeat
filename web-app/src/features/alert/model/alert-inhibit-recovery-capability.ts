/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

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
