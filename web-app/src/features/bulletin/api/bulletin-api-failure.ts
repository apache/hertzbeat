/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { ApiMessageError } from '@/core/http/api-message';
import { apiMessageWriteOutcome } from '@/core/http/api-message-write-evidence';

import { BulletinRequestFailure, type BulletinFailureKind, type BulletinWriteOutcome } from '../model/bulletin-failure';
import { BulletinContractError } from './bulletin-schema';

export type BulletinApiOperation = 'list' | 'read-detail' | 'metrics' | 'create' | 'update' | 'delete';

export function normalizeBulletinApiFailure(reason: unknown, operation: BulletinApiOperation) {
  if (reason instanceof BulletinRequestFailure) return reason;
  if (reason instanceof BulletinContractError) {
    return new BulletinRequestFailure('invalid', 'uncertain', { code: reason.code });
  }
  if (!(reason instanceof ApiMessageError)) return new BulletinRequestFailure('error', 'uncertain');
  return new BulletinRequestFailure(failureKind(reason, operation), writeOutcome(reason, operation));
}

/** Ensures raw transport and schema errors never leave a Bulletin API operation. */
export async function bulletinApiRequest<T>(
  operation: BulletinApiOperation,
  request: () => Promise<T>,
  signal?: AbortSignal
): Promise<T> {
  try {
    return await request();
  } catch (reason) {
    // Caller cancellation retires query ownership; it is not availability evidence.
    if (signal?.aborted) throw new DOMException('Request aborted', 'AbortError');
    throw normalizeBulletinApiFailure(reason, operation);
  }
}

function failureKind(reason: ApiMessageError, operation: BulletinApiOperation): BulletinFailureKind {
  if (reason.status === 401 || reason.status === 403) return 'permission';
  if (reason.cause !== undefined || reason.status == null || reason.status === 0 || reason.status >= 500) {
    return 'unavailable';
  }
  if (operation === 'read-detail' && reason.status === 404) return 'missing';
  if (operation === 'metrics' && reason.status === 200 && reason.code === 15) return 'unavailable';
  return 'error';
}

function writeOutcome(reason: ApiMessageError, operation: BulletinApiOperation): BulletinWriteOutcome {
  if (!isWriteOperation(operation)) return 'uncertain';
  if (reason.status === 401 || reason.status === 403) return 'rejected';
  return apiMessageWriteOutcome(reason);
}

function isWriteOperation(operation: BulletinApiOperation) {
  return operation === 'create' || operation === 'update' || operation === 'delete';
}
