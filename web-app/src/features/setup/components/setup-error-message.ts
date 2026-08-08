/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import type { SetupErrorCode } from '../model/setup-contract';

export function generalSetupErrorKey(errorCode: SetupErrorCode | null) {
  if (errorCode === 'invalid_request') return 'setup.error.invalidRequest';
  if (errorCode === 'internal_error') return 'setup.error.internalError';
  return null;
}
