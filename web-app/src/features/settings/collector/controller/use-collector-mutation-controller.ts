/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import type { QueryClient } from '@tanstack/react-query';
import { App } from 'antd';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { loadCollectorMutationProofPage, mutateCollectors } from '../api/collector-management-api';
import type {
  CollectorMutationAction,
  CollectorMutationCommand,
  CollectorMutationFailure,
  CollectorPage
} from '../model/collector-model';
import type { CollectorActionCapabilities } from '../model/collector-action-capability';
import {
  collectorQueryAfterConfirmedDelete,
  sameCollectorQuery,
  type CollectorDeletePageReceipt,
  type CollectorQuery
} from '../model/collector-query-model';
import { executeCollectorMutation } from './collector-mutation';
import {
  createCollectorMutationOwnership,
  type CollectorMutationOperation,
  type CollectorMutationOwnership
} from './collector-mutation-ownership';
import { collectorQueryKeys } from './collector-query-keys';

type PendingCollectorAction = CollectorMutationCommand & { receipt: CollectorDeletePageReceipt };
type Options = {
  query: CollectorQuery;
  queryRef: { current: CollectorQuery };
  recordsLength: number;
  visibleMutableNames: string[];
  queryClient: QueryClient;
  navigateQuery: (next: CollectorQuery, replace?: boolean) => void;
  clearSelection: () => void;
};

export function useCollectorMutationController(options: Options) {
  const { t } = useTranslation();
  const { message } = App.useApp();
  const ownership = useMemo(() => createCollectorMutationOwnership(), []);
  const [pendingAction, setPendingAction] = useState<PendingCollectorAction | null>(null);
  const [mutating, setMutating] = useState(false);
  const [mutationFailure, setMutationFailure] = useState<CollectorMutationFailure | null>(null);
  const [proofFailure, setProofFailure] = useState(false);
  const requestAction = useCollectorActionRequest(options, mutating, setMutationFailure, setPendingAction);
  const confirmAction = useCollectorMutationConfirm(options, pendingAction, mutating, ownership, {
    setPendingAction,
    setMutating,
    setMutationFailure,
    setProofFailure,
    success: () => void message.success(t('collectors.mutationSuccess'))
  });
  useEffect(() => () => ownership.retire(), [ownership]);
  return {
    pendingAction,
    mutating,
    mutationFailure,
    proofFailure,
    requestAction,
    confirmAction,
    cancelAction: () => {
      if (!mutating) setPendingAction(null);
    },
    refresh: (refetch: () => unknown) => {
      if (mutating) return;
      setMutationFailure(null);
      setProofFailure(false);
      void refetch();
    },
    retireUnauthorized: (capabilities: CollectorActionCapabilities) => {
      const action = ownership.activeAction() ?? pendingAction?.action;
      if (action && !actionAllowed(action, capabilities)) {
        ownership.retire();
        setPendingAction(null);
        setMutating(false);
      }
      if (!capabilities.canWrite && !capabilities.canDelete) options.clearSelection();
    }
  };
}

type MutationControls = {
  setPendingAction: (value: PendingCollectorAction | null) => void;
  setMutating: (value: boolean) => void;
  setMutationFailure: (value: CollectorMutationFailure | null) => void;
  setProofFailure: (value: boolean) => void;
  success: () => void;
};

function useCollectorMutationConfirm(
  options: Options,
  pending: PendingCollectorAction | null,
  mutating: boolean,
  ownership: CollectorMutationOwnership,
  controls: MutationControls
) {
  return useCallback(async () => {
    if (!pending || mutating || ownership.busy()) return;
    if (!sameCollectorQuery(pending.receipt.query, options.queryRef.current)) return controls.setPendingAction(null);
    const command = { action: pending.action, collectors: pending.collectors };
    const operation = ownership.begin(command);
    controls.setMutating(true);
    controls.setMutationFailure(null);
    controls.setProofFailure(false);
    const proofQuery = pending.receipt.query;
    await options.queryClient.cancelQueries({ queryKey: collectorQueryKeys.page(proofQuery), exact: true });
    if (!ownership.owns(operation)) return;
    let proofPage: CollectorPage | undefined;
    const result = await executeCollectorMutation(
      command,
      current => mutateCollectors(current.action, current.collectors, operation.abort.signal),
      async () => {
        proofPage = await loadOwnedProof(options, proofQuery, operation, ownership);
        return proofPage.content;
      }
    );
    if (!ownership.owns(operation)) return;
    ownership.complete(operation);
    controls.setMutating(false);
    controls.setPendingAction(null);
    options.clearSelection();
    if (result.kind === 'confirmed') {
      publishConfirmedMutation(options, command, pending.receipt);
      controls.success();
    } else {
      controls.setMutationFailure(result.failure);
      if (result.failure === 'unavailable' && !proofPage) controls.setProofFailure(true);
    }
  }, [controls, mutating, options, ownership, pending]);
}

async function loadOwnedProof(
  options: Options,
  query: CollectorQuery,
  operation: CollectorMutationOperation,
  ownership: CollectorMutationOwnership
) {
  operation.abort.signal.throwIfAborted();
  const page = await loadCollectorMutationProofPage(query, operation.abort.signal);
  // A transport may still settle after abort, so ownership gates cache publication.
  if (!ownership.owns(operation)) throw new DOMException('Collector mutation retired', 'AbortError');
  options.queryClient.setQueryData(collectorQueryKeys.page(query), page);
  return page;
}

function publishConfirmedMutation(
  options: Options,
  command: CollectorMutationCommand,
  receipt: CollectorDeletePageReceipt
) {
  const nextQuery = mutationNavigationQuery(command, receipt);
  const originalQueryIsCurrent = sameCollectorQuery(receipt.query, options.queryRef.current);
  if (originalQueryIsCurrent && !sameCollectorQuery(nextQuery, options.queryRef.current)) {
    options.navigateQuery(nextQuery, true);
  }
}

function actionAllowed(action: CollectorMutationAction, capabilities: CollectorActionCapabilities) {
  return action === 'delete' ? capabilities.canDelete : capabilities.canWrite;
}

function useCollectorActionRequest(
  options: Options,
  mutating: boolean,
  setFailure: (failure: CollectorMutationFailure | null) => void,
  setPending: (command: PendingCollectorAction) => void
) {
  return useCallback(
    (action: CollectorMutationAction, collectors: string[]) => {
      if (mutating || collectors.length === 0) return;
      const unique = [...new Set(collectors)];
      if (unique.length !== collectors.length || unique.some(name => !options.visibleMutableNames.includes(name)))
        return;
      setFailure(null);
      setPending({
        action,
        collectors: unique,
        receipt: { query: options.query, visibleRecords: options.recordsLength }
      });
    },
    [mutating, options.query, options.recordsLength, options.visibleMutableNames, setFailure, setPending]
  );
}

function mutationNavigationQuery(command: CollectorMutationCommand, receipt: CollectorDeletePageReceipt) {
  if (command.action !== 'delete' || command.collectors.length !== receipt.visibleRecords) return receipt.query;
  return collectorQueryAfterConfirmedDelete(receipt.query, receipt, command.collectors.length) ?? receipt.query;
}
