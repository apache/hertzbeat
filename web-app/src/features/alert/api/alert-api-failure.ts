/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { ApiMessageError } from '@/core/http/api-message';

import { AlertRequestFailure } from '../alert-model';

const unavailableHttpStatuses = new Set([0, 502, 503, 504]);

/** Converts Alert Center transport evidence into a redacted domain failure. */
export function normalizeAlertApiFailure(error: unknown) {
  if (!(error instanceof ApiMessageError)) return error;
  // Only missing/network/gateway evidence means the alert source is
  // unavailable. Other HTTP and envelope failures remain ordinary errors.
  const unavailable =
    error.cause !== undefined || error.status === undefined || unavailableHttpStatuses.has(error.status);
  return new AlertRequestFailure(unavailable ? 'unavailable' : 'error');
}

export async function alertApiRequest<T>(operation: () => Promise<T>, signal?: AbortSignal): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    // Caller cancellation retires query ownership; it is not availability evidence.
    if (signal?.aborted) throw new DOMException('Request aborted', 'AbortError');
    throw normalizeAlertApiFailure(error);
  }
}
