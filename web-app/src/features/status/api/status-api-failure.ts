/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { ApiMessageError } from '@/core/http/api-message';
import { apiMessageWriteOutcome } from '@/core/http/api-message-write-evidence';

import { StatusOrgNotFoundError, StatusRequestFailure } from '../shared/status-error-model';

const statusOrgNotFoundCode = 15;
const statusOrgNotFoundMessage = 'Status Page Organization Not Found';

export type StatusApiFailureContext = { resource?: 'organization' };

/** Converts transport/envelope evidence into a value safe for feature layers. */
export function normalizeStatusApiFailure(error: unknown, context: StatusApiFailureContext = {}) {
  if (!(error instanceof ApiMessageError)) return error;
  if (context.resource === 'organization' && isExactStatusOrgNotFound(error)) {
    return new StatusOrgNotFoundError();
  }

  return new StatusRequestFailure(readFailureKind(error), apiMessageWriteOutcome(error));
}

export async function statusApiRequest<T>(
  operation: () => Promise<T>,
  context: StatusApiFailureContext = {}
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    throw normalizeStatusApiFailure(error, context);
  }
}

function isExactStatusOrgNotFound(error: ApiMessageError) {
  return (
    error.cause === undefined &&
    error.code === statusOrgNotFoundCode &&
    error.status === 200 &&
    error.message === statusOrgNotFoundMessage
  );
}

function readFailureKind(error: ApiMessageError) {
  if (error.cause !== undefined || error.status === undefined || error.status === 0 || error.status >= 500) {
    return 'unavailable' as const;
  }
  if (error.status === 404 || (error.status === 200 && error.code === statusOrgNotFoundCode)) {
    return 'missing' as const;
  }
  return 'error' as const;
}
