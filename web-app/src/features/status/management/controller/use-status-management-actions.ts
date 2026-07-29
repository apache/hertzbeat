/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { useLayoutEffect, useRef } from 'react';

import type { ExclusiveOperation } from '@/shared/exclusive-operation/use-exclusive-operation';
import { StatusRequestFailure } from '@/features/status/shared/status-error-model';

import type { StatusComponent, StatusIncident, StatusOrgRecord } from '../model/status-management-contract';
import type { StatusManagementActionCapabilities } from '../model/status-management-action-capability';
import type { StatusRecordState } from '../model/status-management-model';
import type { useStatusComponentEditor } from './use-status-component-editor';
import type { useStatusComponentTransactions } from './use-status-component-transactions';
import type { useStatusIncidentEditor } from './use-status-incident-editor';
import type { useStatusIncidentTransactions } from './use-status-incident-transactions';
import type { useStatusOrgSave } from './use-status-org-save';

type StatusManagementActionsContext = {
  capabilities: StatusManagementActionCapabilities;
  command: ExclusiveOperation;
  orgState: StatusRecordState<StatusOrgRecord>;
  componentEditor: ReturnType<typeof useStatusComponentEditor>;
  incidentEditor: ReturnType<typeof useStatusIncidentEditor>;
  orgSave: ReturnType<typeof useStatusOrgSave>;
  components: ReturnType<typeof useStatusComponentTransactions>;
  incidents: ReturnType<typeof useStatusIncidentTransactions>;
};

export function useStatusManagementActions(context: StatusManagementActionsContext) {
  const { capabilities } = context;
  useStatusRoleLossRetirement(capabilities, context);

  return {
    capabilities,
    saveOrg: (value: Parameters<typeof context.orgSave.save>[0]) => {
      const admitted =
        (context.orgState.kind === 'missing' && capabilities.canCreate) ||
        (context.orgState.kind === 'ready' && capabilities.canUpdate);
      return admitted ? context.orgSave.save(value) : Promise.reject(permissionFailure());
    },
    retryOrgWrite: () =>
      capabilities.canCreate || capabilities.canUpdate ? context.orgSave.retryWrite() : Promise.resolve(undefined),
    openNewComponent: () => {
      if (!capabilities.canCreate || context.command.isLocked() || context.orgState.kind !== 'ready') return;
      context.componentEditor.openNew(context.orgState.record.id);
    },
    editComponent: (value: StatusComponent) => {
      if (!capabilities.canUpdate || context.command.isLocked()) return;
      context.componentEditor.edit(value);
    },
    closeComponent: () => {
      if (!context.command.isLocked()) context.componentEditor.close();
    },
    saveComponent: (value: StatusComponent) => {
      if (canSave(value.id, capabilities)) context.components.save(value);
    },
    retryComponentWrite: () => {
      if (capabilities.canCreate || capabilities.canUpdate) context.components.retryWrite();
    },
    deleteComponent: (id: number) => {
      if (capabilities.canDelete) context.components.remove(id);
    },
    openNewIncident: () => {
      if (!capabilities.canCreate || context.command.isLocked() || context.orgState.kind !== 'ready') return;
      context.incidentEditor.openNew(context.orgState.record.id);
    },
    openIncident: (id: number) => {
      if (!capabilities.canUpdate || context.command.isLocked()) return;
      context.incidentEditor.edit(id);
    },
    closeIncident: () => {
      if (!context.command.isLocked()) context.incidentEditor.close();
    },
    saveIncident: (value: StatusIncident) => {
      if (canSave(value.id, capabilities)) context.incidents.save(value);
    },
    retryIncidentWrite: () => {
      if (capabilities.canCreate || capabilities.canUpdate) context.incidents.retryWrite();
    },
    deleteIncident: (id: number) => {
      if (capabilities.canDelete) context.incidents.remove(id);
    }
  };
}

function useStatusRoleLossRetirement(
  capabilities: StatusManagementActionCapabilities,
  context: StatusManagementActionsContext
) {
  const previousCapabilities = useRef(capabilities);
  useLayoutEffect(() => {
    const previous = previousCapabilities.current;
    previousCapabilities.current = capabilities;
    const lostWrite =
      (previous.canCreate && !capabilities.canCreate) || (previous.canUpdate && !capabilities.canUpdate);
    if (lostWrite) {
      context.componentEditor.retire();
      context.incidentEditor.retire();
      context.orgSave.retireWrite();
      context.components.retireWrite();
      context.incidents.retireWrite();
    }
    if (previous.canDelete && !capabilities.canDelete) {
      context.components.retireDelete();
      context.incidents.retireDelete();
    }
  }, [capabilities, context]);
}

function canSave(id: number | undefined, capabilities: StatusManagementActionCapabilities) {
  return id == null ? capabilities.canCreate : capabilities.canUpdate;
}

function permissionFailure() {
  return new StatusRequestFailure('permission', 'rejected');
}
