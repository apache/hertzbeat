/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { ApiMessageError } from '@/core/http/api-message';

import { AlertRuleRequestFailure, type AlertRuleFailureKind, type AlertRuleWriteOutcome } from '../alert-rule-model';

const unavailableStatuses = new Set([0, 502, 503, 504]);

/** Converts transport evidence once, before it can escape the Alert Rule API. */
export function normalizeAlertRuleApiFailure(error: unknown) {
  if (!(error instanceof ApiMessageError)) return error;
  return new AlertRuleRequestFailure(readFailureKind(error), writeOutcome(error));
}

/** Runs one transport operation behind the Alert Rule domain boundary. */
export async function alertRuleApiRequest<T>(operation: () => Promise<T>, signal?: AbortSignal): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    // Caller cancellation retires query ownership; it is not availability evidence.
    if (signal?.aborted) throw new DOMException('Request aborted', 'AbortError');
    throw normalizeAlertRuleApiFailure(error);
  }
}

function readFailureKind(error: ApiMessageError): AlertRuleFailureKind {
  if (error.cause !== undefined || error.status === undefined || unavailableStatuses.has(error.status)) {
    return 'unavailable';
  }
  if (error.status === 404 || (error.status === 200 && error.code === 3)) return 'missing';
  return 'error';
}

function writeOutcome(error: ApiMessageError): AlertRuleWriteOutcome {
  // Only a completed, non-timeout HTTP 4xx response proves that the write was rejected.
  if (error.cause !== undefined || error.status === 408) return 'uncertain';
  return error.status !== undefined && error.status >= 400 && error.status < 500 ? 'rejected' : 'uncertain';
}
