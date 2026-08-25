/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { SendOutlined } from '@ant-design/icons';
import { Alert, Button, Input, Modal, Select } from 'antd';
import { type ReactNode, useState } from 'react';
import { useTranslation } from 'react-i18next';

import alignmentStyles from '@/shared/horizontal-field/horizontal-field-alignment.module.css';

import {
  activeNoticeReceiverDefinition,
  noticeReceiverNameMaxLength,
  receiverTypeDefinitions,
  validateNoticeReceiverDraft,
  type NoticeReceiverDraft,
  type NoticeReceiverSecretKey,
  type NoticeReceiverType
} from '../model/notice-receiver-model';
import type { NoticeReceiverTestRecovery } from '../model/notice-receiver-operation-state';
import styles from './notice-receiver-editor.module.css';
import { NoticeReceiverField } from './notice-receiver-fields';

type NoticeReceiverEditorBaseProps = {
  draft: NoticeReceiverDraft;
  saving: boolean;
  testing: boolean;
  busy: boolean;
  canTest: boolean;
  update: (patch: Partial<NoticeReceiverDraft>) => void;
  selectType: (type: NoticeReceiverType) => void;
  setSecretCleared: (key: NoticeReceiverSecretKey, cleared: boolean) => void;
  close: () => void;
  submit: () => void;
};

type NoticeReceiverEditorProps = NoticeReceiverEditorBaseProps &
  (
    | { testRecovery?: undefined; test: () => void; retryTest?: never; dismissTestRecovery?: never }
    | {
        testRecovery: NoticeReceiverTestRecovery;
        test?: never;
        retryTest: () => void;
        dismissTestRecovery: () => void;
      }
  );

export function NoticeReceiverEditor(props: NoticeReceiverEditorProps) {
  const { t } = useTranslation();
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const testUncertain = Boolean(props.testRecovery);
  const canDismissTestRecovery = testUncertain && !props.testing;
  const invalidFields = submitAttempted ? validateNoticeReceiverDraft(props.draft) : [];
  const submit = () => {
    if (props.busy) return;
    setSubmitAttempted(true);
    if (validateNoticeReceiverDraft(props.draft).length === 0) props.submit();
  };
  return (
    <Modal
      open
      rootClassName={styles.modal ?? ''}
      width="40%"
      maskClosable={false}
      closable={!props.busy || canDismissTestRecovery}
      keyboard={!props.busy || canDismissTestRecovery}
      title={t(props.draft.id ? 'noticeReceivers.edit' : 'noticeReceivers.new')}
      okText={t('common.confirm')}
      cancelText={t('common.cancel')}
      confirmLoading={props.saving}
      okButtonProps={{ disabled: props.busy }}
      cancelButtonProps={{ disabled: props.busy && !canDismissTestRecovery }}
      onCancel={() => {
        if (props.testRecovery && canDismissTestRecovery) props.dismissTestRecovery();
        else if (!props.busy) props.close();
      }}
      onOk={submit}
    >
      <NoticeReceiverForm {...props} invalidFields={invalidFields} />
    </Modal>
  );
}

function NoticeReceiverForm(props: NoticeReceiverEditorProps & { invalidFields: readonly string[] }) {
  const { t } = useTranslation();
  const definition = activeNoticeReceiverDefinition(props.draft.type);
  const nameInvalid = props.invalidFields.includes('name');
  return (
    <div className={styles.form}>
      {props.testRecovery ? (
        <Alert type="warning" showIcon message={t(`noticeReceivers.testError.${props.testRecovery.failure}`)} />
      ) : null}
      <ReceiverFieldRow
        label={t('noticeReceivers.nameField')}
        required
        invalid={nameInvalid}
        error={t('noticeReceivers.required')}
      >
        <Input
          aria-label={t('noticeReceivers.nameField')}
          aria-invalid={nameInvalid}
          status={nameInvalid ? 'error' : ''}
          value={props.draft.name}
          maxLength={noticeReceiverNameMaxLength}
          disabled={props.busy}
          onChange={event => props.update({ name: event.target.value })}
        />
      </ReceiverFieldRow>
      <ReceiverFieldRow label={t('noticeReceivers.type')} required>
        <Select
          aria-label={t('noticeReceivers.type')}
          showSearch
          optionFilterProp="label"
          value={props.draft.type}
          disabled={props.busy}
          options={receiverTypeDefinitions.map(item => ({ value: item.type, label: t(item.labelKey) }))}
          onChange={(type: NoticeReceiverType) => props.selectType(type)}
        />
      </ReceiverFieldRow>
      {definition.fields.map(item => (
        <NoticeReceiverField
          key={item.key}
          definition={item}
          draft={props.draft}
          busy={props.busy}
          invalid={fieldHasError(item.key, props.invalidFields)}
          update={props.update}
          setSecretCleared={props.setSecretCleared}
        />
      ))}
      {props.canTest ? (
        <Button
          className={styles.test ?? ''}
          danger
          aria-label={t(props.testRecovery ? 'common.retry' : 'noticeReceivers.test')}
          icon={props.testRecovery ? null : <SendOutlined />}
          loading={props.testing}
          disabled={props.testing || (props.busy && !props.testRecovery)}
          onClick={props.testRecovery ? props.retryTest : props.test}
        >
          {t(props.testRecovery ? 'common.retry' : 'noticeReceivers.test')}
        </Button>
      ) : null}
    </div>
  );
}

function ReceiverFieldRow({
  label,
  required = false,
  invalid = false,
  error,
  children
}: {
  label: string;
  required?: boolean;
  invalid?: boolean;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div className={styles.fieldRow}>
      <span className={`${styles.fieldLabel} ${alignmentStyles.label}`}>
        {required ? <span className={styles.requiredMark}>*</span> : null}
        {label}
      </span>
      <span className={`${styles.fieldControl} ${alignmentStyles.control}`}>
        {children}
        {invalid && error ? <span className={styles.fieldError}>{error}</span> : null}
      </span>
      <span aria-hidden="true" />
    </div>
  );
}

function fieldHasError(key: string, invalidFields: readonly string[]) {
  if (invalidFields.includes(key)) return true;
  return invalidFields.includes('recipientTarget') && ['userId', 'partyId', 'tagId'].includes(key);
}
