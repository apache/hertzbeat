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

import { AlertRequestFailure, type AlertFailureKind } from '../model/alert-model';

const unavailableHttpStatuses = new Set([0, 502, 503, 504]);

/** Converts Alert Center transport evidence into a redacted domain failure. */
export function normalizeAlertApiFailure(error: unknown) {
  if (!(error instanceof ApiMessageError)) return error;
  // Only missing/network/gateway evidence means the alert source is
  // unavailable. Other HTTP and envelope failures remain ordinary errors.
  const unavailable =
    error.cause !== undefined || error.status === undefined || unavailableHttpStatuses.has(error.status);
  const rejected =
    error.code !== undefined || (error.status !== undefined && error.status >= 400 && error.status < 500);
  const kind = alertFailureKind(error, unavailable);
  return new AlertRequestFailure(kind, rejected ? 'rejected' : 'uncertain');
}

function alertFailureKind(error: ApiMessageError, unavailable: boolean): AlertFailureKind {
  if (unavailable) return 'unavailable';
  if (error.status === 401 || error.status === 403) return 'permission';
  return 'error';
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
