/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { useEffect, useLayoutEffect, useMemo, useState, type Dispatch, type SetStateAction } from 'react';

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
  const owner = useMemo(() => createMonitorDefinitionOperationOwner(), []);
  const authority = useMemo(() => createMonitorDefinitionOperationOwner(), []);
  const [state, setState] = useState<DeleteState>(() => emptyDeleteState(authority.snapshot()));
  const [notice, setNotice] = useState<MonitorDefinitionDeleteDisposition | null>(null);
  const authorityEpoch = authority.snapshot();
  const actionEpoch = owner.snapshot();
  useLayoutEffect(() => {
    if (canWrite) return;
    authority.retire();
    owner.retire();
  }, [authority, canWrite, owner]);
  useEffect(
    () => () => {
      authority.retire();
      owner.retire();
    },
    [authority, owner]
  );
  const visibleState = canWrite && authority.matches(state.authorityEpoch) ? state : emptyDeleteState(authorityEpoch);
  const context = {
    state: visibleState,
    canWrite,
    authority,
    authorityEpoch,
    actionEpoch,
    owner,
    catalogProof,
    onChanged,
    setState,
    setNotice
  };
  return {
    deleteFailure: visibleState.failure,
    deletePending: visibleState.pending,
    deleteTarget: visibleState.target,
    deleteWriteRecovery: visibleState.writeRecovery,
    notice,
    actions: monitorDefinitionDeleteActions(context)
  };
}

type DeleteState = {
  authorityEpoch: number;
  target: MonitorDefinitionCatalogItem | null;
  pending: boolean;
  failure: MonitorDefinitionFailureKind | null;
  writeRecovery: 'uncertain' | null;
};

type DeleteActionContext = {
  state: DeleteState;
  canWrite: boolean;
  authority: MonitorDefinitionOperationOwner;
  authorityEpoch: number;
  actionEpoch: number;
  owner: MonitorDefinitionOperationOwner;
  catalogProof: MonitorDefinitionCatalogProof;
  onChanged: () => void;
  setState: Dispatch<SetStateAction<DeleteState>>;
  setNotice: (value: MonitorDefinitionDeleteDisposition) => void;
};

function monitorDefinitionDeleteActions(context: DeleteActionContext) {
  return {
    requestDelete: (item: MonitorDefinitionCatalogItem) => {
      if (
        !context.canWrite ||
        !context.authority.matches(context.authorityEpoch) ||
        !context.owner.matches(context.actionEpoch) ||
        !item.deletable ||
        context.state.target !== null ||
        context.owner.busy()
      )
        return;
      context.owner.retire();
      context.setState({
        authorityEpoch: context.authority.snapshot(),
        target: item,
        pending: false,
        failure: null,
        writeRecovery: null
      });
    },
    cancelDelete: () => {
      if (
        context.authority.matches(context.state.authorityEpoch) &&
        context.owner.matches(context.actionEpoch) &&
        (!context.owner.busy() || context.owner.recoveryCancelable())
      ) {
        context.owner.retire();
        context.setState(emptyDeleteState(context.authority.snapshot()));
      }
    },
    confirmDelete: () => confirmMonitorDefinitionDelete(context),
    retryDeleteProof: () => retryMonitorDefinitionDeleteProof(context)
  };
}

async function confirmMonitorDefinitionDelete(context: DeleteActionContext) {
  const { owner } = context;
  const target = admittedDeleteTarget(context, null);
  if (!target) return;
  const operation = owner.begin('exclusive-command');
  context.setState(current => ({ ...current, pending: true, failure: null }));
  try {
    const receipt = await deleteMonitorDefinition(target.app, target.revision, operation.abort.signal);
    if (!owner.owns(operation)) return;
    context.setNotice(receipt.disposition);
    context.setState(emptyDeleteState(context.authority.snapshot()));
    context.onChanged();
  } catch (error) {
    await handleMonitorDefinitionDeleteFailure(context, operation, error);
  } finally {
    if (owner.owns(operation)) {
      owner.complete(operation);
      context.setState(current => ({ ...current, pending: false }));
    }
  }
}

async function retryMonitorDefinitionDeleteProof(context: DeleteActionContext) {
  const { owner } = context;
  if (!admittedDeleteTarget(context, 'uncertain')) return;
  const operation = owner.begin('catalog-proof');
  context.setState(current => ({ ...current, pending: true }));
  await proveOwnedMonitorDefinitionCatalog(context.catalogProof, operation, owner);
  if (owner.owns(operation)) {
    owner.complete(operation);
    context.setState(current => ({ ...current, pending: false }));
  }
}

function admittedDeleteTarget(context: DeleteActionContext, recovery: 'uncertain' | null) {
  return context.canWrite &&
    context.authority.matches(context.state.authorityEpoch) &&
    context.owner.matches(context.actionEpoch) &&
    context.state.writeRecovery === recovery &&
    !context.owner.busy()
    ? context.state.target
    : null;
}

async function handleMonitorDefinitionDeleteFailure(
  context: DeleteActionContext,
  operation: Parameters<MonitorDefinitionOperationOwner['owns']>[0],
  error: unknown
) {
  if (!context.owner.owns(operation)) return;
  const failure = error instanceof MonitorDefinitionRequestError ? error.kind : 'error';
  const requiresProof = monitorDefinitionWriteNeedsCatalogProof(error);
  if (requiresProof) {
    context.owner.markCatalogProof(operation);
    context.setState(current => ({ ...current, pending: true, failure, writeRecovery: 'uncertain' }));
    await proveOwnedMonitorDefinitionCatalog(context.catalogProof, operation, context.owner);
  }
  if (!context.owner.owns(operation)) return;
  context.setState(current => ({
    ...current,
    pending: true,
    failure,
    writeRecovery: requiresProof ? 'uncertain' : null
  }));
}

function emptyDeleteState(authorityEpoch: number): DeleteState {
  return { authorityEpoch, target: null, pending: false, failure: null, writeRecovery: null };
}
