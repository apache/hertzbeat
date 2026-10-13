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
  canPerformNoticeRuleAction,
  type NoticeRuleActionCapabilities,
  type NoticeRuleActionKind
} from '../model/notice-rule-action-capability';
import type { NoticeRuleDraft } from '../model/notice-rule-model';
import type { NoticeRuleOperationReceipt } from '../model/notice-rule-operation-state';

export function canPersistNoticeRule(
  capabilities: NoticeRuleActionCapabilities,
  draft: Pick<NoticeRuleDraft, 'id'> | null
) {
  if (!draft) return false;
  return canPerformNoticeRuleAction(capabilities, draft.id === undefined ? 'create' : 'edit');
}

export function canPerformRetainedNoticeRuleAction(
  capabilities: NoticeRuleActionCapabilities,
  receipt: Pick<NoticeRuleOperationReceipt, 'kind'> | undefined
) {
  return canPerformNoticeRuleAction(capabilities, retainedAction(receipt));
}

function retainedAction(
  receipt: Pick<NoticeRuleOperationReceipt, 'kind'> | undefined
): NoticeRuleActionKind | undefined {
  if (receipt?.kind === 'update') return 'edit';
  return receipt?.kind;
}
