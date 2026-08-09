/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { useEffect } from 'react';

import type { SetupStatus } from '../model/setup-contract';
import { setupPollDelay } from './setup-poll-backoff';
import { safeSetupStatusRefresh, type SetupStatusRefresh } from './setup-status-refresh';

export function useSetupStatusAuthorityConvergence(
  active: boolean,
  refetchStatus: SetupStatusRefresh,
  converged: (status: SetupStatus) => boolean
) {
  useEffect(() => {
    if (!active) return;
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout>;
    let failedAttempts = 0;
    const refresh = async () => {
      const result = await safeSetupStatusRefresh(() => refetchStatus(controller.signal));
      if (controller.signal.aborted || (result.succeeded && converged(result.status))) return;
      const delay = setupPollDelay(0, result.succeeded ? 0 : failedAttempts);
      failedAttempts = result.succeeded ? 0 : failedAttempts + 1;
      timer = setTimeout(() => void refresh(), delay);
    };
    void refresh();
    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [active, converged, refetchStatus]);
}
