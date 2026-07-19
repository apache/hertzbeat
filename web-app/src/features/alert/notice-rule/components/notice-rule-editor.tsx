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

import { Collapse, Modal } from 'antd';
import { useTranslation } from 'react-i18next';

import type { NoticeReceiverOption } from '../../notice-receiver/model/notice-receiver-model';
import type { NoticeTemplate } from '../../notice-template-model';
import type { NoticeRuleDraft } from '../model/notice-rule-model';
import { NoticeRuleAdvancedFields } from './notice-rule-advanced-fields';
import { NoticeRuleDeliveryFields } from './notice-rule-delivery-fields';
import styles from './notice-rule-editor.module.css';

export function NoticeRuleEditor({
  draft,
  receivers,
  templates,
  saving,
  dependenciesReady,
  selectReceivers,
  update,
  close,
  submit
}: {
  draft: NoticeRuleDraft;
  receivers: NoticeReceiverOption[];
  templates: NoticeTemplate[];
  saving: boolean;
  dependenciesReady: boolean;
  selectReceivers: (receiverIds: number[]) => void;
  update: (patch: Partial<NoticeRuleDraft>) => void;
  close: () => void;
  submit: () => void;
}) {
  const { t } = useTranslation();
  return (
    <Modal
      open
      width={780}
      maskClosable={false}
      title={t(draft.id ? 'noticeRules.edit' : 'noticeRules.new')}
      okText={t('common.save')}
      cancelText={t('common.cancel')}
      confirmLoading={saving}
      okButtonProps={{ disabled: !dependenciesReady }}
      onCancel={close}
      onOk={submit}
    >
      <div className={styles.form}>
        <NoticeRuleDeliveryFields
          draft={draft}
          receivers={receivers}
          templates={templates}
          selectReceivers={selectReceivers}
          update={update}
        />
        <Collapse
          className={styles.advanced ?? ''}
          ghost
          items={[
            {
              key: 'advanced',
              label: t('noticeRules.advanced'),
              children: <NoticeRuleAdvancedFields draft={draft} update={update} />
            }
          ]}
        />
      </div>
    </Modal>
  );
}
