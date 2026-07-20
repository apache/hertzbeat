/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { ApiMessageError } from '@/core/http/api-message';
import { apiMessageWriteOutcome } from '@/core/http/api-message-write-evidence';

import { TokenRequestFailure, type TokenFailureKind } from '../model/token-failure';
import { TokenApiContractError } from './token-schema';

export type TokenRequestPhase = 'collection' | 'write';

/** Normalizes transport and wire-schema failures before they leave the Token API. */
export function normalizeTokenApiFailure(reason: unknown, phase: TokenRequestPhase) {
  if (reason instanceof TokenRequestFailure) {
    if (phase === 'collection' && reason.writeOutcome === 'rejected') {
      return new TokenRequestFailure(reason.kind, 'uncertain', reason.code === undefined ? {} : { code: reason.code });
    }
    return reason;
  }
  if (reason instanceof TokenApiContractError) {
    return new TokenRequestFailure('invalid', 'uncertain', { code: 'TOKEN_RESPONSE_INVALID' });
  }
  if (!(reason instanceof ApiMessageError)) return new TokenRequestFailure('error', 'uncertain');
  return new TokenRequestFailure(
    failureKind(reason),
    phase === 'collection' ? 'uncertain' : apiMessageWriteOutcome(reason)
  );
}

export async function tokenApiRequest<T>(phase: TokenRequestPhase, operation: () => Promise<T>): Promise<T> {
  try {
    return await operation();
  } catch (reason) {
    throw normalizeTokenApiFailure(reason, phase);
  }
}

function failureKind(reason: ApiMessageError): TokenFailureKind {
  if (reason.cause !== undefined || reason.status === undefined || reason.status === 0 || reason.status >= 500) {
    return 'unavailable';
  }
  return 'error';
}
