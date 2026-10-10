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
import { apiMessageWriteOutcome } from '@/core/http/api-message-write-evidence';

import { AlertInhibitRequestFailure, type AlertInhibitFailure } from '../model/alert-inhibit-model';

const unavailableStatuses = new Set([0, 502, 503, 504]);

/** Converts transport evidence once, before it can escape the Alert Inhibit API. */
export function normalizeAlertInhibitApiFailure(error: unknown) {
  if (!(error instanceof ApiMessageError)) return error;
  return new AlertInhibitRequestFailure(readFailureKind(error), apiMessageWriteOutcome(error));
}

/** Runs one transport operation behind the Alert Inhibit domain boundary. */
export async function alertInhibitApiRequest<T>(operation: () => Promise<T>, signal?: AbortSignal): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    // Caller cancellation retires query ownership; it is not availability evidence.
    if (signal?.aborted) throw new DOMException('Request aborted', 'AbortError');
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
