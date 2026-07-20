/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { ApiMessageError } from '@/core/http/api-message';
import { apiMessageWriteOutcome } from '@/core/http/api-message-write-evidence';

import { AlertInhibitRequestFailure, type AlertInhibitFailure } from '../alert-inhibit-model';

const unavailableStatuses = new Set([0, 502, 503, 504]);

/** Converts transport evidence once, before it can escape the Alert Inhibit API. */
export function normalizeAlertInhibitApiFailure(error: unknown) {
  if (!(error instanceof ApiMessageError)) return error;
  return new AlertInhibitRequestFailure(readFailureKind(error), apiMessageWriteOutcome(error));
}

/** Runs one transport operation behind the Alert Inhibit domain boundary. */
export async function alertInhibitApiRequest<T>(operation: () => Promise<T>): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    throw normalizeAlertInhibitApiFailure(error);
  }
}

function readFailureKind(error: ApiMessageError): AlertInhibitFailure {
  if (error.cause !== undefined || error.status === undefined || unavailableStatuses.has(error.status)) {
    return 'unavailable';
  }
  if (error.status === 404 || (error.status === 200 && error.code === 3)) return 'missing';
  return 'error';
}
