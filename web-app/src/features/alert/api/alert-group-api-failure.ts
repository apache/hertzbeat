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
  // An application code proves rejection. Network failures, malformed 200
  // envelopes, and server failures without such evidence can arrive after a
  // void write committed, so those outcomes must remain uncertain.
  if (error.code !== undefined) return 'rejected';
  if (error.cause !== undefined || error.status === undefined || unavailableStatuses.has(error.status)) {
    return 'uncertain';
  }
  if (error.status === 200 || error.status >= 500) return 'uncertain';
  return 'rejected';
}
