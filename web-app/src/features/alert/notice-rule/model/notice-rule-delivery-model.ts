/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

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
