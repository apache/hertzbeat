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
