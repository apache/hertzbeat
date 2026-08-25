/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { loadSetupStatus } from '@/features/setup';
import type { SetupStatus } from '@/features/setup';

const POLL_INTERVAL_MS = 250;
const MAX_ATTEMPTS = 120;

type StatusLoader = () => Promise<Pick<SetupStatus, 'phase'>>;
type Pause = () => Promise<void>;

export async function waitForFactoryResetSetup(
  loadStatus: StatusLoader = loadSetupStatus,
  pause: Pause = waitBeforeRetry,
  maxAttempts = MAX_ATTEMPTS
) {
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    try {
      if ((await loadStatus()).phase !== 'complete') return;
    } catch {
      // The old application context may be unavailable while the setup runtime starts.
    }
    if (attempt + 1 < maxAttempts) await pause();
  }
  throw new Error('Factory reset setup transition timed out');
}

function waitBeforeRetry() {
  return new Promise<void>(resolve => window.setTimeout(resolve, POLL_INTERVAL_MS));
}
