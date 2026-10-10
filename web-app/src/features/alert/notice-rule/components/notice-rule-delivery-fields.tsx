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

import { Input, Select, Switch } from 'antd';
import { useTranslation } from 'react-i18next';

import { receiverTypeDefinitions, type NoticeReceiverOption } from '../../notice-receiver/model/notice-receiver-model';
import type { NoticeTemplate } from '../../model/notice-template-model';
import { compatibleNoticeRuleTemplates } from '../model/notice-rule-delivery-model';
import type { NoticeRuleDraft } from '../model/notice-rule-model';
import styles from './notice-rule-editor.module.css';

type NoticeRuleDeliveryFieldsProps = {
  draft: NoticeRuleDraft;
  receivers: NoticeReceiverOption[];
  templates: NoticeTemplate[];
  selectReceivers: (receiverIds: number[]) => void;
  update: (patch: Partial<NoticeRuleDraft>) => void;
  disabled: boolean;
};

function receiverLabel(receiver: NoticeReceiverOption, t: (key: string) => string) {
  const type = receiverTypeDefinitions.find(definition => definition.type === receiver.type);
  return `${receiver.name} · ${t(type?.labelKey ?? 'noticeReceivers.types.unknown')}`;
}

function templatePatch(templateId: number): Partial<NoticeRuleDraft> {
  if (templateId === -1) return { templateId: null, templateName: null };
  return { templateId, templateName: null };
}

export function NoticeRuleDeliveryFields(props: NoticeRuleDeliveryFieldsProps) {
  return (
    <>
      <NoticeRuleIdentityFields {...props} />
      <NoticeRuleTargetFields {...props} />
    </>
  );
}

function NoticeRuleIdentityFields({ draft, update, disabled }: NoticeRuleDeliveryFieldsProps) {
  const { t } = useTranslation();
  return (
    <>
      <label className={styles.field}>
        {t('noticeRules.name')}
        <Input
          disabled={disabled}
          maxLength={100}
          value={draft.name}
          onChange={event => update({ name: event.target.value })}
        />
      </label>
      <label className={styles.switchField}>
        <span>{t('noticeRules.enabled')}</span>
        <Switch disabled={disabled} checked={draft.enable} onChange={enable => update({ enable })} />
      </label>
    </>
  );
}

function NoticeRuleTargetFields({
  draft,
  receivers,
  templates,
  selectReceivers,
  update,
  disabled
}: NoticeRuleDeliveryFieldsProps) {
  const { t } = useTranslation();
  const compatibleTemplates = compatibleNoticeRuleTemplates(draft.receiverIds, receivers, templates);
  return (
    <>
      <label className={styles.wideField}>
        {t('noticeRules.receivers')}
        <Select
          mode="multiple"
          disabled={disabled}
          showSearch
          optionFilterProp="label"
          value={draft.receiverIds}
          options={receivers.map(receiver => ({ value: receiver.id, label: receiverLabel(receiver, t) }))}
          onChange={selectReceivers}
        />
      </label>
      <label className={styles.wideField}>
        {t('noticeRules.template')}
        <Select
          disabled={disabled}
          showSearch
          optionFilterProp="label"
          value={draft.templateId ?? -1}
          options={[
            { value: -1, label: t('noticeRules.defaultTemplate') },
            ...compatibleTemplates.map(template => ({ value: template.id, label: template.name }))
          ]}
          onChange={templateId => update(templatePatch(templateId))}
        />
        <span className={styles.hint}>
          {compatibleTemplates.length === 0 ? t('noticeRules.templateHelp') : t('noticeRules.templateCompatible')}
        </span>
      </label>
    </>
  );
}
