/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';

import { deleteMonitorDefinition, MonitorDefinitionRequestError } from '../api/monitor-definition-api';
import {
  monitorDefinitionNeedsCatalogReconciliation,
  type MonitorDefinitionCatalogItem,
  type MonitorDefinitionDeleteDisposition,
  type MonitorDefinitionFailureKind
} from '../model/monitor-definition-model';
import {
  createMonitorDefinitionOperationOwner,
  type MonitorDefinitionOperationOwner
} from './monitor-definition-operation-owner';

export function useMonitorDefinitionDelete(canWrite: boolean, onChanged: () => void) {
  const [deleteTarget, setDeleteTarget] = useState<MonitorDefinitionCatalogItem | null>(null);
  const [deletePending, setDeletePending] = useState(false);
  const [deleteFailure, setDeleteFailure] = useState<MonitorDefinitionFailureKind | null>(null);
  const [notice, setNotice] = useState<MonitorDefinitionDeleteDisposition | null>(null);
  const owner = useMemo(() => createMonitorDefinitionOperationOwner(), []);
  const canWriteRef = useRef(canWrite);
  const targetRef = useRef(deleteTarget);
  canWriteRef.current = canWrite;
  targetRef.current = deleteTarget;
  const actionEpoch = owner.snapshot();
  useLayoutEffect(() => {
    if (canWrite) return;
    owner.retire();
    setDeleteTarget(null);
    setDeletePending(false);
    setDeleteFailure(null);
  }, [canWrite, owner]);
  useEffect(() => () => owner.retire(), [owner]);
  const context = {
    target: deleteTarget,
    targetRef,
    canWriteRef,
    actionEpoch,
    owner,
    onChanged,
    setDeleteTarget,
    setDeletePending,
    setDeleteFailure,
    setNotice
  };
  return {
    deleteFailure,
    deletePending,
    deleteTarget,
    notice,
    actions: monitorDefinitionDeleteActions(context)
  };
}

type DeleteActionContext = {
  target: MonitorDefinitionCatalogItem | null;
  targetRef: { current: MonitorDefinitionCatalogItem | null };
  canWriteRef: { current: boolean };
  actionEpoch: number;
  owner: MonitorDefinitionOperationOwner;
  onChanged: () => void;
  setDeleteTarget: (value: MonitorDefinitionCatalogItem | null) => void;
  setDeletePending: (value: boolean) => void;
  setDeleteFailure: (value: MonitorDefinitionFailureKind | null) => void;
  setNotice: (value: MonitorDefinitionDeleteDisposition) => void;
};

function monitorDefinitionDeleteActions(context: DeleteActionContext) {
  return {
    requestDelete: (item: MonitorDefinitionCatalogItem) => {
      if (
        !context.canWriteRef.current ||
        !context.owner.matches(context.actionEpoch) ||
        !item.deletable ||
        context.owner.busy()
      )
        return;
      context.owner.retire();
      context.setDeleteFailure(null);
      context.setDeleteTarget(item);
    },
    cancelDelete: () => {
      if (
        context.owner.matches(context.actionEpoch) &&
        context.targetRef.current === context.target &&
        !context.owner.busy()
      ) {
        context.owner.retire();
        context.setDeleteTarget(null);
      }
    },
    confirmDelete: () => confirmMonitorDefinitionDelete(context)
  };
}

async function confirmMonitorDefinitionDelete(context: DeleteActionContext) {
  const { target, owner } = context;
  if (
    !target ||
    !context.canWriteRef.current ||
    !owner.matches(context.actionEpoch) ||
    context.targetRef.current !== target ||
    owner.busy()
  )
    return;
  const operation = owner.begin('exclusive-command');
  context.setDeletePending(true);
  context.setDeleteFailure(null);
  try {
    const receipt = await deleteMonitorDefinition(target.app, target.revision, operation.abort.signal);
    if (!owner.owns(operation)) return;
    context.setNotice(receipt.disposition);
    context.setDeleteTarget(null);
    context.onChanged();
  } catch (error) {
    if (!owner.owns(operation)) return;
    const failure = error instanceof MonitorDefinitionRequestError ? error.kind : 'error';
    if (monitorDefinitionNeedsCatalogReconciliation(failure)) context.onChanged();
    context.setDeleteFailure(failure);
  } finally {
    if (owner.owns(operation)) {
      owner.complete(operation);
      context.setDeletePending(false);
    }
  }
}
