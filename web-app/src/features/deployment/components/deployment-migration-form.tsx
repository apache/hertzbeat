/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { Alert, Button, Checkbox, Form, Input, Radio, Select } from 'antd';
import { useTranslation } from 'react-i18next';

import { optionalWarningKey } from '@/features/setup';
import { OperationalFormActions } from '@/shared/operational-page';

import type { DeploymentView, ValidationResponse } from '../model/deployment-contract';
import type { DeploymentDraft } from '../model/deployment-workflow';
import { selectMigrationTarget } from '../model/deployment-workflow';
import type { DeploymentWorkflowProps } from './deployment-workflow-contract';
import styles from './deployment-workflow.module.css';

export function DeploymentMigrationForm(props: DeploymentWorkflowProps) {
  const { t } = useTranslation();
  const acknowledged = props.maintenanceAcknowledged ?? false;
  const setAcknowledged = props.setMaintenanceAcknowledged ?? (() => undefined);
  const capabilityBlocked = !props.deployment.migration.allowed;
  return (
    <Form className={styles.form} layout="vertical" requiredMark={false}>
      {capabilityBlocked && (
        <MigrationBlocker deployment={props.deployment} continueCurrentMigration={props.continueCurrentMigration} />
      )}
      {props.commandErrorKey && <Alert type="error" showIcon message={t(props.commandErrorKey)} />}
      <MigrationTargetFields {...props} />
      {props.validation && <ValidationEvidence validation={props.validation} />}
      {props.deployment.migration.allowed && (
        <Checkbox
          checked={acknowledged}
          disabled={props.busy}
          onChange={event => setAcknowledged(event.target.checked)}
        >
          {t(
            props.deployment.migration.maintenanceAdmission === 'auto_enter'
              ? 'deployment.maintenance.acknowledgementAutoEnter'
              : 'deployment.maintenance.acknowledgement'
          )}
        </Checkbox>
      )}
      <OperationalFormActions>
        <Button
          disabled={!props.canValidate}
          loading={props.busyAction === 'validate'}
          onClick={() => props.validate()}
        >
          {t('deployment.actions.validate')}
        </Button>
        <Button
          type="primary"
          disabled={!props.canStart}
          loading={props.busyAction === 'start'}
          onClick={() => props.start()}
        >
          {t('deployment.actions.start')}
        </Button>
      </OperationalFormActions>
    </Form>
  );
}

function MigrationTargetFields({ draft, busy, updateDraft }: DeploymentWorkflowProps) {
  const { t } = useTranslation();
  const updateDatabase = (value: Partial<DeploymentDraft['targetDatabase']>) =>
    updateDraft({ ...draft, targetDatabase: { ...draft.targetDatabase, ...value } });
  return (
    <>
      <Form.Item label={t('deployment.fields.target')} required>
        <Select
          value={draft.target}
          disabled={busy}
          options={targetOptions}
          onChange={target => updateDraft(selectMigrationTarget(draft, target))}
        />
      </Form.Item>
      <Form.Item label={t('deployment.fields.jdbcUrl')} required>
        <Input
          value={draft.targetDatabase.jdbcUrl}
          disabled={busy}
          onChange={event => updateDatabase({ jdbcUrl: event.target.value })}
        />
      </Form.Item>
      <Form.Item label={t('deployment.fields.username')} required>
        <Input
          value={draft.targetDatabase.username}
          autoComplete="username"
          disabled={busy}
          onChange={event => updateDatabase({ username: event.target.value })}
        />
      </Form.Item>
      <Form.Item label={t('deployment.fields.password')} required>
        <Input.Password
          value={draft.targetDatabase.password}
          autoComplete="new-password"
          disabled={busy}
          onChange={event => updateDatabase({ password: event.target.value })}
        />
      </Form.Item>
      <Form.Item label={t('deployment.fields.applyMode')} required>
        <Radio.Group
          value={draft.applyMode}
          disabled={busy}
          onChange={event => updateApplyMode(draft, updateDraft, event.target.value as unknown)}
        >
          <Radio value="managed_write">{t('deployment.applyMode.managed_write')}</Radio>
          <Radio value="external_apply">{t('deployment.applyMode.external_apply')}</Radio>
        </Radio.Group>
      </Form.Item>
    </>
  );
}

function MigrationBlocker({
  deployment,
  continueCurrentMigration
}: {
  deployment: DeploymentView;
  continueCurrentMigration: () => unknown;
}) {
  const { t } = useTranslation();
  const maintenance = deployment.migration.blockedBy === 'migration_maintenance_required';
  const activeOperation = deployment.migration.activeOperationId !== null;
  return (
    <Alert
      type="warning"
      showIcon
      message={
        maintenance ? t('deployment.maintenance.inactive') : t(`deployment.errors.${deployment.migration.blockedBy}`)
      }
      description={maintenance ? t('deployment.maintenance.instructions') : t('deployment.migration.blocked')}
      action={
        activeOperation ? (
          <Button size="small" onClick={() => continueCurrentMigration()}>
            {t('deployment.actions.continueCurrent')}
          </Button>
        ) : undefined
      }
    />
  );
}

function ValidationEvidence({ validation }: { validation: ValidationResponse }) {
  const { t } = useTranslation();
  return (
    <div className={styles.validationEvidence}>
      <Alert
        type={validation.valid ? 'success' : 'error'}
        showIcon
        message={t(validation.valid ? 'deployment.validation.valid' : 'deployment.validation.invalid')}
        description={
          !validation.valid && validation.errorCode ? t(`deployment.errors.${validation.errorCode}`) : undefined
        }
      />
      {validation.warnings.map(warning => (
        <Alert key={warning} type="warning" showIcon message={t(optionalWarningKey(warning))} />
      ))}
    </div>
  );
}

const targetOptions = [
  { value: 'mysql' as const, label: 'MySQL' },
  { value: 'postgresql' as const, label: 'PostgreSQL' }
];

function updateApplyMode(draft: DeploymentDraft, updateDraft: (value: DeploymentDraft) => void, value: unknown) {
  if (value === 'managed_write' || value === 'external_apply') updateDraft({ ...draft, applyMode: value });
}
