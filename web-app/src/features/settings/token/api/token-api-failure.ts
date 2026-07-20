/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { ApiMessageError } from '@/core/http/api-message';

import { TokenRequestFailure, type TokenFailureKind } from '../model/token-failure';
import { TokenApiContractError } from './token-schema';

export type TokenRequestPhase = 'collection' | 'write';

/** Normalizes transport and wire-schema failures before they leave the Token API. */
export function normalizeTokenApiFailure(reason: unknown, phase: TokenRequestPhase) {
  if (reason instanceof TokenRequestFailure) return reason;
  if (reason instanceof TokenApiContractError) {
    return new TokenRequestFailure('invalid', 'uncertain', { code: 'TOKEN_RESPONSE_INVALID' });
  }
  if (!(reason instanceof ApiMessageError)) return new TokenRequestFailure('error', 'uncertain');
  return new TokenRequestFailure(failureKind(reason), writeOutcome(reason, phase));
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

function writeOutcome(reason: ApiMessageError, phase: TokenRequestPhase) {
  if (phase === 'collection') return 'uncertain';
  // A non-zero envelope or HTTP 4xx proves the server rejected the command.
  if (reason.code !== undefined) return 'rejected';
  return reason.status !== undefined && reason.status >= 400 && reason.status < 500 ? 'rejected' : 'uncertain';
}
