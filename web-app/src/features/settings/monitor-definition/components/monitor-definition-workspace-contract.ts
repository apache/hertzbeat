/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import type { MonitorDefinitionCatalogItem, MonitorDefinitionWorkspace } from '../model/monitor-definition-model';

export type MonitorDefinitionWorkspaceProps = {
  canWrite: boolean;
  workspace: MonitorDefinitionWorkspace | null;
  onCancel: () => void;
  onChange: (value: string) => void;
  onDelete: (item: MonitorDefinitionCatalogItem) => void;
  onRefreshAuthoritativeDraft: () => void;
  onRetryCatalogProof: () => void;
  onRetry: () => void;
  onSave: () => void;
  onValidate: () => void;
};
