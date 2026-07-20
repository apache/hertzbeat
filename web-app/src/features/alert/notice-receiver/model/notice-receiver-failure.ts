/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import type { NoticeReceiverMutation } from './notice-receiver-model';

export type NoticeReceiverFailureKind = 'missing' | 'invalid' | 'unavailable' | 'error';
export type NoticeReceiverNonMissingFailureKind = Exclude<NoticeReceiverFailureKind, 'missing'>;
export type NoticeReceiverWriteOutcome = 'rejected' | 'uncertain';

type NoticeReceiverFailureOptions = {
  code?: string;
  mutation?: NoticeReceiverMutation;
};

/** Redacted evidence crossing from transport or provider adapters into the Receiver domain. */
export class NoticeReceiverRequestFailure extends Error {
  readonly kind: NoticeReceiverFailureKind;
  readonly writeOutcome: NoticeReceiverWriteOutcome;
  readonly code: string | undefined;
  readonly mutation: NoticeReceiverMutation | undefined;

  constructor(
    kind: NoticeReceiverFailureKind,
    writeOutcome: NoticeReceiverWriteOutcome,
    options: NoticeReceiverFailureOptions = {}
  ) {
    super('Notice receiver request failed');
    this.name = 'NoticeReceiverRequestFailure';
    this.kind = kind;
    this.writeOutcome = writeOutcome;
    this.code = options.code;
    this.mutation = options.mutation;
  }
}

export function classifyNoticeReceiverDetailFailure(reason: unknown): NoticeReceiverFailureKind {
  return reason instanceof NoticeReceiverRequestFailure ? reason.kind : 'error';
}

export function classifyNoticeReceiverCollectionFailure(reason: unknown): NoticeReceiverNonMissingFailureKind {
  const kind = classifyNoticeReceiverDetailFailure(reason);
  return kind === 'missing' ? 'error' : kind;
}

export function classifyNoticeReceiverWriteFailure(reason: unknown): NoticeReceiverNonMissingFailureKind {
  return classifyNoticeReceiverCollectionFailure(reason);
}

export function isNoticeReceiverWriteRejection(reason: unknown) {
  return reason instanceof NoticeReceiverRequestFailure && reason.writeOutcome === 'rejected';
}

export function withNoticeReceiverMutation(failure: NoticeReceiverRequestFailure, mutation: NoticeReceiverMutation) {
  return new NoticeReceiverRequestFailure(failure.kind, 'uncertain', {
    ...(failure.code === undefined ? {} : { code: failure.code }),
    mutation
  });
}

export function readNoticeReceiverMutation(reason: unknown) {
  if (!(reason instanceof NoticeReceiverRequestFailure)) return undefined;
  const mutation = reason.mutation;
  if (!mutation || (mutation.status !== 'created' && mutation.status !== 'updated')) return undefined;
  return mutation.receiver?.id === mutation.id ? mutation : undefined;
}

export function noticeReceiverRereadError(
  kind: NoticeReceiverNonMissingFailureKind,
  code = `NOTICE_RECEIVER_LIST_REREAD_${kind.toUpperCase()}`
) {
  return new NoticeReceiverRequestFailure(kind, 'uncertain', { code });
}

export function throwableNoticeReceiverError(reason: unknown) {
  return reason instanceof NoticeReceiverRequestFailure
    ? reason
    : new NoticeReceiverRequestFailure('error', 'uncertain');
}
