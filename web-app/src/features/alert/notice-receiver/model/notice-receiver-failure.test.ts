/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { describe, expect, expectTypeOf, it } from 'vitest';

import type { NoticeReceiverMutation } from './notice-receiver-model';
import {
  NoticeReceiverRequestFailure,
  classifyNoticeReceiverCollectionFailure,
  classifyNoticeReceiverDetailFailure,
  classifyNoticeReceiverWriteFailure,
  isNoticeReceiverWriteRejection,
  noticeReceiverRereadError,
  readNoticeReceiverMutation,
  throwableNoticeReceiverError,
  withNoticeReceiverMutation,
  type NoticeReceiverFailureKind,
  type NoticeReceiverNonMissingFailureKind
} from './notice-receiver-failure';

const mutation: NoticeReceiverMutation = {
  id: 7,
  status: 'updated',
  receiver: {
    id: 7,
    name: 'Pager',
    type: 1,
    typeKey: 'email',
    options: { email: 'ops@example.test' },
    configuredSecrets: [],
    creator: null,
    modifier: null,
    gmtCreate: null,
    gmtUpdate: null
  }
};

describe('Notice Receiver domain failure', () => {
  it('allows missing only for detail reads', () => {
    const missing = new NoticeReceiverRequestFailure('missing', 'rejected');
    expect(classifyNoticeReceiverDetailFailure(missing)).toBe('missing');
    expect(classifyNoticeReceiverCollectionFailure(missing)).toBe('error');
    expect(classifyNoticeReceiverWriteFailure(missing)).toBe('error');
    expectTypeOf(classifyNoticeReceiverDetailFailure).returns.toEqualTypeOf<NoticeReceiverFailureKind>();
    expectTypeOf(classifyNoticeReceiverCollectionFailure).returns.toEqualTypeOf<NoticeReceiverNonMissingFailureKind>();
    expectTypeOf(classifyNoticeReceiverWriteFailure).returns.toEqualTypeOf<NoticeReceiverNonMissingFailureKind>();
  });

  it('keeps contract, unavailable, and unknown failures distinct without reading arbitrary fields', () => {
    expect(classifyNoticeReceiverDetailFailure(new NoticeReceiverRequestFailure('invalid', 'uncertain'))).toBe(
      'invalid'
    );
    expect(classifyNoticeReceiverDetailFailure(new NoticeReceiverRequestFailure('unavailable', 'uncertain'))).toBe(
      'unavailable'
    );
    expect(classifyNoticeReceiverDetailFailure({ statusCode: 404, code: 'NOTICE_RECEIVER_MISSING' })).toBe('error');
    expect(classifyNoticeReceiverDetailFailure(undefined)).toBe('error');
  });

  it('admits only explicit rejected outcomes as safe write rejection', () => {
    expect(isNoticeReceiverWriteRejection(new NoticeReceiverRequestFailure('error', 'rejected'))).toBe(true);
    for (const reason of [
      new NoticeReceiverRequestFailure('invalid', 'uncertain'),
      new NoticeReceiverRequestFailure('unavailable', 'uncertain'),
      new NoticeReceiverRequestFailure('error', 'uncertain'),
      new Error('unknown'),
      { statusCode: 400 }
    ]) {
      expect(isNoticeReceiverWriteRejection(reason)).toBe(false);
    }
  });

  it('carries mutation evidence only through the typed domain error', () => {
    const failure = withNoticeReceiverMutation(
      new NoticeReceiverRequestFailure('unavailable', 'uncertain', { code: 'NETWORK_REQUEST_FAILED' }),
      mutation
    );
    expect(readNoticeReceiverMutation(failure)).toBe(mutation);
    expect(readNoticeReceiverMutation({ noticeReceiverMutation: mutation })).toBeUndefined();
    expect(failure).not.toHaveProperty('statusCode');
  });

  it('does not treat deleted or crossed mutation evidence as an acknowledged save', () => {
    const deleted: NoticeReceiverMutation = { id: 7, status: 'deleted', receiver: null };
    const crossed: NoticeReceiverMutation = {
      ...mutation,
      receiver: { ...mutation.receiver!, id: 8 }
    };

    expect(
      readNoticeReceiverMutation(
        withNoticeReceiverMutation(new NoticeReceiverRequestFailure('error', 'uncertain'), deleted)
      )
    ).toBeUndefined();
    expect(
      readNoticeReceiverMutation(
        withNoticeReceiverMutation(new NoticeReceiverRequestFailure('error', 'uncertain'), crossed)
      )
    ).toBeUndefined();
  });

  it('creates typed reread and throwable failures without copying arbitrary properties', () => {
    const reread = noticeReceiverRereadError('invalid', 'NOTICE_RECEIVER_REREAD_INVALID');
    expect(reread).toMatchObject({
      kind: 'invalid',
      writeOutcome: 'uncertain',
      code: 'NOTICE_RECEIVER_REREAD_INVALID'
    });
    expect(reread).not.toHaveProperty('statusCode');

    const throwable = throwableNoticeReceiverError({
      statusCode: 404,
      code: 'NOTICE_RECEIVER_MISSING',
      privateBody: 'secret'
    });
    expect(throwable).toMatchObject({ kind: 'error', writeOutcome: 'uncertain' });
    expect(throwable).not.toHaveProperty('statusCode');
    expect(throwable).not.toHaveProperty('privateBody');
  });
});
