/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { useNotification } from '@refinedev/core';
import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useRef, type Dispatch, type RefObject, type SetStateAction } from 'react';

import type { BulletinDependencyProof } from '../model/bulletin-dependency-proof';
import { classifyBulletinFailure, type BulletinFailureKind } from '../model/bulletin-failure';
import type { Bulletin } from '../model/bulletin-model';
import type { BulletinEditorController, BulletinOperationGate } from './bulletin-editor-controller';
import { refreshBulletinListProjection } from './bulletin-list-projection';
import { refreshSavedBulletinMetrics } from './bulletin-metrics-controller';
import { getValidBulletinDraft } from './bulletin-transaction-validation';
import {
  deleteBulletinWithProof,
  retryBulletinProof,
  saveBulletinWithProof,
  type BulletinProofResult
} from './bulletin-write-operations';

type StateSetter<T> = Dispatch<SetStateAction<T>>;
type BulletinValidationProof = Pick<
  BulletinDependencyProof,
  'fieldSelection' | 'kind' | 'metrics' | 'monitorSelection' | 'monitors'
>;

type TransactionContext = {
  dependencies: BulletinValidationProof;
  editor: BulletinEditorController;
  gate: BulletinOperationGate;
  refresh: () => Promise<boolean>;
  selectedId: number | null;
  setSelectedId: StateSetter<number | null>;
  t: (key: string) => string;
};

export function useBulletinTransactions(context: TransactionContext) {
  const client = useQueryClient();
  const notification = useNotification();
  const confirmedDeletedIds = useRef(new Set<number>());
  return {
    remove: useBulletinRemove(context, client, notification, confirmedDeletedIds),
    retry: useBulletinRecovery(context, client, notification, confirmedDeletedIds),
    save: useBulletinSave(context, client, notification)
  };
}

function useBulletinSave(
  context: TransactionContext,
  client: ReturnType<typeof useQueryClient>,
  notification: ReturnType<typeof useNotification>
) {
  return useCallback(async () => {
    const draft = getValidDraft(context, notification);
    if (!draft) return false;
    const owner = context.gate.begin('saving');
    if (!owner) return false;
    context.editor.controls.invalidateDetail();
    let saved: Bulletin | null = null;
    try {
      saved = await saveBulletinWithProof(draft, context.gate, owner);
      if (!saved || !context.gate.isCurrent(owner)) return false;
      await confirmSave(saved, context, client, notification, owner);
    } catch (reason) {
      if (context.gate.isCurrent(owner)) notify(notification, context.t, 'save', classifyBulletinFailure(reason));
      return false;
    } finally {
      context.gate.end(owner);
    }
    try {
      await refreshSavedBulletinMetrics(client, saved.id);
    } catch {
      // Metrics owns its unavailable/error state after the write itself is confirmed.
    }
    return true;
  }, [client, context, notification]);
}

function useBulletinRemove(
  context: TransactionContext,
  client: ReturnType<typeof useQueryClient>,
  notification: ReturnType<typeof useNotification>,
  confirmedDeletedIdsRef: RefObject<Set<number>>
) {
  return useCallback(
    async (record: Bulletin) => {
      const confirmedDeletedIds = confirmedDeletedIdsRef.current;
      if (confirmedDeletedIds.has(record.id)) return false;
      const owner = context.gate.begin('deleting');
      if (!owner) return false;
      context.editor.controls.invalidateDetail();
      try {
        const confirmed = await deleteBulletinWithProof(record.id, context.gate, owner);
        if (!confirmed || !context.gate.isCurrent(owner)) return false;
        await confirmDelete(record.id, context, client, notification, confirmedDeletedIds, owner);
        return true;
      } catch (reason) {
        if (context.gate.isCurrent(owner)) {
          notify(notification, context.t, 'deleteError', classifyBulletinFailure(reason));
        }
        return false;
      } finally {
        context.gate.end(owner);
      }
    },
    [client, confirmedDeletedIdsRef, context, notification]
  );
}

