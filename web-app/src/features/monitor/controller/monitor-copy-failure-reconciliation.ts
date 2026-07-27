/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
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
