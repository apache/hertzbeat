/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { useTranslation } from 'react-i18next';

import { OperationalSection } from '@/shared/operational-page';

import { DeploymentMigrationForm } from './deployment-migration-form';
import { DeploymentOperation } from './deployment-operation';
import { DeploymentSummary } from './deployment-summary';
import type { DeploymentWorkflowProps } from './deployment-workflow-contract';
import styles from './deployment-workflow.module.css';

export function DeploymentWorkflow(props: DeploymentWorkflowProps) {
  const { t } = useTranslation();
  return (
    <div className={styles.workflow}>
      <OperationalSection title={t('deployment.current.title')} description={t('deployment.current.description')}>
        <DeploymentSummary deployment={props.deployment} />
      </OperationalSection>
      <OperationalSection title={t('deployment.migration.title')} description={t('deployment.migration.description')}>
        {props.operation ? (
          <DeploymentOperation {...props} operation={props.operation} />
        ) : (
          <DeploymentMigrationForm {...props} />
        )}
      </OperationalSection>
    </div>
  );
}
