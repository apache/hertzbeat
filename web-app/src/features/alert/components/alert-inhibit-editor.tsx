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

import { QuestionCircleOutlined } from '@ant-design/icons';
import { Alert, Input, Modal, Select, Switch, Tooltip } from 'antd';
import { type ReactNode, useState } from 'react';
import { useTranslation } from 'react-i18next';

import alignmentStyles from '@/shared/horizontal-field/horizontal-field-alignment.module.css';

import type { AlertLabelSuggestionState } from '../model/alert-label-suggestion-model';
import {
  type AlertInhibitDraft,
  type AlertInhibitFailure,
  validateAlertInhibitDraft
} from '../model/alert-inhibit-model';
import type { AlertInhibitPrefillState, AlertInhibitRecovery as RecoveryState } from '../model/alert-inhibit-state';
import styles from '../shared/alert-inhibit-editor.module.css';
import { AlertInhibitLabelMatcher } from './alert-inhibit-label-matcher';
import { AlertInhibitRecovery } from './alert-inhibit-recovery';

type AlertInhibitEditorProps = {
  draft: AlertInhibitDraft;
  busy: boolean;
  saving: boolean;
  failure: AlertInhibitFailure | undefined;
  prefill: AlertInhibitPrefillState;
  recovery: RecoveryState | undefined;
  retrying: boolean;
  labelSuggestions: AlertLabelSuggestionState;
  update: (patch: Partial<AlertInhibitDraft>) => void;
  close: () => void;
  submit: () => unknown;
  retry: () => unknown;
};

function AlertInhibitFields({
  draft,
  busy,
  invalidFields,
  labelSuggestions,
  update
}: Pick<AlertInhibitEditorProps, 'draft' | 'busy' | 'labelSuggestions' | 'update'> & {
  invalidFields: ReturnType<typeof validateAlertInhibitDraft>;
}) {
  const { t } = useTranslation();
  return (
    <div className={styles.form}>
      <FieldRow
        help={t('alertInhibits.nameHelp')}
        invalid={invalidFields.includes('name')}
        label={t('alertInhibits.name')}
        required
        showError
      >
        <Input
          aria-label={t('alertInhibits.name')}
          aria-invalid={invalidFields.includes('name')}
          disabled={busy}
          value={draft.name}
          onChange={event => update({ name: event.target.value })}
        />
      </FieldRow>
      <AlertInhibitLogicPreview draft={draft} />
      <FieldRow
        help={t('alertInhibits.sourceHelp')}
        invalid={invalidFields.includes('sourceLabels')}
        label={t('alertInhibits.sourceLabels')}
        required
      >
        <AlertInhibitLabelMatcher
          disabled={busy}
          invalid={invalidFields.includes('sourceLabels')}
          suggestions={labelSuggestions}
          value={draft.sourceLabelsText}
          change={sourceLabelsText => update({ sourceLabelsText })}
        />
      </FieldRow>
      <FieldRow
        help={t('alertInhibits.targetHelp')}
        invalid={invalidFields.includes('targetLabels')}
        label={t('alertInhibits.targetLabels')}
        required
      >
        <AlertInhibitLabelMatcher
          disabled={busy}
          invalid={invalidFields.includes('targetLabels')}
          suggestions={labelSuggestions}
          value={draft.targetLabelsText}
          change={targetLabelsText => update({ targetLabelsText })}
        />
      </FieldRow>
      <FieldRow
        help={t('alertInhibits.equalHelp')}
        invalid={invalidFields.includes('equalLabels')}
        label={t('alertInhibits.equalLabels')}
        required
      >
        <Select
          allowClear
          aria-label={t('alertInhibits.equalLabels')}
          aria-invalid={invalidFields.includes('equalLabels')}
          disabled={busy}
          mode="tags"
          maxCount={10}
          placeholder={t('alertInhibits.equalPlaceholder')}
          value={draft.equalLabels}
          tokenSeparators={[',']}
          options={labelSuggestions.keys.map(value => ({ value, label: value }))}
          {...(invalidFields.includes('equalLabels') ? { status: 'error' as const } : {})}
          onChange={equalLabels => update({ equalLabels })}
        />
      </FieldRow>
      <FieldRow label={t('alertInhibits.enabled')} required>
        <Switch
          aria-label={t('alertInhibits.enabled')}
          checked={draft.enable}
          disabled={busy}
          onChange={enable => update({ enable })}
        />
      </FieldRow>
    </div>
  );
}

