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

import {
  canPerformNoticeAction,
  type NoticeActionCapabilities,
  type NoticeActionKind
} from '../../model/notice-action-capability-model';
import type { NoticeReceiverDraft } from '../model/notice-receiver-model';
import type { NoticeReceiverReceipt } from '../model/notice-receiver-operation-state';

export function canSubmitNoticeReceiver(capabilities: NoticeActionCapabilities, draft: NoticeReceiverDraft) {
  return draft.id === undefined ? capabilities.canCreate : capabilities.canEdit;
}

export function canRetryNoticeReceiver(
  capabilities: NoticeActionCapabilities,
  receipt: NoticeReceiverReceipt | undefined
) {
  return canPerformNoticeAction(capabilities, noticeReceiverReceiptAction(receipt));
}

export function noticeReceiverReceiptAction(receipt: NoticeReceiverReceipt | undefined): NoticeActionKind | undefined {
  if (receipt?.kind === 'save') return receipt.draft.id === undefined ? 'create' : 'edit';
  return receipt?.kind;
}
