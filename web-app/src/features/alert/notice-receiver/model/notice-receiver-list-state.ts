/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import type { RemotePayloadState } from '@/shared/remote-state';

import type { NoticeReceiverNonMissingFailureKind } from './notice-receiver-failure';
import type { NoticeReceiver } from './notice-receiver-model';

export type NoticeReceiverListState = RemotePayloadState<
  { records: NoticeReceiver[]; total: number },
  NoticeReceiverNonMissingFailureKind
>;
