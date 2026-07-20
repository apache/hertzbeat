/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

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
