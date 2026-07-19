/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { Input, Select, Switch } from 'antd';
import { useTranslation } from 'react-i18next';

import { receiverTypeDefinitions, type NoticeReceiverOption } from '../../notice-receiver/model/notice-receiver-model';
import type { NoticeTemplate } from '../../notice-template-model';
import { compatibleNoticeRuleTemplates } from '../model/notice-rule-delivery-model';
import type { NoticeRuleDraft } from '../model/notice-rule-model';
import styles from './notice-rule-editor.module.css';

function receiverLabel(receiver: NoticeReceiverOption, t: (key: string) => string) {
  const type = receiverTypeDefinitions.find(definition => definition.type === receiver.type);
  return `${receiver.name} · ${t(type?.labelKey ?? 'noticeReceivers.types.unknown')}`;
}

function templatePatch(templateId: number): Partial<NoticeRuleDraft> {
  if (templateId === -1) return { templateId: null, templateName: null };
  return { templateId, templateName: null };
}

export function NoticeRuleDeliveryFields({
  draft,
  receivers,
  templates,
  selectReceivers,
  update
}: {
  draft: NoticeRuleDraft;
  receivers: NoticeReceiverOption[];
  templates: NoticeTemplate[];
  selectReceivers: (receiverIds: number[]) => void;
  update: (patch: Partial<NoticeRuleDraft>) => void;
}) {
  const { t } = useTranslation();
  const compatibleTemplates = compatibleNoticeRuleTemplates(draft.receiverIds, receivers, templates);
  return (
    <>
      <label className={styles.field}>
        {t('noticeRules.name')}
        <Input maxLength={100} value={draft.name} onChange={event => update({ name: event.target.value })} />
      </label>
      <label className={styles.switchField}>
        <span>{t('noticeRules.enabled')}</span>
        <Switch checked={draft.enable} onChange={enable => update({ enable })} />
      </label>
      <label className={styles.wideField}>
        {t('noticeRules.receivers')}
        <Select
          mode="multiple"
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
