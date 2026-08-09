/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { SetupRequestError } from '../api/setup-api';

export type SetupWriteOutcome = 'definite_rejection' | 'uncertain';

/** Only an explicit non-timeout client rejection proves that a setup write did not complete. */
export function setupWriteOutcome(error: unknown): SetupWriteOutcome {
  if (!(error instanceof SetupRequestError) || error.kind !== 'http') return 'uncertain';
  const status = error.status;
  return status !== undefined && status >= 400 && status < 500 && status !== 408 ? 'definite_rejection' : 'uncertain';
}
