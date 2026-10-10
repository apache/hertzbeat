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

import type { RefineHttpError } from './refine-http-error';

const unavailableTransportStatus = 0;
const requestTimeoutStatus = 408;
const clientErrorStatusFloor = 400;
const serverErrorStatusFloor = 500;

/** True only when source transport evidence says the request was unavailable. */
export function isRefineSourceUnavailable(reason: RefineHttpError) {
  if (reason.cause !== undefined || reason.kind === 'network') return true;
  return (
    reason.kind === 'http' &&
    (reason.httpStatus === undefined ||
      reason.httpStatus === unavailableTransportStatus ||
      reason.httpStatus >= serverErrorStatusFloor)
  );
}

/** True only when the originating HTTP write response proves a non-timeout client rejection. */
export function isDefiniteRefineWriteRejection(reason: RefineHttpError) {
  return (
    reason.cause === undefined &&
    reason.kind === 'http' &&
    reason.httpStatus !== undefined &&
    reason.httpStatus >= clientErrorStatusFloor &&
    reason.httpStatus < serverErrorStatusFloor &&
    reason.httpStatus !== requestTimeoutStatus
  );
}
