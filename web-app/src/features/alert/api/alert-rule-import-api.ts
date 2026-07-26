/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { ApiMessageError, apiMessagePostForm } from '@/core/http/api-message';
import { apiMessageWriteOutcome } from '@/core/http/api-message-write-evidence';

import {
  validateAlertRuleImportFile,
  type AlertRuleImportFailureKind,
  type AlertRuleImportWriteOutcome
} from '../model/alert-rule-import-model';

const alertRuleImportEndpoint = '/api/alert/defines/import';
const unavailableStatuses = new Set([0, 502, 503, 504]);

export class AlertRuleImportError extends Error {
  constructor(
    readonly kind: AlertRuleImportFailureKind,
    readonly outcome: AlertRuleImportWriteOutcome
  ) {
    super('Alert Rule import failed');
    this.name = 'AlertRuleImportError';
  }
}

export async function importAlertRuleDefinitions(file: File, signal?: AbortSignal) {
  if (!validateAlertRuleImportFile(file).valid) {
    throw new AlertRuleImportError('validation', 'rejected');
  }
  const form = new FormData();
  form.append('file', file);
  try {
    await apiMessagePostForm(alertRuleImportEndpoint, form, signal ? { signal } : {});
  } catch (error) {
    throw normalizeImportFailure(error);
  }
}

function normalizeImportFailure(error: unknown) {
  if (error instanceof AlertRuleImportError) return error;
  if (!(error instanceof ApiMessageError)) {
    return new AlertRuleImportError('error', 'uncertain');
  }
  return new AlertRuleImportError(importFailureKind(error), apiMessageWriteOutcome(error));
}

function importFailureKind(error: ApiMessageError): AlertRuleImportFailureKind {
  if (error.status === 401 || error.status === 403) return 'forbidden';
  if (error.status === 400 || error.status === 422) return 'validation';
  if (error.cause !== undefined || error.status === undefined || unavailableStatuses.has(error.status)) {
    return 'unavailable';
  }
  return 'error';
}
