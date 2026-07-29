/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';

import { deleteMonitorDefinition, MonitorDefinitionRequestError } from '../api/monitor-definition-api';
import {
  type MonitorDefinitionCatalogItem,
  type MonitorDefinitionDeleteDisposition,
  type MonitorDefinitionFailureKind
} from '../model/monitor-definition-model';
import {
  monitorDefinitionWriteNeedsCatalogProof,
  proveOwnedMonitorDefinitionCatalog,
  type MonitorDefinitionCatalogProof
} from './monitor-definition-catalog-proof';
import {
  createMonitorDefinitionOperationOwner,
  type MonitorDefinitionOperationOwner
} from './monitor-definition-operation-owner';

export function useMonitorDefinitionDelete(
  canWrite: boolean,
  catalogProof: MonitorDefinitionCatalogProof,
  onChanged: () => void
) {
  const [deleteTarget, setDeleteTarget] = useState<MonitorDefinitionCatalogItem | null>(null);
  const [deletePending, setDeletePending] = useState(false);
  const [deleteFailure, setDeleteFailure] = useState<MonitorDefinitionFailureKind | null>(null);
  const [deleteWriteRecovery, setDeleteWriteRecovery] = useState<'uncertain' | null>(null);
  const [notice, setNotice] = useState<MonitorDefinitionDeleteDisposition | null>(null);
  const owner = useMemo(() => createMonitorDefinitionOperationOwner(), []);
  const canWriteRef = useRef(canWrite);
  const targetRef = useRef(deleteTarget);
  const deleteWriteRecoveryRef = useRef(deleteWriteRecovery);
  canWriteRef.current = canWrite;
  targetRef.current = deleteTarget;
  deleteWriteRecoveryRef.current = deleteWriteRecovery;
  const actionEpoch = owner.snapshot();
  useLayoutEffect(() => {
    if (canWrite) return;
    owner.retire();
    setDeleteTarget(null);
    setDeletePending(false);
    setDeleteFailure(null);
    setDeleteWriteRecovery(null);
  }, [canWrite, owner]);
  useEffect(() => () => owner.retire(), [owner]);
  const context = {
    target: deleteTarget,
    targetRef,
    deleteWriteRecoveryRef,
    canWriteRef,
    actionEpoch,
    owner,
    catalogProof,
    onChanged,
    setDeleteTarget,
    setDeletePending,
    setDeleteFailure,
    setDeleteWriteRecovery,
    setNotice
  };
  return {
    deleteFailure,
    deletePending,
    deleteTarget,
    deleteWriteRecovery,
    notice,
    actions: monitorDefinitionDeleteActions(context)
  };
}

type DeleteActionContext = {
  target: MonitorDefinitionCatalogItem | null;
  targetRef: { current: MonitorDefinitionCatalogItem | null };
  deleteWriteRecoveryRef: { current: 'uncertain' | null };
  canWriteRef: { current: boolean };
  actionEpoch: number;
  owner: MonitorDefinitionOperationOwner;
  catalogProof: MonitorDefinitionCatalogProof;
  onChanged: () => void;
  setDeleteTarget: (value: MonitorDefinitionCatalogItem | null) => void;
  setDeletePending: (value: boolean) => void;
  setDeleteFailure: (value: MonitorDefinitionFailureKind | null) => void;
  setDeleteWriteRecovery: (value: 'uncertain' | null) => void;
  setNotice: (value: MonitorDefinitionDeleteDisposition) => void;
};

function monitorDefinitionDeleteActions(context: DeleteActionContext) {
  return {
    requestDelete: (item: MonitorDefinitionCatalogItem) => {
      if (
        !context.canWriteRef.current ||
        !context.owner.matches(context.actionEpoch) ||
        !item.deletable ||
        context.targetRef.current !== null ||
        context.owner.busy()
      )
        return;
      context.owner.retire();
      context.setDeleteFailure(null);
      context.setDeleteWriteRecovery(null);
      context.setDeleteTarget(item);
    },
    cancelDelete: () => {
      if (
        context.owner.matches(context.actionEpoch) &&
        context.targetRef.current === context.target &&
        (!context.owner.busy() || context.owner.recoveryCancelable())
      ) {
        context.owner.retire();
        context.setDeletePending(false);
        context.setDeleteFailure(null);
        context.setDeleteWriteRecovery(null);
        context.setDeleteTarget(null);
      }
    },
    confirmDelete: () => confirmMonitorDefinitionDelete(context),
    retryDeleteProof: () => retryMonitorDefinitionDeleteProof(context)
  };
}

async function confirmMonitorDefinitionDelete(context: DeleteActionContext) {
  const { target, owner } = context;
  if (
    !target ||
    !context.canWriteRef.current ||
    !owner.matches(context.actionEpoch) ||
    context.targetRef.current !== target ||
    context.deleteWriteRecoveryRef.current !== null ||
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
    context.setDeleteWriteRecovery(null);
    context.setDeleteTarget(null);
    context.onChanged();
  } catch (error) {
    if (!owner.owns(operation)) return;
    const failure = error instanceof MonitorDefinitionRequestError ? error.kind : 'error';
    if (monitorDefinitionWriteNeedsCatalogProof(error)) {
      owner.markCatalogProof(operation);
      context.setDeleteWriteRecovery('uncertain');
      context.setDeleteFailure(failure);
      await proveOwnedMonitorDefinitionCatalog(context.catalogProof, operation, owner);
    }
    if (!owner.owns(operation)) return;
    if (!monitorDefinitionWriteNeedsCatalogProof(error)) context.setDeleteWriteRecovery(null);
    context.setDeleteFailure(failure);
  } finally {
    if (owner.owns(operation)) {
      owner.complete(operation);
      context.setDeletePending(false);
    }
  }
}

async function retryMonitorDefinitionDeleteProof(context: DeleteActionContext) {
  const { owner, target } = context;
  if (
    !target ||
    !context.canWriteRef.current ||
    !owner.matches(context.actionEpoch) ||
    context.targetRef.current !== target ||
    context.deleteWriteRecoveryRef.current !== 'uncertain' ||
    owner.busy()
  )
    return;
  const operation = owner.begin('catalog-proof');
  context.setDeletePending(true);
  await proveOwnedMonitorDefinitionCatalog(context.catalogProof, operation, owner);
  if (owner.owns(operation)) {
    owner.complete(operation);
    context.setDeletePending(false);
  }
}