function AlertInhibitLogicPreview({ draft }: { draft: AlertInhibitDraft }) {
  const { t } = useTranslation();
  const source = formatMatcherPreview(draft.sourceLabelsText);
  const target = formatMatcherPreview(draft.targetLabelsText);
  const equal = [...new Set(draft.equalLabels.map(label => label.trim()).filter(Boolean))].join(', ');
  const title = t('alertInhibits.logicPreview.title');

  return (
    <section aria-label={title} aria-live="polite" className={styles.logicPreview}>
      <div className={styles.logicPreviewTitle}>{title}</div>
      <ol className={styles.logicSteps}>
        <li>
          <strong className={styles.logicStepLabel}>{t('alertInhibits.logicPreview.trigger')}</strong>
          {source
            ? t('alertInhibits.logicPreview.triggerDetail', { source })
            : t('alertInhibits.logicPreview.sourceEmpty')}
        </li>
        <li>
          <strong className={styles.logicStepLabel}>{t('alertInhibits.logicPreview.effect')}</strong>
          {target
            ? t('alertInhibits.logicPreview.effectDetail', { target })
            : t('alertInhibits.logicPreview.targetEmpty')}
        </li>
        <li>
          <strong className={styles.logicStepLabel}>{t('alertInhibits.logicPreview.condition')}</strong>
          {equal
            ? t('alertInhibits.logicPreview.conditionDetail', { equal })
            : t('alertInhibits.logicPreview.equalEmpty')}
        </li>
      </ol>
    </section>
  );
}

function formatMatcherPreview(value: string) {
  return value
    .split(',')
    .map(matcher => {
      const separator = matcher.indexOf(':');
      if (separator < 1) return '';
      const key = matcher.slice(0, separator).trim();
      const matcherValue = matcher.slice(separator + 1).trim();
      return key && matcherValue ? `${key}=${matcherValue}` : '';
    })
    .filter(Boolean)
    .join(', ');
}

function AlertInhibitPrefillEvidence({ state }: { state: AlertInhibitPrefillState }) {
  const { t } = useTranslation();
  if (state === 'idle' || state === 'loading') return null;
  return <Alert type={prefillAlertType(state)} showIcon message={t(`alertInhibits.entityPrefill.${state}`)} />;
}

function prefillAlertType(state: Exclude<AlertInhibitPrefillState, 'idle' | 'loading'>) {
  if (state === 'received') return 'success';
  if (state === 'manual') return 'info';
  return state === 'unavailable' ? 'warning' : 'error';
}

export function AlertInhibitEditor({
  draft,
  busy,
  saving,
  failure,
  prefill,
  recovery,
  retrying,
  labelSuggestions,
  update,
  close,
  submit,
  retry
}: AlertInhibitEditorProps) {
  const { t } = useTranslation();
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const invalidFields = submitAttempted ? validateAlertInhibitDraft(draft) : [];
  const submitDraft = () => {
    if (busy) return;
    setSubmitAttempted(true);
    if (validateAlertInhibitDraft(draft).length === 0) void submit();
  };
  return (
    <Modal
      open
      maskClosable={false}
      rootClassName={styles.modal ?? ''}
      width="40%"
      title={t(draft.id ? 'alertInhibits.edit' : 'alertInhibits.new')}
      okText={t('common.confirm')}
      cancelText={t('common.cancel')}
      confirmLoading={saving}
      closable={!busy}
      keyboard={!busy}
      cancelButtonProps={{ disabled: busy }}
      okButtonProps={{ disabled: busy }}
      onCancel={() => {
        if (!busy) close();
      }}
      onOk={submitDraft}
    >
      {!draft.id && <AlertInhibitPrefillEvidence state={prefill} />}
      {recovery ? (
        <AlertInhibitRecovery recovery={recovery} retrying={retrying} retry={retry} />
      ) : failure ? (
        <Alert
          type="error"
          showIcon
          message={failure === 'unavailable' ? t('common.unavailable') : t('alertInhibits.saveFailed')}
        />
      ) : null}
      <AlertInhibitFields
        draft={draft}
        busy={busy}
        invalidFields={invalidFields}
        labelSuggestions={labelSuggestions}
        update={update}
      />
    </Modal>
  );
}

function FieldRow({
  children,
  help,
  invalid = false,
  label,
  required = false,
  showError = false
}: {
  children: ReactNode;
  help?: string;
  invalid?: boolean;
  label: string;
  required?: boolean;
  showError?: boolean;
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
        {invalid && showError && <span className={styles.fieldError}>{t('alertInhibits.required')}</span>}
      </div>
      <span aria-hidden="true" />
    </div>
  );
}
