/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { SetupRequestError } from '../api/setup-api';
import { SetupContractError } from '../api/setup-schema';
import type { SetupRequestFailure } from '../model/setup-configuration-state';

export function classifySetupRequestFailure(error: unknown): SetupRequestFailure {
  if (error instanceof SetupContractError) return { failure: 'contract', errorCode: null };
  if (error instanceof SetupRequestError) {
    const failure = error.kind === 'unavailable' || error.kind === 'contract' ? error.kind : 'error';
    return { failure, errorCode: error.errorCode ?? null };
  }
  return { failure: 'error', errorCode: null };
}
