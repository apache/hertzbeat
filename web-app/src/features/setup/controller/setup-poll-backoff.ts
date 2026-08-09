/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

const MIN_SETUP_POLL_MILLIS = 250;
const MAX_SETUP_POLL_MILLIS = 5_000;

export function setupPollDelay(hintMillis = 0, failedAttempts = 0) {
  const base = Math.min(MAX_SETUP_POLL_MILLIS, Math.max(MIN_SETUP_POLL_MILLIS, hintMillis));
  return Math.min(MAX_SETUP_POLL_MILLIS, base * 2 ** failedAttempts);
}
