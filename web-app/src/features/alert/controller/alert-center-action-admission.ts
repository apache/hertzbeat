/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { canRetryAlertCenterRecovery, type AlertCapabilities } from '../model/alert-capability-model';
import type { AlertListState } from '../model/alert-center-view-model';
import type { AlertGroupTargetStatus } from '../model/alert-model';
import type { AlertCenterStatusAction } from '../model/alert-center-operation-state';
import type { useAlertCenterOperationController } from './use-alert-center-operation-controller';

type AlertCenterOperation = ReturnType<typeof useAlertCenterOperationController>;

// Fail closed here because presentation visibility is not an action-admission boundary.
export function createAlertCenterActionCommands(
  capabilities: AlertCapabilities,
  operation: AlertCenterOperation,
  list: AlertListState,
  selectedIds: number[],
  selectIds: (ids: number[]) => void
) {
  const updateStatus = (ids: number[], target: AlertGroupTargetStatus, action: AlertCenterStatusAction) =>
    capabilities.canUpdateStatus && ids.length > 0
      ? operation.updateStatus(ids, target, action)
      : Promise.resolve(false);
  const updateSelectedStatus = (
    source: AlertGroupTargetStatus,
    target: AlertGroupTargetStatus,
    action: AlertCenterStatusAction
  ) => updateStatus(selectedAlertIdsByStatus(list, selectedIds, source), target, action);
  const removeGroups = (ids: number[]) =>
    capabilities.canDeleteGroups && ids.length > 0 ? operation.remove(ids) : Promise.resolve(false);
  const select = (ids: number[]) => {
    if (capabilities.canSelect) selectIds(ids);
  };
  return {
    clearSelection: () => select([]),
    retryOperation: () =>
      canRetryAlertCenterRecovery(capabilities, operation.recovery) ? operation.retry() : Promise.resolve(false),
    acknowledge: (group: { id: number }) => updateStatus([group.id], 'acknowledged', 'acknowledge'),
    acknowledgeSelected: () => updateSelectedStatus('firing', 'acknowledged', 'acknowledge'),
    remove: (group: { id: number }) => removeGroups([group.id]),
    removeSelected: () => removeGroups(selectedIds),
    resolve: (group: { id: number }) => updateStatus([group.id], 'resolved', 'resolve'),
    resolveSelected: () => updateSelectedStatus('firing', 'resolved', 'resolve'),
    reopen: (group: { id: number }) => updateStatus([group.id], 'firing', 'reopen'),
    reopenSelected: () => updateSelectedStatus('resolved', 'firing', 'reopen'),
    selectIds: select,
    unacknowledge: (group: { id: number }) => updateStatus([group.id], 'firing', 'unacknowledge'),
    unacknowledgeSelected: () => updateSelectedStatus('acknowledged', 'firing', 'unacknowledge')
  };
}

function selectedAlertIdsByStatus(
  list: AlertListState,
  selectedIds: readonly number[],
  status: AlertGroupTargetStatus
) {
  if (list.kind !== 'ready') return [];
  const selected = new Set(selectedIds);
  return list.records.filter(group => selected.has(group.id) && group.status === status).map(group => group.id);
}
