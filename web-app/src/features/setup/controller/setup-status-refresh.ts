/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

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
