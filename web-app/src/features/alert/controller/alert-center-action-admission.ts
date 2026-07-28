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
  const updateVisibleGroupStatus = (
    group: { id: number },
    sources: readonly AlertGroupTargetStatus[],
    target: AlertGroupTargetStatus,
    action: AlertCenterStatusAction
  ) => {
    const current = visibleAlertGroup(list, group.id);
    if (!current || !sources.some(status => current.status === status)) return Promise.resolve(false);
    return updateStatus([current.id], target, action);
  };
  const updateSelectedStatus = (
    sources: readonly AlertGroupTargetStatus[],
    target: AlertGroupTargetStatus,
    action: AlertCenterStatusAction
  ) => updateStatus(selectedAlertIdsByStatus(list, selectedIds, sources), target, action);
  const removeGroups = (ids: number[]) =>
    capabilities.canDeleteGroups && ids.length > 0 ? operation.remove(ids) : Promise.resolve(false);
  const select = (ids: number[]) => {
    if (capabilities.canSelect) selectIds(ids);
  };
  return {
    clearSelection: () => select([]),
    retryOperation: () =>
      canRetryAlertCenterRecovery(capabilities, operation.recovery) ? operation.retry() : Promise.resolve(false),
    acknowledge: (group: { id: number }) => updateVisibleGroupStatus(group, ['firing'], 'acknowledged', 'acknowledge'),
    acknowledgeSelected: () => updateSelectedStatus(['firing'], 'acknowledged', 'acknowledge'),
    remove: (group: { id: number }) => {
      const current = visibleAlertGroup(list, group.id);
      return current ? removeGroups([current.id]) : Promise.resolve(false);
    },
    removeSelected: () => removeGroups(selectedVisibleAlertIds(list, selectedIds)),
    resolve: (group: { id: number }) =>
      updateVisibleGroupStatus(group, ['firing', 'acknowledged'], 'resolved', 'resolve'),
    resolveSelected: () => updateSelectedStatus(['firing', 'acknowledged'], 'resolved', 'resolve'),
    reopen: (group: { id: number }) => updateVisibleGroupStatus(group, ['resolved'], 'firing', 'reopen'),
    reopenSelected: () => updateSelectedStatus(['resolved'], 'firing', 'reopen'),
    selectIds: select,
    unacknowledge: (group: { id: number }) =>
      updateVisibleGroupStatus(group, ['acknowledged'], 'firing', 'unacknowledge'),
    unacknowledgeSelected: () => updateSelectedStatus(['acknowledged'], 'firing', 'unacknowledge')
  };
}

function visibleAlertGroup(list: AlertListState, id: number) {
  return list.kind === 'ready' ? list.records.find(group => group.id === id) : undefined;
}

function selectedVisibleAlertIds(list: AlertListState, selectedIds: readonly number[]) {
  if (list.kind !== 'ready') return [];
  const selected = new Set(selectedIds);
  return list.records.filter(group => selected.has(group.id)).map(group => group.id);
}

function selectedAlertIdsByStatus(
  list: AlertListState,
  selectedIds: readonly number[],
  statuses: readonly AlertGroupTargetStatus[]
) {
  if (list.kind !== 'ready') return [];
  const selected = new Set(selectedIds);
  return list.records
    .filter(group => selected.has(group.id) && statuses.some(status => group.status === status))
    .map(group => group.id);
}
