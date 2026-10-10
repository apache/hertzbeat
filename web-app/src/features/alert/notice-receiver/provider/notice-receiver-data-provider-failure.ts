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

import { isRefineHttpError, type RefineHttpError } from '@/shared/refine/refine-http-error';
import { isDefiniteRefineWriteRejection, isRefineSourceUnavailable } from '@/shared/refine/refine-source-evidence';

import { normalizeNoticeReceiverApiFailure, type NoticeReceiverRequestPhase } from '../api/notice-receiver-api-failure';
import {
  NoticeReceiverRequestFailure,
  type NoticeReceiverFailureKind,
  type NoticeReceiverWriteOutcome
} from '../model/notice-receiver-failure';

type NoticeReceiverProviderPhase = Exclude<NoticeReceiverRequestPhase, 'command'>;

export function normalizeNoticeReceiverProviderFailure(reason: unknown, phase: NoticeReceiverProviderPhase) {
  if (reason instanceof NoticeReceiverRequestFailure) {
    return normalizeNoticeReceiverApiFailure(reason, phase);
  }
  if (isRefineHttpError(reason)) return adaptRefineFailure(reason, phase);
  return normalizeNoticeReceiverApiFailure(reason, phase);
}

/** Converts only locally parsed write input failures into safe rejection evidence. */
export function readNoticeReceiverWriteInput<T>(read: () => T): T {
  try {
    return read();
  } catch (reason) {
    if (isRefineHttpError(reason)) {
      const code = stableReceiverCode(reason.code);
      if (reason.cause === undefined && reason.kind === 'contract' && code !== undefined) {
        throw new NoticeReceiverRequestFailure('invalid', 'rejected', { code });
      }
    }
    throw reason;
  }
}

function adaptRefineFailure(reason: RefineHttpError, phase: NoticeReceiverProviderPhase) {
  const kind = refineFailureKind(reason, phase);
  const outcome = refineWriteOutcome(reason, phase);
  const code = stableReceiverCode(reason.code);
  return code === undefined
    ? new NoticeReceiverRequestFailure(kind, outcome)
    : new NoticeReceiverRequestFailure(kind, outcome, { code });
}

function refineFailureKind(reason: RefineHttpError, phase: NoticeReceiverProviderPhase): NoticeReceiverFailureKind {
  if (isRefineSourceUnavailable(reason)) return 'unavailable';
  if (phase === 'detail' && reason.kind === 'http' && reason.httpStatus === 404) return 'missing';
  if (typeof reason.code === 'string' && reason.code.startsWith('NOTICE_RECEIVER_')) return 'invalid';
  return 'error';
}

function refineWriteOutcome(reason: RefineHttpError, phase: NoticeReceiverProviderPhase): NoticeReceiverWriteOutcome {
  // `statusCode` is presentation metadata. Only the originating HTTP write
  // status can establish a rejection, and a timeout may still have committed.
  if (phase !== 'write') return 'uncertain';
  return isDefiniteRefineWriteRejection(reason) ? 'rejected' : 'uncertain';
}

function stableReceiverCode(code: string | number | undefined) {
  return typeof code === 'string' && code.startsWith('NOTICE_RECEIVER_') ? code : undefined;
}
