/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import type { NoticeReceiver, NoticeReceiverDraft } from './notice-receiver-model';

export type NoticeReceiverCommand = 'saving' | 'removing' | 'testing';

export type NoticeReceiverReceipt =
  | { kind: 'save'; phase: 'write' | 'proof' | 'projection'; draft: NoticeReceiverDraft; id?: number }
  | { kind: 'delete'; phase: 'write' | 'proof' | 'projection'; record: NoticeReceiver };

export type NoticeReceiverRecovery = {
  kind: NoticeReceiverReceipt['kind'];
  phase: 'proof' | 'projection' | 'commit-uncertain';
  retryable: boolean;
};
