/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { Alert, Button, Descriptions, Form, Input, Progress, Select } from 'antd';
import { useTranslation } from 'react-i18next';

import { OperationalFormActions } from '@/shared/operational-page';

import type { MigrationView } from '../model/deployment-contract';
import type { DeploymentWorkflowProps } from './deployment-workflow-contract';
import styles from './deployment-workflow.module.css';

type Props = DeploymentWorkflowProps & { operation: MigrationView };

export function DeploymentOperation(props: Props) {
  const { t } = useTranslation();
  const { operation } = props;
  return (
    <div className={styles.operation}>
      {props.commandErrorKey && <Alert type="error" showIcon message={t(props.commandErrorKey)} />}
      <Alert
        type={operationAlertType(operation.state)}
        showIcon
        message={t(`deployment.state.${operation.state}`)}
        description={
          operation.errorCode ? t(`deployment.errors.${operation.errorCode}`) : t(`deployment.stage.${operation.stage}`)
        }
      />
      <Progress percent={operation.progressPercent} status={operationProgressStatus(operation.state)} />
      <Descriptions size="small" column={1}>
        <Descriptions.Item label={t('deployment.operation.id')}>{operation.operationId}</Descriptions.Item>
        <Descriptions.Item label={t('deployment.operation.verification')}>
          {t(`deployment.verification.${operation.verificationState}`)}
        </Descriptions.Item>
      </Descriptions>
      {operation.restartRequired && <Alert type="warning" showIcon message={t('deployment.operation.restart')} />}
      {operation.state === 'awaiting_external_apply' && operation.externalApplyRequired && (
        <ExternalExportForm {...props} />
      )}
      <OperationActions {...props} />
    </div>
  );
}

function ExternalExportForm(props: Props) {
  const { t } = useTranslation();
  const updateDatabase = (value: Partial<Props['draft']['targetDatabase']>) =>
    props.updateDraft({ ...props.draft, targetDatabase: { ...props.draft.targetDatabase, ...value } });
  return (
    <Form className={styles.exportForm} layout="vertical" requiredMark={false}>
      <Form.Item label={t('deployment.export.format')} required>
        <Select
          id="deployment-export-format"
          aria-label={t('deployment.export.format')}
          value={props.exportFormat}
          disabled={props.busy}
          options={exportFormatOptions(t)}
          onChange={props.updateExportFormat}
        />
      </Form.Item>
      <Form.Item label={t('deployment.fields.jdbcUrl')} required>
        <Input
          id="deployment-export-jdbc-url"
          value={props.draft.targetDatabase.jdbcUrl}
          disabled={props.busy}
          onChange={event => updateDatabase({ jdbcUrl: event.target.value })}
        />
      </Form.Item>
      <Form.Item label={t('deployment.fields.username')} required>
        <Input
          id="deployment-export-username"
          value={props.draft.targetDatabase.username}
          autoComplete="username"
          disabled={props.busy}
          onChange={event => updateDatabase({ username: event.target.value })}
        />
      </Form.Item>
      <Form.Item label={t('deployment.export.password')} required>
        <Input.Password
          id="deployment-export-password"
          aria-label={t('deployment.export.password')}
          value={props.exportPassword}
          autoComplete="new-password"
          disabled={props.busy}
          onChange={event => props.updateExportPassword(event.target.value)}
        />
      </Form.Item>
    </Form>
  );
}

function OperationActions(props: Props) {
  const { t } = useTranslation();
  const terminal = terminalAction(props.operation.state);
  const activating = props.busyAction === 'activate';
  return (
    <OperationalFormActions>
      {(props.canActivate || activating) && (
        <Button type="primary" disabled={!props.canActivate} loading={activating} onClick={() => props.activate()}>
          {t('deployment.actions.activate')}
        </Button>
      )}
      {props.operation.state === 'awaiting_external_apply' && props.operation.externalApplyRequired && (
        <>
          <Button disabled={props.busy} onClick={() => props.refreshOperation()}>
            {t('deployment.actions.checkStatus')}
          </Button>
          <Button
            type="primary"
            loading={props.busyAction === 'export'}
            disabled={!props.canExport}
            onClick={() => props.exportConfiguration()}
          >
            {t('deployment.actions.export')}
          </Button>
        </>
      )}
      {terminal && (
        <Button type="primary" loading={props.busy} onClick={() => props.startNewMigration()}>
          {t(`deployment.actions.${terminal}`)}
        </Button>
      )}
    </OperationalFormActions>
  );
}

function terminalAction(state: MigrationView['state']) {
  if (state === 'failed') return 'startNew' as const;
  if (state === 'rolled_back') return 'retryMigration' as const;
  if (state === 'succeeded') return 'returnToConfiguration' as const;
  return null;
}

function operationAlertType(state: MigrationView['state']) {
  if (state === 'failed') return 'error' as const;
  if (state === 'rolled_back') return 'warning' as const;
  if (state === 'succeeded') return 'success' as const;
  return 'info' as const;
}

function operationProgressStatus(state: MigrationView['state']) {
  return state === 'failed' || state === 'rolled_back' ? ('exception' as const) : ('normal' as const);
}

function exportFormatOptions(t: (key: string) => string) {
  return [
    { value: 'yaml' as const, label: t('deployment.export.formats.yaml') },
    { value: 'env' as const, label: t('deployment.export.formats.env') },
    { value: 'kubernetes_secret' as const, label: t('deployment.export.formats.kubernetes_secret') }
  ];
}
