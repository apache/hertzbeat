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

export type NoticeTemplateFailureKind = 'missing' | 'invalid' | 'unavailable' | 'error';
export type NoticeTemplateNonMissingFailureKind = Exclude<NoticeTemplateFailureKind, 'missing'>;
export type NoticeTemplateWriteOutcome = 'rejected' | 'uncertain';

type NoticeTemplateFailureOptions = { code?: string };

/** Redacted request evidence shared by the API, provider, and controllers. */
export class NoticeTemplateRequestFailure extends Error {
  readonly kind: NoticeTemplateFailureKind;
  readonly writeOutcome: NoticeTemplateWriteOutcome;
  readonly code: string | undefined;

  constructor(
    kind: NoticeTemplateFailureKind,
    writeOutcome: NoticeTemplateWriteOutcome,
    options: NoticeTemplateFailureOptions = {}
  ) {
    super('Notice Template request failed');
    this.name = 'NoticeTemplateRequestFailure';
    this.kind = kind;
    this.writeOutcome = writeOutcome;
    this.code = options.code;
  }
}

export function classifyNoticeTemplateDetailFailure(reason: unknown): NoticeTemplateFailureKind {
  return reason instanceof NoticeTemplateRequestFailure ? reason.kind : 'error';
}

export function classifyNoticeTemplateCollectionFailure(reason: unknown): NoticeTemplateNonMissingFailureKind {
  const kind = classifyNoticeTemplateDetailFailure(reason);
  return kind === 'missing' ? 'error' : kind;
}

export function isNoticeTemplateWriteRejection(reason: unknown) {
  return reason instanceof NoticeTemplateRequestFailure && reason.writeOutcome === 'rejected';
}

/** Returns collection-safe evidence, where exact-detail `missing` cannot escape. */
export function normalizeNoticeTemplateCollectionFailure(reason: unknown) {
  if (reason instanceof NoticeTemplateRequestFailure && reason.kind !== 'missing') return reason;
  const outcome = reason instanceof NoticeTemplateRequestFailure ? reason.writeOutcome : 'uncertain';
  return new NoticeTemplateRequestFailure('error', outcome);
}
