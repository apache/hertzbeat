/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { QuestionCircleOutlined } from '@ant-design/icons';
import { Alert, Input, InputNumber, Modal, Select, Switch, Tooltip } from 'antd';
import { type ReactNode, useState } from 'react';
import { useTranslation } from 'react-i18next';

import alignmentStyles from '@/shared/horizontal-field/horizontal-field-alignment.module.css';

import {
  createAlertGroupDraft,
  type AlertGroupDraft,
  type AlertGroupFailure,
  validateAlertGroupDraft
} from '../model/alert-group-model';
import {
  durationFromSeconds,
  durationToSeconds,
  type AlertGroupDurationUnit,
  preferredDurationUnit
} from '../model/alert-group-duration';
import type { AlertGroupOperationRecovery } from '../model/alert-group-operation-state';
import styles from '../shared/alert-group-editor.module.css';
import { AlertGroupRecovery } from './alert-group-recovery';

const draftDefaults = createAlertGroupDraft();
const durationUnits: AlertGroupDurationUnit[] = ['seconds', 'minutes', 'hours'];

type AlertGroupEditorProps = {
  draft: AlertGroupDraft;
  saving: boolean;
  commandLocked: boolean;
  canRetry: boolean;
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
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const fieldsLocked = props.commandLocked || props.createAcknowledged;
  const invalidFields = submitAttempted ? validateAlertGroupDraft(props.draft) : [];
  const close = () => {
    if (!props.commandLocked) props.close();
  };
  const submit = () => {
    if (props.commandLocked) return;
    setSubmitAttempted(true);
    if (validateAlertGroupDraft(props.draft).length === 0) void props.submit();
  };
  return (
    <Modal
      open
      closable={!props.commandLocked}
      maskClosable={false}
      keyboard={!props.commandLocked}
      rootClassName={styles.modal ?? ''}
      width="40%"
      title={t(props.draft.id ? 'alertGroups.edit' : 'alertGroups.new')}
      okText={t(props.createAcknowledged ? 'common.retry' : 'common.confirm')}
      cancelText={t('common.cancel')}
      confirmLoading={props.saving}
      okButtonProps={{ disabled: props.commandLocked }}
      cancelButtonProps={{ disabled: props.commandLocked }}
      onCancel={close}
      onOk={submit}
    >
      <EditorFailure failure={props.failure} acknowledged={props.createAcknowledged} proof={props.proofFailure} />
      <AlertGroupRecovery
        canRetry={props.canRetry}
        recovery={props.recovery}
        retrying={props.retrying}
        retry={props.retry}
      />
      <AlertGroupFields
        draft={props.draft}
        disabled={fieldsLocked}
        invalidFields={invalidFields}
        labelKeys={props.labelKeys}
        update={props.update}
      />
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
  invalidFields,
  labelKeys,
  update
}: {
  draft: AlertGroupDraft;
  disabled: boolean;
  invalidFields: ReturnType<typeof validateAlertGroupDraft>;
  labelKeys: string[];
  update: (patch: Partial<AlertGroupDraft>) => void;
}) {
  const { t } = useTranslation();
  return (
    <div className={styles.form}>
      <FieldRow
        help={t('alertGroups.help.name')}
        invalid={invalidFields.includes('name')}
        label={t('alertGroups.name')}
        required
      >
        <Input
          aria-label={t('alertGroups.name')}
          aria-invalid={invalidFields.includes('name')}
          disabled={disabled}
          value={draft.name}
          onChange={event => update({ name: event.target.value })}
        />
      </FieldRow>
      <AlertGroupLabelField
        draft={draft}
        disabled={disabled}
        invalid={invalidFields.includes('groupLabels')}
        labelKeys={labelKeys}
        update={update}
      />
      <DurationField
        disabled={disabled}
        fallback={draftDefaults.groupWait}
        help={t('alertGroups.help.wait')}
        label={t('alertGroups.wait')}
        value={draft.groupWait}
        onChange={groupWait => update({ groupWait })}
      />
      <DurationField
        disabled={disabled}
        fallback={draftDefaults.groupInterval}
        help={t('alertGroups.help.interval')}
        label={t('alertGroups.interval')}
        value={draft.groupInterval}
        onChange={groupInterval => update({ groupInterval })}
      />
      <DurationField
        disabled={disabled}
        fallback={draftDefaults.repeatInterval}
        help={t('alertGroups.help.repeat')}
        label={t('alertGroups.repeat')}
        value={draft.repeatInterval}
        onChange={repeatInterval => update({ repeatInterval })}
      />
      <FieldRow label={t('alertGroups.enabled')} required>
        <Switch
          aria-label={t('alertGroups.enabled')}
          disabled={disabled}
          checked={draft.enable}
          onChange={enable => update({ enable })}
        />
      </FieldRow>
    </div>
  );
}

