/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { ApiMessageError } from '@/core/http/api-message';

import {
  AlertRuleRequestFailure,
  AlertRuleWriteRequestFailure,
  type AlertRuleFailureKind,
  type AlertRuleWriteFailureKind,
  type AlertRuleWriteOutcome
} from '../model/alert-rule-model';

const unavailableStatuses = new Set([0, 502, 503, 504]);

/** Converts transport evidence once, before it can escape the Alert Rule API. */
export function normalizeAlertRuleApiFailure(error: unknown) {
  if (!(error instanceof ApiMessageError)) return error;
  return new AlertRuleRequestFailure(readFailureKind(error), writeOutcome(error));
}

export function normalizeAlertRuleWriteFailure(error: unknown) {
  if (!(error instanceof ApiMessageError)) return error;
  return new AlertRuleWriteRequestFailure(writeFailureKind(error), writeOutcome(error));
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

export async function alertRuleWriteApiRequest<T>(operation: () => Promise<T>): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    throw normalizeAlertRuleWriteFailure(error);
  }
}

function readFailureKind(error: ApiMessageError): AlertRuleFailureKind {
  if (error.cause !== undefined || error.status === undefined || unavailableStatuses.has(error.status)) {
    return 'unavailable';
  }
  if (error.status === 401 || error.status === 403) return 'permission';
  if (error.status === 404 || (error.status === 200 && error.code === 3)) return 'missing';
  return 'error';
}

function writeFailureKind(error: ApiMessageError): AlertRuleWriteFailureKind {
  if (error.cause !== undefined || error.status === undefined || unavailableStatuses.has(error.status)) {
    return 'unavailable';
  }
  if (error.status === 401 || error.status === 403) return 'permission';
  if (error.code === 1 || error.status === 400) return 'validation';
  return 'error';
}

function writeOutcome(error: ApiMessageError): AlertRuleWriteOutcome {
  if (
    error.cause !== undefined ||
    error.status === undefined ||
    error.status === 0 ||
    error.status === 408 ||
    error.status >= 500
  ) {
    return 'uncertain';
  }
  if (error.code === 1) return 'rejected';
  // A completed, non-timeout HTTP 4xx response proves that the write was rejected.
  return error.status !== undefined && error.status >= 400 && error.status < 500 ? 'rejected' : 'uncertain';
}
