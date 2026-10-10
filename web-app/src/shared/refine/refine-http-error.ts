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

import type { HttpError } from '@refinedev/core';

import { ApiMessageError } from '@/core/http/api-message';
import { hasOwnProperties } from '@/shared/validation/own-properties';

const refineHttpErrorKinds = ['contract', 'envelope', 'http', 'network', 'unexpected'] as const;
export type RefineHttpErrorKind = (typeof refineHttpErrorKinds)[number];
export type RefineHttpError = Error &
  HttpError & {
    code: number | string | undefined;
    httpStatus: number | undefined;
    kind: RefineHttpErrorKind;
  };

export function createRefineHttpError(
  message: string,
  statusCode: number,
  code?: number | string,
  kind: RefineHttpErrorKind = 'contract',
  httpStatus?: number
): RefineHttpError {
  return Object.assign(new Error(message), {
    name: 'RefineHttpError',
    statusCode,
    code,
    httpStatus,
    kind
  });
}

export function toRefineHttpError(reason: unknown): RefineHttpError {
  if (isRefineHttpError(reason)) return reason;
  if (reason instanceof ApiMessageError) {
    if (reason.cause !== undefined) return networkRequestFailure();
    if (reason.code !== undefined) {
      return createRefineHttpError('Server rejected the request', 400, reason.code, 'envelope', reason.status);
    }
    if (reason.status !== undefined) {
      return createRefineHttpError('Request failed', reason.status, undefined, 'http', reason.status);
    }
    return networkRequestFailure();
  }
  return createRefineHttpError('Unexpected request failure', 500, 'REFINE_UNEXPECTED_ERROR', 'unexpected');
}

function networkRequestFailure() {
  return createRefineHttpError('Network request failed', 0, 'NETWORK_REQUEST_FAILED', 'network');
}

export function isRefineHttpError(reason: unknown): reason is RefineHttpError {
  return (
    reason instanceof Error &&
    reason.name === 'RefineHttpError' &&
    hasOwnProperties(reason, ['statusCode', 'code', 'httpStatus', 'kind']) &&
    isStatusCode(reason.statusCode) &&
    isErrorCode(reason.code) &&
    (reason.httpStatus === undefined || isStatusCode(reason.httpStatus)) &&
    refineHttpErrorKinds.some(kind => kind === reason.kind)
  );
}

function isStatusCode(value: unknown): value is number {
  return Number.isSafeInteger(value) && Number(value) >= 0;
}

function isErrorCode(value: unknown): value is number | string | undefined {
  return value === undefined || typeof value === 'number' || typeof value === 'string';
}
