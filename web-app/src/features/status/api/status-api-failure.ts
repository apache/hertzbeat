/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { ApiMessageError } from '@/core/http/api-message';

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

  return new StatusRequestFailure(readFailureKind(error), writeOutcome(error));
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
  return error.code === statusOrgNotFoundCode && error.status === 200 && error.message === statusOrgNotFoundMessage;
}

function readFailureKind(error: ApiMessageError) {
  if (error.status === 404 || (error.status === 200 && error.code === statusOrgNotFoundCode)) {
    return 'missing' as const;
  }
  if (error.cause != null || [0, 502, 503, 504].includes(error.status ?? 0)) {
    return 'unavailable' as const;
  }
  return 'error' as const;
}

function writeOutcome(error: ApiMessageError) {
  const status = error.status ?? 0;
  // Business envelopes and transport/server failures may be observed after
  // persistence. Only a direct, non-timeout HTTP 4xx proves rejection.
  const hasNoTransportCause = error.cause === undefined || error.cause === null;
  return hasNoTransportCause && status >= 400 && status < 500 && status !== 408
    ? ('rejected' as const)
    : ('uncertain' as const);
}
