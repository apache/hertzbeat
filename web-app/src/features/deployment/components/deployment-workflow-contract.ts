/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import type { DeploymentView, MigrationView, ValidationResponse } from '../model/deployment-contract';
import type { DeploymentCommandAction, DeploymentDraft, MigrationExportFormat } from '../model/deployment-workflow';

export type DeploymentWorkflowProps = {
  deployment: DeploymentView;
  draft: DeploymentDraft;
  validation: ValidationResponse | null;
  operation: MigrationView | null;
  busy: boolean;
  busyAction: DeploymentCommandAction | null;
  canValidate: boolean;
  canStart: boolean;
  canActivate: boolean;
  canExport: boolean;
  exportFormat: MigrationExportFormat;
  exportPassword: string;
  commandErrorKey?: string | null;
  maintenanceAcknowledged?: boolean;
  updateDraft: (value: DeploymentDraft) => void;
  updateExportFormat: (value: MigrationExportFormat) => void;
  updateExportPassword: (value: string) => void;
  setMaintenanceAcknowledged?: (value: boolean) => void;
  validate: () => unknown;
  start: () => unknown;
  activate: () => unknown;
  exportConfiguration: () => unknown;
  refreshOperation: () => unknown;
  startNewMigration: () => unknown;
  continueCurrentMigration: () => unknown;
};
