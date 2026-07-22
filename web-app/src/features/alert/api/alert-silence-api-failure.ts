/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { ApiMessageError } from '@/core/http/api-message';
import { apiMessageWriteOutcome } from '@/core/http/api-message-write-evidence';

import {
  AlertSilenceMissingError,
  AlertSilenceRequestFailure,
  type AlertSilenceFailure
} from '../model/alert-silence-model';

const missingCode = 3;
const unavailableStatuses = new Set([0, 502, 503, 504]);

/** Converts transport evidence once, before it can escape the Alert Silence API. */
export function normalizeAlertSilenceApiFailure(error: unknown) {
  if (error instanceof AlertSilenceRequestFailure || error instanceof AlertSilenceMissingError) {
    return error;
  }
  if (error instanceof ApiMessageError) {
    return new AlertSilenceRequestFailure(readFailureKind(error), apiMessageWriteOutcome(error));
  }
  return new AlertSilenceRequestFailure('error', 'uncertain');
}

/** Runs one transport operation behind the Alert Silence domain boundary. */
export async function alertSilenceApiRequest<T>(operation: () => Promise<T>): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    throw normalizeAlertSilenceApiFailure(error);
  }
}

function readFailureKind(error: ApiMessageError): AlertSilenceFailure {
  if (error.cause !== undefined || error.status === undefined || unavailableStatuses.has(error.status)) {
    return 'unavailable';
  }
  // AlertSilenceController reuses the shared MONITOR_NOT_EXIST_CODE (0x03)
  // for a missing detail even though this resource is not a monitor.
  if (error.status === 404 || (error.status === 200 && error.code === missingCode)) return 'missing';
  return 'error';
}
