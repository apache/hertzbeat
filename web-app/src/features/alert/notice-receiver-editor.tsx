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

import { Button, Input, InputNumber, Modal, Select } from 'antd';
import { useTranslation } from 'react-i18next';

import {
  receiverTypeDefinitions,
  type NoticeReceiverDraft,
  type NoticeReceiverType,
  type ReceiverFieldDefinition,
  type WebHookAuthType
} from './notice-receiver-model';
import styles from './notice-receiver-editor.module.css';

function fieldIsVisible(field: ReceiverFieldDefinition, draft: NoticeReceiverDraft) {
  if (field.key === 'hookAuthToken') return draft.hookAuthType !== 'None';
  if (draft.type !== 14) return true;
  if (field.key === 'userId') return draft.larkReceiveType === 0 || draft.larkReceiveType === 1;
  if (field.key === 'chatId') return draft.larkReceiveType === 1;
  if (field.key === 'partyId') return draft.larkReceiveType === 2;
  return true;
}

function ReceiverField({ definition, draft, update }: {
  definition: ReceiverFieldDefinition;
  draft: NoticeReceiverDraft;
  update: (patch: Partial<NoticeReceiverDraft>) => void;
}) {
  const { t } = useTranslation();
  if (!fieldIsVisible(definition, draft)) return null;
  const value = draft[definition.key];
  let control;
  if (definition.kind === 'webhookAuth') {
    control = <Select value={draft.hookAuthType} options={['None', 'Basic', 'Bearer'].map(item => ({ value: item, label: item }))} onChange={(hookAuthType: WebHookAuthType) => update({ hookAuthType })} />;
  } else if (definition.kind === 'larkReceiveType') {
    control = <Select value={draft.larkReceiveType} options={[0, 1, 2, 3].map(item => ({ value: item, label: t(`noticeReceivers.larkReceiveTypes.${item}`) }))} onChange={larkReceiveType => update({ larkReceiveType })} />;
  } else if (definition.kind === 'number') {
    control = <InputNumber min={0} value={typeof value === 'number' ? value : null} onChange={agentId => update({ agentId })} />;
  } else if (definition.kind === 'password') {
    control = <Input.Password autoComplete="new-password" value={String(value ?? '')} onChange={event => update({ [definition.key]: event.target.value })} />;
  } else {
    control = <Input type={definition.kind} value={String(value ?? '')} onChange={event => update({ [definition.key]: event.target.value })} />;
  }
  return <label className={styles.field}>{t(definition.labelKey)}{control}</label>;
}

export function NoticeReceiverEditor({ draft, saving, testing, update, close, submit, test }: {
  draft: NoticeReceiverDraft;
  saving: boolean;
  testing: boolean;
  update: (patch: Partial<NoticeReceiverDraft>) => void;
  close: () => void;
  submit: () => void;
  test: () => void;
}) {
  const { t } = useTranslation();
  const definition = receiverTypeDefinitions.find(item => item.type === draft.type) ?? receiverTypeDefinitions[1]!;
  return (
    <Modal open width={760} maskClosable={false} title={t(draft.id ? 'noticeReceivers.edit' : 'noticeReceivers.new')} okText={t('common.save')} cancelText={t('common.cancel')} confirmLoading={saving} onCancel={close} onOk={submit}>
      <div className={styles.form}>
        <label className={`${styles.field} ${styles.wide}`}>
          {t('noticeReceivers.name')}
          <Input value={draft.name} onChange={event => update({ name: event.target.value })} />
        </label>
        <label className={`${styles.field} ${styles.wide}`}>
          {t('noticeReceivers.type')}
          <Select
            showSearch
            optionFilterProp="label"
            value={draft.type}
            options={receiverTypeDefinitions.map(item => ({ value: item.type, label: t(item.labelKey) }))}
            onChange={(type: NoticeReceiverType) => update({ type })}
          />
        </label>
        {definition.fields.map(item => <ReceiverField key={item.key} definition={item} draft={draft} update={update} />)}
        <Button className={`${styles.test} ${styles.wide}`} loading={testing} onClick={test}>{t('noticeReceivers.test')}</Button>
      </div>
    </Modal>
  );
}
