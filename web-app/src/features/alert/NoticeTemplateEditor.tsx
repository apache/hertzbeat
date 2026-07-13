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

import { Input, Modal, Select } from 'antd';
import { useTranslation } from 'react-i18next';

import { receiverTypeDefinitions, type NoticeReceiverType } from './notice-receiver-model';
import type { NoticeTemplateDraft } from './notice-template-model';
import styles from './NoticeTemplateEditor.module.css';

export function NoticeTemplateEditor({ draft, saving, update, close, submit }: {
  draft: NoticeTemplateDraft;
  saving: boolean;
  update: (patch: Partial<NoticeTemplateDraft>) => void;
  close: () => void;
  submit: () => void;
}) {
  const { t } = useTranslation();
  return (
    <Modal open width={820} maskClosable={false} title={t(draft.id ? 'noticeTemplates.edit' : 'noticeTemplates.new')} okText={t('common.save')} cancelText={t('common.cancel')} confirmLoading={saving} onCancel={close} onOk={submit}>
      <div className={styles.form}>
        <label className={styles.field}>
          {t('noticeTemplates.name')}
          <Input maxLength={100} value={draft.name} onChange={event => update({ name: event.target.value })} />
        </label>
        <label className={styles.field}>
          {t('noticeTemplates.type')}
          <Select
            showSearch
            optionFilterProp="label"
            value={draft.type}
            options={receiverTypeDefinitions.map(item => ({ value: item.type, label: t(item.labelKey) }))}
            onChange={(type: NoticeReceiverType) => update({ type })}
          />
        </label>
        <label className={`${styles.field} ${styles.content}`}>
          {t('noticeTemplates.content')}
          <Input.TextArea rows={16} maxLength={60_000} showCount value={draft.content} onChange={event => update({ content: event.target.value })} />
        </label>
      </div>
    </Modal>
  );
}
