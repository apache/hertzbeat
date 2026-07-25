/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { ApiMessageError, apiMessagePostForm } from '@/core/http/api-message';

import { validateMonitorImportFile, type MonitorImportFailureKind } from '../model/monitor-import-model';

const monitorImportEndpoint = '/api/monitors/import';
const unavailableStatuses = new Set([0, 502, 503, 504]);

export class MonitorImportError extends Error {
  constructor(readonly kind: MonitorImportFailureKind) {
    super('Monitor import failed');
    this.name = 'MonitorImportError';
  }
}

export async function importMonitorConfig(file: File, signal?: AbortSignal) {
  if (!validateMonitorImportFile(file).valid) throw new MonitorImportError('validation');
  const form = new FormData();
  form.append('file', file);
  try {
    await apiMessagePostForm(monitorImportEndpoint, form, signal ? { signal } : {});
  } catch (error) {
    throw normalizeMonitorImportError(error);
  }
}

function normalizeMonitorImportError(error: unknown) {
  if (error instanceof MonitorImportError) return error;
  if (!isApiMessageError(error)) return new MonitorImportError('error');
  if (error.status === 401 || error.status === 403) return new MonitorImportError('forbidden');
  if (error.status === 400 || error.status === 422) return new MonitorImportError('validation');
  if (isUnavailable(error)) return new MonitorImportError('unavailable');
  return new MonitorImportError('error');
}

function isUnavailable(error: ApiMessageError) {
  return error.cause !== undefined || error.status === undefined || unavailableStatuses.has(error.status);
}

function isApiMessageError(error: unknown): error is ApiMessageError {
  // HTTP errors may cross a separately bundled boundary. Match only the
  // stable discriminator fields and never inspect or expose the response body.
  return (
    error instanceof ApiMessageError ||
    (error instanceof Error &&
      error.name === 'ApiMessageError' &&
      'status' in error &&
      'code' in error &&
      'cause' in error)
  );
}
