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

import type { NoticeTemplateRecovery } from '../model/notice-template-command-state';
import {
  canPerformNoticeTemplateAction,
  type NoticeTemplateActionCapabilities,
  type NoticeTemplateActionKind
} from '../model/notice-template-action-capability';
import {
  isNoticeTemplateReadOnly,
  type NoticeTemplateDraft,
  type NoticeTemplateResourceRecord
} from '../model/notice-template-model';

export function canSubmitNoticeTemplate(
  capabilities: NoticeTemplateActionCapabilities,
  draft: NoticeTemplateDraft | null
) {
  if (!draft) return false;
  return canPerformNoticeTemplateAction(capabilities, noticeTemplateDraftAction(draft));
}

export function noticeTemplateDraftAction(draft: NoticeTemplateDraft): NoticeTemplateActionKind {
  return draft.id === undefined ? 'create' : 'edit';
}

export function canEditNoticeTemplate(
  capabilities: NoticeTemplateActionCapabilities,
  template: NoticeTemplateResourceRecord
) {
  return capabilities.canEdit && !isNoticeTemplateReadOnly(template);
}

export function canDeleteNoticeTemplate(
  capabilities: NoticeTemplateActionCapabilities,
  template: NoticeTemplateResourceRecord
) {
  return capabilities.canDelete && !isNoticeTemplateReadOnly(template);
}

export function canRetryNoticeTemplateOperation(
  capabilities: NoticeTemplateActionCapabilities,
  recovery: NoticeTemplateRecovery | null
) {
  if (!recovery || recovery.stage === 'commit-uncertain') return false;
  return canRetainNoticeTemplateRecovery(capabilities, recovery);
}

export function canRetainNoticeTemplateRecovery(
  capabilities: NoticeTemplateActionCapabilities,
  recovery: NoticeTemplateRecovery | null
) {
  return canPerformNoticeTemplateAction(capabilities, noticeTemplateRecoveryAction(recovery));
}

export function noticeTemplateRecoveryAction(
  recovery: NoticeTemplateRecovery | null
): NoticeTemplateActionKind | undefined {
  switch (recovery?.stage) {
    case 'projection':
      return recovery.action;
    case 'update-proof':
      return 'edit';
    case 'delete-proof':
      return 'delete';
    case 'commit-uncertain':
      return 'create';
    default:
      return undefined;
  }
}
