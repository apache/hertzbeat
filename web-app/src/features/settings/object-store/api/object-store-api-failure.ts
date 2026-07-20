/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { ApiMessageError } from '@/core/http/api-message';

import { ObjectStoreRequestFailure, type ObjectStoreFailureKind } from '../model/object-store-failure';
import { ObjectStoreDraftContractError, ObjectStoreResourceContractError } from '../model/object-store-model';

export type ObjectStoreRequestPhase = 'read' | 'write';

/** Normalizes transport and contract failures before they leave the Object Store API. */
export function normalizeObjectStoreApiFailure(reason: unknown, phase: ObjectStoreRequestPhase) {
  if (reason instanceof ObjectStoreRequestFailure) return reason;
  if (reason instanceof ObjectStoreDraftContractError) {
    return new ObjectStoreRequestFailure('invalid', phase === 'write' ? 'rejected' : 'uncertain', {
      code: 'OBJECT_STORE_VARIABLES_INVALID'
    });
  }
  if (reason instanceof ObjectStoreResourceContractError) {
    return new ObjectStoreRequestFailure('invalid', 'uncertain', { code: 'OBJECT_STORE_RESPONSE_INVALID' });
  }
  if (!(reason instanceof ApiMessageError)) return new ObjectStoreRequestFailure('error', 'uncertain');
  return new ObjectStoreRequestFailure(failureKind(reason), writeOutcome(reason, phase));
}

export async function objectStoreApiRequest<T>(
  phase: ObjectStoreRequestPhase,
  operation: () => Promise<T>
): Promise<T> {
  try {
    return await operation();
  } catch (reason) {
    throw normalizeObjectStoreApiFailure(reason, phase);
  }
}

function failureKind(reason: ApiMessageError): ObjectStoreFailureKind {
  if (reason.cause !== undefined || reason.status === undefined || reason.status === 0 || reason.status >= 500) {
    return 'unavailable';
  }
  return 'error';
}

function writeOutcome(reason: ApiMessageError, phase: ObjectStoreRequestPhase) {
  // A read-side response cannot establish whether an earlier write committed.
  if (phase === 'read') return 'uncertain';
  // A business envelope arrives after HTTP accepted the request. It cannot
  // prove that a non-idempotent replacement write did not commit.
  if (reason.code !== undefined) return 'uncertain';
  return reason.status !== undefined && reason.status >= 400 && reason.status < 500 ? 'rejected' : 'uncertain';
}
