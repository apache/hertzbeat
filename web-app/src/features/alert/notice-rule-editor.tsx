/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { Checkbox, Collapse, Input, Modal, Select, Switch, TimePicker } from 'antd';
import dayjs from 'dayjs';
import { useTranslation } from 'react-i18next';

import { receiverTypeDefinitions, type NoticeReceiverOption } from './notice-receiver/model/notice-receiver-model';
import {
  compatibleNoticeRuleTemplates,
  noticeRuleWeekdays,
  type NoticeRuleDraft
} from './notice-rule-model';
import type { NoticeTemplate } from './notice-template-model';
import styles from './notice-rule-editor.module.css';

function timeValue(value: string) {
  if (!value) return null;
  const [hours, minutes] = value.split(':').map(Number);
  return dayjs().hour(hours!).minute(minutes!).second(0).millisecond(0);
}

function receiverLabel(receiver: NoticeReceiverOption, t: (key: string) => string) {
  const type = receiverTypeDefinitions.find(definition => definition.type === receiver.type);
  return `${receiver.name} · ${t(type?.labelKey ?? 'noticeReceivers.types.unknown')}`;
}

function NoticeRuleAdvancedFields({ draft, update }: {
  draft: NoticeRuleDraft;
  update: (patch: Partial<NoticeRuleDraft>) => void;
}) {
  const { t } = useTranslation();
  return (
    <div className={styles.advancedFields}>
      <label className={styles.switchField}>
        <span>{t('noticeRules.forwardAll')}</span>
        <Switch checked={draft.filterAll} onChange={filterAll => update({ filterAll })} />
      </label>
      {!draft.filterAll && (
        <label className={styles.wideField}>
          {t('noticeRules.labels')}
          <Input.TextArea rows={2} value={draft.labelsText} placeholder={t('noticeRules.labelsPlaceholder')} onChange={event => update({ labelsText: event.target.value })} />
          <span className={styles.hint}>{t('noticeRules.labelsHelp')}</span>
        </label>
      )}
      <label className={styles.switchField}>
        <span>{t('noticeRules.limitDays')}</span>
        <Switch checked={draft.limitDays} onChange={limitDays => update({ limitDays, ...(limitDays ? {} : { days: [1, 2, 3, 4, 5, 6, 7] }) })} />
      </label>
      {draft.limitDays && (
        <label className={styles.wideField}>
          {t('noticeRules.days')}
          <Checkbox.Group
            value={draft.days}
            options={noticeRuleWeekdays.map(day => ({ value: day, label: t(`noticeRules.week.${day}`) }))}
            onChange={days => update({ days })}
          />
        </label>
      )}
      <label className={styles.field}>
        {t('noticeRules.periodStart')}
        <TimePicker allowClear format="HH:mm" minuteStep={5} value={timeValue(draft.periodStart)} onChange={value => update({ periodStart: value?.format('HH:mm') ?? '' })} />
      </label>
      <label className={styles.field}>
        {t('noticeRules.periodEnd')}
        <TimePicker allowClear format="HH:mm" minuteStep={5} value={timeValue(draft.periodEnd)} onChange={value => update({ periodEnd: value?.format('HH:mm') ?? '' })} />
      </label>
      <span className={styles.hint}>{t('noticeRules.periodHelp')}</span>
    </div>
  );
}

export function NoticeRuleEditor({ draft, receivers, templates, saving, update, close, submit }: {
  draft: NoticeRuleDraft;
  receivers: NoticeReceiverOption[];
  templates: NoticeTemplate[];
  saving: boolean;
  update: (patch: Partial<NoticeRuleDraft>) => void;
  close: () => void;
  submit: () => void;
}) {
  const { t } = useTranslation();
  const compatibleTemplates = compatibleNoticeRuleTemplates(draft.receiverIds, receivers, templates);
  const selectReceivers = (receiverIds: number[]) => {
    const compatibleIds = new Set(compatibleNoticeRuleTemplates(receiverIds, receivers, templates).map(template => template.id));
    update({ receiverIds, ...(draft.templateId != null && !compatibleIds.has(draft.templateId) ? { templateId: null, templateName: null } : {}) });
  };
  return (
    <Modal open width={780} maskClosable={false} title={t(draft.id ? 'noticeRules.edit' : 'noticeRules.new')} okText={t('common.save')} cancelText={t('common.cancel')} confirmLoading={saving} onCancel={close} onOk={submit}>
      <div className={styles.form}>
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
          <Select mode="multiple" showSearch optionFilterProp="label" value={draft.receiverIds} options={receivers.map(receiver => ({ value: receiver.id, label: receiverLabel(receiver, t) }))} onChange={selectReceivers} />
        </label>
        <label className={styles.wideField}>
          {t('noticeRules.template')}
          <Select
            showSearch
            optionFilterProp="label"
            value={draft.templateId ?? -1}
            options={[{ value: -1, label: t('noticeRules.defaultTemplate') }, ...compatibleTemplates.map(template => ({ value: template.id!, label: template.name }))]}
            onChange={templateId => update({ templateId: templateId === -1 ? null : templateId, templateName: null })}
          />
          <span className={styles.hint}>{compatibleTemplates.length === 0 ? t('noticeRules.templateHelp') : t('noticeRules.templateCompatible')}</span>
        </label>
        <Collapse className={styles.advanced ?? ''} ghost items={[{ key: 'advanced', label: t('noticeRules.advanced'), children: <NoticeRuleAdvancedFields draft={draft} update={update} /> }]} />
      </div>
    </Modal>
  );
}
