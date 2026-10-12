/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License.  You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

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
  if (reason.status === 401 || reason.status === 403 || isPermissionMessage(reason.message)) return 'permission';
  if (reason.message === 'Token storage unavailable') return 'unavailable';
  if (reason.message === 'Invalid token request') return 'invalid';
  return 'error';
}

function writeOutcome(reason: ApiMessageError, phase: TokenRequestPhase) {
  if (phase === 'collection') return 'uncertain';
  if (reason.message === 'Invalid token request' || isPermissionMessage(reason.message)) return 'rejected';
  return apiMessageWriteOutcome(reason);
}

function isPermissionMessage(message: string) {
  return message === 'No permission' || message === 'No login user';
}