function useBulletinRecovery(
  context: TransactionContext,
  client: ReturnType<typeof useQueryClient>,
  notification: ReturnType<typeof useNotification>,
  confirmedDeletedIdsRef: RefObject<Set<number>>
) {
  return useCallback(async () => {
    const confirmedDeletedIds = confirmedDeletedIdsRef.current;
    const admission = context.gate.beginRecovery();
    if (!admission) return false;
    const { owner, recovery } = admission;
    try {
      if (recovery.stage === 'projection') {
        const projected = await refreshBulletinListProjection(client, context.refresh, () =>
          context.gate.isCurrent(owner)
        );
        if (!context.gate.isCurrent(owner)) return false;
        if (projected) context.gate.clearRecovery(owner);
        else context.gate.setRecovery(owner, { ...recovery, failure: 'error' });
        return projected;
      }
      const result = await retryBulletinProof(recovery, context.gate, owner);
      if (!result || !context.gate.isCurrent(owner)) return false;
      await confirmProofResult(result, context, client, notification, confirmedDeletedIds, owner);
      return true;
    } catch (reason) {
      if (context.gate.isCurrent(owner)) {
        const operation = recovery.stage === 'delete-proof' ? 'deleteError' : 'save';
        notify(notification, context.t, operation, classifyBulletinFailure(reason));
      }
      return false;
    } finally {
      context.gate.end(owner);
    }
  }, [client, confirmedDeletedIdsRef, context, notification]);
}

async function confirmProofResult(
  result: BulletinProofResult,
  context: TransactionContext,
  client: ReturnType<typeof useQueryClient>,
  notification: ReturnType<typeof useNotification>,
  confirmedDeletedIds: Set<number>,
  owner: Parameters<BulletinOperationGate['isCurrent']>[0]
) {
  if (result.operation === 'save') {
    await confirmSave(result.saved, context, client, notification, owner);
    return;
  }
  await confirmDelete(result.id, context, client, notification, confirmedDeletedIds, owner);
}

async function confirmSave(
  saved: Bulletin,
  context: TransactionContext,
  client: ReturnType<typeof useQueryClient>,
  notification: ReturnType<typeof useNotification>,
  owner: Parameters<BulletinOperationGate['isCurrent']>[0]
) {
  if (!context.gate.isCurrent(owner)) return;
  context.setSelectedId(saved.id);
  context.editor.controls.setDraft(null);
  notification.open?.({ message: context.t('bulletin.saveSuccess'), type: 'success' });
  await retainProjectionFailure(context, client, owner);
}

async function confirmDelete(
  id: number,
  context: TransactionContext,
  client: ReturnType<typeof useQueryClient>,
  notification: ReturnType<typeof useNotification>,
  confirmedDeletedIds: Set<number>,
  owner: Parameters<BulletinOperationGate['isCurrent']>[0]
) {
  if (!context.gate.isCurrent(owner)) return;
  confirmedDeletedIds.add(id);
  if (context.selectedId === id) context.setSelectedId(null);
  notification.open?.({ message: context.t('bulletin.deleteSuccess'), type: 'success' });
  await retainProjectionFailure(context, client, owner);
}

async function retainProjectionFailure(
  context: TransactionContext,
  client: ReturnType<typeof useQueryClient>,
  owner: Parameters<BulletinOperationGate['isCurrent']>[0]
) {
  const projected = await refreshBulletinListProjection(client, context.refresh, () => context.gate.isCurrent(owner));
  if (context.gate.isCurrent(owner) && !projected) {
    context.gate.setRecovery(owner, { stage: 'projection', failure: 'error' });
  }
}

function getValidDraft(context: TransactionContext, notification: ReturnType<typeof useNotification>) {
  return getValidBulletinDraft(context.editor.controls.getDraft(), context.dependencies, () =>
    notification.open?.({ message: context.t('bulletin.validation'), type: 'error' })
  );
}

function notify(
  notification: ReturnType<typeof useNotification>,
  t: (key: string) => string,
  operation: 'save' | 'deleteError',
  failure: BulletinFailureKind
) {
  notification.open?.({ message: t(`bulletin.${operation}.${failure}`), type: 'error' });
}
