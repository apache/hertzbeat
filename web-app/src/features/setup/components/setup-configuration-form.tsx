/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { Alert, Button, Form, Typography } from 'antd';
import { useTranslation } from 'react-i18next';

import type { SetupApplyMode, SetupErrorCode } from '../model/setup-contract';
import type { SetupConfigurationDraft, SetupValidationSection } from '../model/setup-configuration';
import type { SetupExportFormat } from '../model/setup-configuration';
import type {
  SetupConfigurationWorkflowState,
  SetupRequestFailure,
  SetupSectionValidationMap
} from '../model/setup-configuration-state';
import { ManagementConfigurationSection, TelemetryConfigurationSection } from './setup-configuration-sections';
import { SetupConfigurationExport } from './setup-configuration-export';
import { generalSetupErrorKey } from './setup-error-message';
import styles from './setup-configuration-form.module.css';

const workflowClass = styles.workflow ?? '';

type Props = {
  applyMode: SetupApplyMode;
  draft: SetupConfigurationDraft;
  workflowState: SetupConfigurationWorkflowState;
  canSubmit: boolean;
  submitting: boolean;
  submitFailure: SetupRequestFailure | null;
  canExport: boolean;
  exporting: boolean;
  exportFailure: SetupRequestFailure | null;
  validation: SetupSectionValidationMap;
  updateManagement: (value: Partial<SetupConfigurationDraft['managementDatabase']>) => void;
  updateTelemetry: (value: Partial<SetupConfigurationDraft['telemetryStore']>) => void;
  validateSection: (section: SetupValidationSection) => Promise<void>;
  submit: () => Promise<void>;
  exportConfiguration: (format: SetupExportFormat) => Promise<void>;
};

export function SetupConfigurationForm(props: Props) {
  const { t } = useTranslation();
  const editable =
    (props.workflowState === 'editing' || props.workflowState === 'external-resume') && !props.submitting;

  return (
    <Form layout="vertical" requiredMark={false} onFinish={() => void props.submit()}>
      <Typography.Title level={2}>{t('setup.configuration.title')}</Typography.Title>
      <Typography.Paragraph type="secondary">{t('setup.configuration.description')}</Typography.Paragraph>
      <WorkflowEvidence workflowState={props.workflowState} submitFailure={props.submitFailure} />
      <ManagementConfigurationSection {...props} editable={editable} />
      <TelemetryConfigurationSection {...props} editable={editable} />
      <SetupConfigurationExport {...props} />
      {editable && (
        <div className={styles.footer}>
          <Typography.Text type="secondary">
            {t(
              props.applyMode === 'managed_write'
                ? 'setup.configuration.applyManagedHint'
                : 'setup.configuration.applyExternalHint'
            )}
          </Typography.Text>
          <Button type="primary" htmlType="submit" loading={props.submitting} disabled={!props.canSubmit}>
            {t('setup.configuration.apply')}
          </Button>
        </div>
      )}
    </Form>
  );
}

function WorkflowEvidence({ workflowState, submitFailure }: Pick<Props, 'workflowState' | 'submitFailure'>) {
  const { t } = useTranslation();
  if (submitFailure) {
    return (
      <Alert className={workflowClass} type="error" showIcon message={t(submitFailureKey(submitFailure.errorCode))} />
    );
  }
  const key = workflowKey(workflowState);
  return key ? <Alert className={workflowClass} type={workflowType(workflowState)} showIcon message={t(key)} /> : null;
}

function workflowType(state: SetupConfigurationWorkflowState) {
  return state === 'failed' || state.startsWith('poll-') ? 'error' : state === 'external-resume' ? 'warning' : 'info';
}

function workflowKey(state: SetupConfigurationWorkflowState) {
  if (state === 'external-waiting') return 'setup.configuration.externalApplyRequired';
  if (state === 'external-resume') return 'setup.configuration.externalResumeRequired';
  if (state === 'waiting') return 'setup.configuration.applicationStarting';
  if (state === 'recovery') return 'setup.configuration.recoveryRequired';
  if (state === 'migration') return 'setup.configuration.migrationInProgress';
  if (state === 'failed') return 'setup.configuration.operationFailed';
  if (state === 'poll-unavailable') return 'setup.configuration.pollUnavailable';
  if (state === 'poll-contract') return 'setup.configuration.pollContract';
  if (state === 'poll-error') return 'setup.configuration.pollError';
  return null;
}

function submitFailureKey(errorCode: SetupErrorCode | null) {
  const generalKey = generalSetupErrorKey(errorCode);
  if (generalKey) return generalKey;
  if (errorCode === 'config_read_only') return 'setup.configuration.configReadOnly';
  if (errorCode === 'config_write_failed') return 'setup.configuration.configWriteFailed';
  if (errorCode === 'config_recovery_required') return 'setup.configuration.configRecoveryRequired';
  if (errorCode === 'operation_conflict') return 'setup.configuration.operationConflict';
  return 'setup.configuration.submitFailed';
}
