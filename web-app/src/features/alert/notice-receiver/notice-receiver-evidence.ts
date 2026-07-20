/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { NoticeReceiverContractError } from './api/notice-receiver-schema';
import {
  expectedNoticeReceiverEvidence,
  type NoticeReceiver,
  type NoticeReceiverDraft,
  type NoticeReceiverMutation
} from './model/notice-receiver-model';
import type { NoticeReceiverNonMissingFailureKind } from './notice-receiver-failure';

export function requireExactNoticeReceiver(receiver: NoticeReceiver, id: number) {
  if (receiver.id !== id) throw new NoticeReceiverContractError('Notice receiver detail id mismatch');
  return receiver;
}

export function requireNoticeReceiverAbsent(records: NoticeReceiver[], id: number) {
  if (records.some(record => record.id === id)) {
    throw noticeReceiverRereadError('invalid', 'NOTICE_RECEIVER_DELETE_NOT_CONVERGED');
  }
}

export function requireNoticeReceiverConverged(receiver: NoticeReceiver, id: number, draft: NoticeReceiverDraft) {
  const expected = expectedNoticeReceiverEvidence(draft);
  if (
    receiver.id !== id ||
    receiver.name !== draft.name.trim() ||
    receiver.type !== draft.type ||
    !sameRecord(receiver.options, expected.options) ||
    !sameStrings(receiver.configuredSecrets, expected.configuredSecrets)
  ) {
    throw noticeReceiverRereadError('invalid', 'NOTICE_RECEIVER_REREAD_INVALID');
  }
  return receiver;
}

export function attachNoticeReceiverMutation(error: Error, mutation: NoticeReceiverMutation) {
  return Object.assign(error, { noticeReceiverMutation: mutation });
}

export function readNoticeReceiverMutation(error: unknown) {
  const mutation = (error as { noticeReceiverMutation?: NoticeReceiverMutation } | null)?.noticeReceiverMutation;
  if (!mutation || !Number.isSafeInteger(mutation.id) || mutation.id < 1) return undefined;
  if (mutation.status !== 'created' && mutation.status !== 'updated') return undefined;
  if (mutation.receiver?.id !== mutation.id) return undefined;
  return mutation;
}

export function noticeReceiverRereadError(
  kind: NoticeReceiverNonMissingFailureKind,
  code = `NOTICE_RECEIVER_LIST_REREAD_${kind.toUpperCase()}`
) {
  return Object.assign(new Error('Notice receiver list reread failed'), {
    statusCode: noticeReceiverRereadStatusCode(kind),
    code
  });
}

export function throwableNoticeReceiverError(error: unknown) {
  if (error instanceof Error) return error;
  return Object.assign(new Error('Notice receiver operation failed'), error && typeof error === 'object' ? error : {});
}

function sameRecord(actual: Record<string, unknown>, expected: Record<string, unknown>) {
  const keys = [...new Set([...Object.keys(actual), ...Object.keys(expected)])];
  return keys.every(key => actual[key] === expected[key]);
}

function sameStrings(actual: readonly string[], expected: readonly string[]) {
  const actualValues = new Set(actual);
  const expectedValues = new Set(expected);
  return (
    actualValues.size === actual.length &&
    expectedValues.size === expected.length &&
    actualValues.size === expectedValues.size &&
    actual.every(item => expectedValues.has(item))
  );
}

function noticeReceiverRereadStatusCode(kind: NoticeReceiverNonMissingFailureKind) {
  if (kind === 'unavailable') return 503;
  if (kind === 'invalid') return 422;
  return 500;
}
