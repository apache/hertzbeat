/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { describe, expect, expectTypeOf, it } from 'vitest';

import type {
  NoticeReceiverFailureKind,
  NoticeReceiverNonMissingFailureKind
} from './model/notice-receiver-failure-kind';
import {
  classifyNoticeReceiverCollectionFailure,
  classifyNoticeReceiverDetailFailure,
  classifyNoticeReceiverWriteFailure
} from './notice-receiver-failure';
import { noticeReceiverRereadError } from './notice-receiver-evidence';

describe('notice receiver failure phases', () => {
  it.each([
    ['unavailable', 503],
    ['invalid', 422],
    ['error', 500]
  ] as const)('maps %s reread failures to status %s', (kind, expectedStatus) => {
    expect(noticeReceiverRereadError(kind).statusCode).toBe(expectedStatus);
  });

  it.each([undefined, null])('classifies an absent reason safely as error: %s', reason => {
    expect(classifyNoticeReceiverDetailFailure(reason)).toBe('error');
    expect(classifyNoticeReceiverCollectionFailure(reason)).toBe('error');
    expect(classifyNoticeReceiverWriteFailure(reason)).toBe('error');
  });

  it('allows missing only for detail reads', () => {
    const missing = { statusCode: 404, code: 'NOTICE_RECEIVER_MISSING' };
    expect(classifyNoticeReceiverDetailFailure(missing)).toBe('missing');
    expect(classifyNoticeReceiverCollectionFailure(missing)).toBe('error');
    expect(classifyNoticeReceiverWriteFailure(missing)).toBe('error');
    expectTypeOf(classifyNoticeReceiverDetailFailure).returns.toEqualTypeOf<NoticeReceiverFailureKind>();
    expectTypeOf(classifyNoticeReceiverCollectionFailure).returns.toEqualTypeOf<NoticeReceiverNonMissingFailureKind>();
    expectTypeOf(classifyNoticeReceiverWriteFailure).returns.toEqualTypeOf<NoticeReceiverNonMissingFailureKind>();
  });

  it('does not infer missing from a mutable English message', () => {
    expect(classifyNoticeReceiverDetailFailure({ status: 200, message: 'Receiver missing' })).toBe('error');
  });

  it('preserves named receiver contract failures as invalid in non-detail phases', () => {
    const contract = { statusCode: 422, code: 'NOTICE_RECEIVER_LIST_REREAD_INVALID' };
    expect(classifyNoticeReceiverCollectionFailure(contract)).toBe('invalid');
    expect(classifyNoticeReceiverWriteFailure(contract)).toBe('invalid');
  });
});
