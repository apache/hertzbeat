/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import type { QueryClient } from '@tanstack/react-query';
import { App } from 'antd';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { loadCollectorMutationProofPage, mutateCollectors } from '../api/collector-management-api';
import type {
  CollectorMutationAction,
  CollectorMutationCommand,
  CollectorMutationFailure,
  CollectorPage
} from '../model/collector-model';
import {
  collectorQueryAfterConfirmedDelete,
  sameCollectorQuery,
  type CollectorDeletePageReceipt,
  type CollectorQuery
} from '../model/collector-query-model';
import { executeCollectorMutation } from './collector-mutation';
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
  const [pendingAction, setPendingAction] = useState<PendingCollectorAction | null>(null);
  const [mutating, setMutating] = useState(false);
  const [mutationFailure, setMutationFailure] = useState<CollectorMutationFailure | null>(null);
  const [proofFailure, setProofFailure] = useState(false);
  const requestAction = useCollectorActionRequest(options, mutating, setMutationFailure, setPendingAction);
  const confirmAction = useCallback(async () => {
    if (!pendingAction || mutating) return;
    if (!sameCollectorQuery(pendingAction.receipt.query, options.queryRef.current)) return setPendingAction(null);
    const command = { action: pendingAction.action, collectors: pendingAction.collectors };
    const proofQuery = pendingAction.receipt.query;
    let proofPage: CollectorPage | undefined;
    setMutating(true);
    setMutationFailure(null);
    setProofFailure(false);
    await options.queryClient.cancelQueries({ queryKey: collectorQueryKeys.page(proofQuery), exact: true });
    const result = await executeCollectorMutation(
      command,
      current => mutateCollectors(current.action, current.collectors),
      async () => {
        proofPage = await loadCollectorMutationProofPage(proofQuery);
        options.queryClient.setQueryData(collectorQueryKeys.page(proofQuery), proofPage);
        return proofPage.content;
      }
    );
    setMutating(false);
    setPendingAction(null);
    options.clearSelection();
    if (result.kind === 'confirmed') {
      const nextQuery = mutationNavigationQuery(command, pendingAction.receipt);
      const originalQueryIsCurrent = sameCollectorQuery(pendingAction.receipt.query, options.queryRef.current);
      if (originalQueryIsCurrent && !sameCollectorQuery(nextQuery, options.queryRef.current)) {
        options.navigateQuery(nextQuery, true);
      }
      void message.success(t('collectors.mutationSuccess'));
      return;
    }
    setMutationFailure(result.failure);
    if (result.failure === 'unavailable' && !proofPage) setProofFailure(true);
  }, [message, mutating, options, pendingAction, t]);
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
    }
  };
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
