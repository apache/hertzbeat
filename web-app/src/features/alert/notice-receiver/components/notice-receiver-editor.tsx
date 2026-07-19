/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { Button, Input, Modal, Select } from 'antd';
import { useTranslation } from 'react-i18next';

import {
  activeNoticeReceiverDefinition,
  noticeReceiverNameMaxLength,
  receiverTypeDefinitions,
  type NoticeReceiverDraft,
  type NoticeReceiverSecretKey,
  type NoticeReceiverType
} from '../model/notice-receiver-model';
import styles from './notice-receiver-editor.module.css';
import { NoticeReceiverField } from './notice-receiver-fields';

type NoticeReceiverEditorProps = {
  draft: NoticeReceiverDraft;
  saving: boolean;
  testing: boolean;
  busy: boolean;
  update: (patch: Partial<NoticeReceiverDraft>) => void;
  selectType: (type: NoticeReceiverType) => void;
  setSecretCleared: (key: NoticeReceiverSecretKey, cleared: boolean) => void;
  close: () => void;
  submit: () => void;
  test: () => void;
};

export function NoticeReceiverEditor(props: NoticeReceiverEditorProps) {
  const { t } = useTranslation();
  return (
    <Modal
      open
      width={760}
      maskClosable={false}
      closable={!props.busy}
      keyboard={!props.busy}
      title={t(props.draft.id ? 'noticeReceivers.edit' : 'noticeReceivers.new')}
      okText={t('common.save')}
      cancelText={t('common.cancel')}
      confirmLoading={props.saving}
      okButtonProps={{ disabled: props.busy }}
      cancelButtonProps={{ disabled: props.busy }}
      onCancel={() => {
        if (!props.busy) props.close();
      }}
      onOk={() => {
        if (!props.busy) props.submit();
      }}
    >
      <NoticeReceiverForm {...props} />
    </Modal>
  );
}

function NoticeReceiverForm(props: NoticeReceiverEditorProps) {
  const { t } = useTranslation();
  const definition = activeNoticeReceiverDefinition(props.draft.type);
  return (
    <div className={styles.form}>
      <label className={`${styles.field} ${styles.wide}`}>
        {t('noticeReceivers.name')}
        <Input
          value={props.draft.name}
          maxLength={noticeReceiverNameMaxLength}
          disabled={props.busy}
          onChange={event => props.update({ name: event.target.value })}
        />
      </label>
      <label className={`${styles.field} ${styles.wide}`}>
        {t('noticeReceivers.type')}
        <Select
          showSearch
          optionFilterProp="label"
          value={props.draft.type}
          disabled={props.busy}
          options={receiverTypeDefinitions.map(item => ({ value: item.type, label: t(item.labelKey) }))}
          onChange={(type: NoticeReceiverType) => props.selectType(type)}
        />
      </label>
      {definition.fields.map(item => (
        <NoticeReceiverField
          key={item.key}
          definition={item}
          draft={props.draft}
          busy={props.busy}
          update={props.update}
          setSecretCleared={props.setSecretCleared}
        />
      ))}
      <Button
        className={`${styles.test} ${styles.wide}`}
        loading={props.testing}
        disabled={props.busy}
        onClick={props.test}
      >
        {t('noticeReceivers.test')}
      </Button>
    </div>
  );
}
