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

export type RefineHttpErrorKind = 'contract' | 'envelope' | 'http' | 'network' | 'unexpected';
export type RefineHttpError = Error & HttpError & {
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
  const error = new Error(message) as RefineHttpError;
  error.name = 'RefineHttpError';
  error.statusCode = statusCode;
  error.code = code;
  error.httpStatus = httpStatus;
  error.kind = kind;
  return error;
}

export function toRefineHttpError(reason: unknown): RefineHttpError {
  if (isRefineHttpError(reason)) return reason;
  if (reason instanceof ApiMessageError) {
    if (reason.code !== undefined) {
      return createRefineHttpError('Server rejected the request', 400, reason.code, 'envelope', reason.status);
    }
    if (reason.status !== undefined) {
      return createRefineHttpError('Request failed', reason.status, undefined, 'http', reason.status);
    }
    return createRefineHttpError('Network request failed', 0, 'NETWORK_REQUEST_FAILED', 'network');
  }
  return createRefineHttpError('Unexpected request failure', 500, 'REFINE_UNEXPECTED_ERROR', 'unexpected');
}

function isRefineHttpError(reason: unknown): reason is RefineHttpError {
  return reason instanceof Error
    && reason.name === 'RefineHttpError'
    && typeof (reason as Partial<RefineHttpError>).statusCode === 'number';
}
