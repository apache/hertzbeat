/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License.  You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { ApiMessageError } from '@/core/http/api-message';

import { MonitorContractError } from '../model/monitor-contract';
import type { MonitorEditorCommandFailureKind } from '../model/monitor-editor-model';

const temporarilyUnavailableStatuses = new Set([0, 408, 429]);

/** Reduces transport and schema evidence to a safe operator-facing failure class. */
export function classifyMonitorEditorCommandFailure(error: unknown): MonitorEditorCommandFailureKind {
  if (error instanceof MonitorContractError) return 'contract';
  if (!(error instanceof ApiMessageError)) return 'error';
  return classifyMonitorApiMessageFailure(error);
}

/** Returns only diagnostics deliberately published by a successful HertzBeat API envelope. */
export function monitorEditorBackendDiagnostic(error: unknown) {
  if (!isApiMessageError(error) || error.cause !== undefined || error.code === undefined) return undefined;
  const diagnostic = error.message.trim();
  return diagnostic || undefined;
}

function isApiMessageError(error: unknown): error is ApiMessageError {
  return error instanceof ApiMessageError || (error instanceof Error && error.name === 'ApiMessageError');
}

function classifyMonitorApiMessageFailure(error: ApiMessageError): MonitorEditorCommandFailureKind {
  const status = error.status;
  if (error.cause !== undefined || status === undefined || temporarilyUnavailableStatuses.has(status)) {
    return 'unavailable';
  }
  if (status === 401 || status === 403) return 'permission';
  if (status === 409) return 'conflict';
  if (status >= 500) return 'unavailable';
  if ((status >= 400 && status < 500) || error.code !== undefined) return 'validation';
  return 'error';
}
