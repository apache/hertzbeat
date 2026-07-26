/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { Alert, Input, InputNumber, Modal, Select, Switch } from 'antd';
import { useTranslation } from 'react-i18next';

import { createAlertGroupDraft, type AlertGroupDraft, type AlertGroupFailure } from '../model/alert-group-model';
import type { AlertGroupOperationRecovery } from '../model/alert-group-operation-state';
import styles from '../shared/alert-policy-page.module.css';
import { AlertGroupRecovery } from './alert-group-recovery';

const draftDefaults = createAlertGroupDraft();
// Alert Group timing fields use seconds; these values define safe keyboard/spinner increments.
const durationStepSeconds = { wait: 30, interval: 300, repeat: 3_600 } as const;

type AlertGroupEditorProps = {
  draft: AlertGroupDraft;
  saving: boolean;
  commandLocked: boolean;
  failure: AlertGroupFailure | undefined;
  createAcknowledged: boolean;
  proofFailure: 'unavailable' | 'error' | undefined;
  recovery: AlertGroupOperationRecovery | undefined;
  retrying: boolean;
  labelKeys: string[];
  update: (patch: Partial<AlertGroupDraft>) => void;
  close: () => void;
  submit: () => unknown;
  retry: () => unknown;
};

export function AlertGroupEditor(props: AlertGroupEditorProps) {
  const { t } = useTranslation();
  const fieldsLocked = props.commandLocked || props.createAcknowledged;
  const close = () => {
    if (!props.commandLocked) props.close();
  };
  const submit = () => {
    if (!props.commandLocked) void props.submit();
  };
  return (
    <Modal
      open
      closable={!props.commandLocked}
      maskClosable={false}
      keyboard={!props.commandLocked}
      title={t(props.draft.id ? 'alertGroups.edit' : 'alertGroups.new')}
      okText={t(props.createAcknowledged ? 'common.retry' : 'common.save')}
      cancelText={t('common.cancel')}
      confirmLoading={props.saving}
      okButtonProps={{ disabled: props.commandLocked }}
      cancelButtonProps={{ disabled: props.commandLocked }}
      onCancel={close}
      onOk={submit}
    >
      <EditorFailure failure={props.failure} acknowledged={props.createAcknowledged} proof={props.proofFailure} />
      <AlertGroupRecovery recovery={props.recovery} retrying={props.retrying} retry={props.retry} />
      <AlertGroupFields draft={props.draft} disabled={fieldsLocked} labelKeys={props.labelKeys} update={props.update} />
    </Modal>
  );
}

function EditorFailure({
  failure,
  acknowledged,
  proof
}: {
  failure: AlertGroupFailure | undefined;
  acknowledged: boolean;
  proof: 'unavailable' | 'error' | undefined;
}) {
  const { t } = useTranslation();
  if (failure) {
    return (
      <Alert
        type="error"
        showIcon
        message={failure === 'unavailable' ? t('common.unavailable') : t('alertGroups.saveFailed')}
      />
    );
  }
  if (!acknowledged || !proof) return null;
  return (
    <Alert
      type="warning"
      showIcon
      message={proof === 'unavailable' ? t('common.unavailable') : t('common.routeError.description')}
    />
  );
}

function AlertGroupFields({
  draft,
  disabled,
  labelKeys,
  update
}: {
  draft: AlertGroupDraft;
  disabled: boolean;
  labelKeys: string[];
  update: (patch: Partial<AlertGroupDraft>) => void;
}) {
  const { t } = useTranslation();
  return (
    <div className={styles.form}>
      <label className={styles.wide}>
        {t('alertGroups.name')}
        <Input disabled={disabled} value={draft.name} onChange={event => update({ name: event.target.value })} />
      </label>
      <AlertGroupLabelField draft={draft} disabled={disabled} labelKeys={labelKeys} update={update} />
      <DurationField
        disabled={disabled}
        fallback={draftDefaults.groupWait}
        label={t('alertGroups.wait')}
        step={durationStepSeconds.wait}
        value={draft.groupWait}
        onChange={groupWait => update({ groupWait })}
      />
      <DurationField
        disabled={disabled}
        fallback={draftDefaults.groupInterval}
        label={t('alertGroups.interval')}
        step={durationStepSeconds.interval}
        value={draft.groupInterval}
        onChange={groupInterval => update({ groupInterval })}
      />
      <DurationField
        disabled={disabled}
        fallback={draftDefaults.repeatInterval}
        label={t('alertGroups.repeat')}
        step={durationStepSeconds.repeat}
        value={draft.repeatInterval}
        onChange={repeatInterval => update({ repeatInterval })}
      />
      <label>
        {t('alertGroups.enabled')}
        <Switch disabled={disabled} checked={draft.enable} onChange={enable => update({ enable })} />
      </label>
    </div>
  );
}

function AlertGroupLabelField({
  draft,
  disabled,
  labelKeys,
  update
}: {
  draft: AlertGroupDraft;
  disabled: boolean;
  labelKeys: string[];
  update: (patch: Partial<AlertGroupDraft>) => void;
}) {
  const { t } = useTranslation();
  return (
    <label className={styles.wide}>
      {t('alertGroups.labels')}
      <Select
        disabled={disabled}
        mode="tags"
        maxCount={10}
        value={draft.groupLabels}
        tokenSeparators={[',']}
        options={labelKeys.map(value => ({ value, label: value }))}
        onChange={groupLabels => update({ groupLabels })}
      />
    </label>
  );
}

function DurationField({
  disabled,
  fallback,
  label,
  onChange,
  step,
  value
}: {
  disabled: boolean;
  fallback: number;
  label: string;
  onChange: (value: number) => void;
  step: number;
  value: number;
}) {
  return (
    <label>
      {label}
      <InputNumber
        disabled={disabled}
        min={0}
        step={step}
        value={value}
        onChange={next => onChange(next ?? fallback)}
      />
    </label>
  );
}
