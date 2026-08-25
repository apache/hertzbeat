/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { DeploymentMigrationForm } from './deployment-migration-form';
import { DeploymentOperation } from './deployment-operation';
import type { DeploymentWorkflowProps } from './deployment-workflow-contract';
import styles from './deployment-workflow.module.css';

export function DeploymentWorkflow(props: DeploymentWorkflowProps) {
  return (
    <div className={styles.workflow}>
      {props.operation ? (
        <DeploymentOperation {...props} operation={props.operation} />
      ) : (
        <DeploymentMigrationForm {...props} />
      )}
    </div>
  );
}
