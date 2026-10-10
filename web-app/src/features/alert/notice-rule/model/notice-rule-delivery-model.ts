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

import type { NoticeReceiverOption } from '../../notice-receiver/model/notice-receiver-model';
import type { NoticeTemplate } from '../../model/notice-template-model';
import type { NoticeRuleDraft } from './notice-rule-model';

export function compatibleNoticeRuleTemplates(
  receiverIds: number[],
  receivers: NoticeReceiverOption[],
  templates: NoticeTemplate[]
) {
  const uniqueIds = new Set(receiverIds);
  const selectedReceivers = receiverIds
    .map(id => receivers.find(receiver => receiver.id === id))
    .filter((receiver): receiver is NoticeReceiverOption => receiver !== undefined);
  if (uniqueIds.size !== receiverIds.length || selectedReceivers.length !== receiverIds.length) return [];
  const selectedTypes = new Set(selectedReceivers.map(receiver => receiver.type));
  if (selectedTypes.size !== 1) return [];
  const [selectedType] = selectedTypes;
  return templates.filter(
    (template): template is NoticeTemplate & { id: number } =>
      !template.preset && template.id != null && template.type === selectedType
  );
}

export function noticeRuleReceiverPatch(
  draft: NoticeRuleDraft,
  receiverIds: number[],
  receivers: NoticeReceiverOption[],
  templates: NoticeTemplate[]
): Partial<NoticeRuleDraft> {
  if (draft.templateId == null) return { receiverIds };
  const compatibleIds = new Set(compatibleNoticeRuleTemplates(receiverIds, receivers, templates).map(item => item.id));
  if (compatibleIds.has(draft.templateId)) return { receiverIds };
  return { receiverIds, templateId: null, templateName: null };
}