function AlertGroupLabelField({
  draft,
  disabled,
  invalid,
  labelKeys,
  update
}: {
  draft: AlertGroupDraft;
  disabled: boolean;
  invalid: boolean;
  labelKeys: string[];
  update: (patch: Partial<AlertGroupDraft>) => void;
}) {
  const { t } = useTranslation();
  return (
    <FieldRow help={t('alertGroups.help.labels')} invalid={invalid} label={t('alertGroups.labels')} required>
      <Select
        aria-label={t('alertGroups.labels')}
        aria-invalid={invalid}
        allowClear
        disabled={disabled}
        mode="tags"
        maxCount={10}
        placeholder={t('alertGroups.labelsPlaceholder')}
        value={draft.groupLabels}
        tokenSeparators={[',']}
        options={labelKeys.map(value => ({ value, label: value }))}
        onChange={groupLabels => update({ groupLabels })}
      />
    </FieldRow>
  );
}

function DurationField({
  disabled,
  fallback,
  help,
  label,
  onChange,
  value
}: {
  disabled: boolean;
  fallback: number;
  help: string;
  label: string;
  onChange: (value: number) => void;
  value: number;
}) {
  const { t } = useTranslation();
  const [unit, setUnit] = useState<AlertGroupDurationUnit>(() => preferredDurationUnit(value));
  return (
    <FieldRow help={help} label={label} required>
      <div className={styles.durationControl}>
        <InputNumber
          aria-label={label}
          disabled={disabled}
          min={0}
          step={1}
          value={durationFromSeconds(value, unit)}
          onChange={next => onChange(next === null ? fallback : durationToSeconds(next, unit))}
        />
        <Select<AlertGroupDurationUnit>
          aria-label={`${label} ${t('alertGroups.durationUnit')}`}
          disabled={disabled}
          value={unit}
          options={durationUnits.map(value => ({ value, label: t(`alertGroups.units.${value}`) }))}
          onChange={setUnit}
        />
      </div>
    </FieldRow>
  );
}

function FieldRow({
  children,
  help,
  invalid = false,
  label,
  required = false
}: {
  children: ReactNode;
  help?: string;
  invalid?: boolean;
  label: string;
  required?: boolean;
}) {
  const { t } = useTranslation();
  return (
    <div className={styles.fieldRow} data-invalid={invalid || undefined}>
      <div className={`${styles.fieldLabel} ${alignmentStyles.label}`}>
        {required && (
          <span className={styles.requiredMark} aria-hidden="true">
            *
          </span>
        )}
        <span>{label}</span>
        {help && (
          <Tooltip title={help}>
            <QuestionCircleOutlined aria-label={help} />
          </Tooltip>
        )}
      </div>
      <div className={`${styles.fieldControl} ${alignmentStyles.control}`}>
        {children}
        {invalid && <span className={styles.fieldError}>{t('alertGroups.required')}</span>}
      </div>
      <span aria-hidden="true" />
    </div>
  );
}
