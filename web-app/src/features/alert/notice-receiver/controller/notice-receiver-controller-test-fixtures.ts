/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { createNoticeReceiverDraft, type NoticeReceiverQuery } from '../model/notice-receiver-model';

export const persistedNoticeReceiver = {
  id: 7,
  name: 'Pager',
  type: 2 as const,
  typeKey: 'webhook',
  options: { hookAuthType: 'Bearer' as const },
  configuredSecrets: ['hookUrl' as const, 'hookAuthToken' as const],
  creator: null,
  modifier: null,
  gmtCreate: null,
  gmtUpdate: null
};

export const defaultNoticeReceiverQuery: NoticeReceiverQuery = { name: '', pageIndex: 0, pageSize: 8 };
export const adminNoticeActions = { canCreate: true, canEdit: true, canTest: true, canDelete: true };
export const userNoticeActions = { canCreate: true, canEdit: true, canTest: true, canDelete: false };
export const guestNoticeActions = { canCreate: false, canEdit: false, canTest: false, canDelete: false };

export function validNoticeReceiverDraft() {
  return {
    ...createNoticeReceiverDraft(),
    name: 'Pager',
    type: 2 as const,
    hookUrl: 'https://hooks.example.test/notice',
    hookAuthType: 'Bearer' as const,
    hookAuthToken: 'token'
  };
}

export function noticeReceiverListResult(records = [persistedNoticeReceiver], total = records.length) {
  return { data: { data: records, total }, isError: false as const };
}

export function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((done, fail) => {
    resolve = done;
    reject = fail;
  });
  return { promise, reject, resolve };
}
