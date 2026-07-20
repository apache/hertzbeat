/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { ApiMessageError } from '@/core/http/api-message';

import { AlertGroupRequestFailure, type AlertGroupFailure, type AlertGroupWriteOutcome } from '../alert-group-model';

const unavailableStatuses = new Set([0, 502, 503, 504]);

/** Converts transport evidence once, before it can escape the Alert Group API. */
export function normalizeAlertGroupApiFailure(error: unknown) {
  if (!(error instanceof ApiMessageError)) return error;
  return new AlertGroupRequestFailure(readFailureKind(error), writeOutcome(error));
}

/** Runs one transport operation behind the Alert Group domain boundary. */
export async function alertGroupApiRequest<T>(operation: () => Promise<T>): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    throw normalizeAlertGroupApiFailure(error);
  }
}

function readFailureKind(error: ApiMessageError): AlertGroupFailure {
  if (error.status === 404 || (error.status === 200 && error.code === 3)) return 'missing';
  if (error.cause !== undefined || error.status === undefined || unavailableStatuses.has(error.status)) {
    return 'unavailable';
  }
  return 'error';
}

function writeOutcome(error: ApiMessageError): AlertGroupWriteOutcome {
  // A response body code does not override the source HTTP evidence. Network
  // causes, timeouts, success envelopes, and server failures can all arrive
  // after persistence; only a direct non-timeout HTTP 4xx is safe to replay.
  if (error.cause !== undefined) return 'uncertain';
  return error.status !== undefined && error.status >= 400 && error.status < 500 && error.status !== 408
    ? 'rejected'
    : 'uncertain';
}
