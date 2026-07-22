/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import type { NoticeReceiver, NoticeReceiverDraft } from './notice-receiver-model';
import type { NoticeReceiverNonMissingFailureKind } from './notice-receiver-failure';

export type NoticeReceiverCommand = 'saving' | 'removing' | 'testing';

export type NoticeReceiverWriteReceipt =
  | { kind: 'save'; phase: 'write' | 'proof' | 'projection'; draft: NoticeReceiverDraft; id?: number }
  | { kind: 'delete'; phase: 'write' | 'proof' | 'projection'; record: NoticeReceiver };

type NoticeReceiverTestReceipt = {
  kind: 'test';
  phase: 'delivery-uncertain';
  draft: NoticeReceiverDraft;
  failure: NoticeReceiverNonMissingFailureKind;
};

export type NoticeReceiverReceipt = NoticeReceiverWriteReceipt | NoticeReceiverTestReceipt;

export type NoticeReceiverRecovery = {
  kind: NoticeReceiverWriteReceipt['kind'];
  phase: 'proof' | 'projection' | 'commit-uncertain';
  retryable: boolean;
};

export type NoticeReceiverTestRecovery = Pick<NoticeReceiverTestReceipt, 'phase' | 'failure'>;
