/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { useNotification } from '@refinedev/core';
import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useRef, type Dispatch, type RefObject, type SetStateAction } from 'react';

import type { BulletinDependencyProof } from '../model/bulletin-dependency-proof';
import { classifyBulletinFailure, type BulletinFailureKind } from '../model/bulletin-failure';
import { normalizeBulletinIds, type Bulletin } from '../model/bulletin-model';
import { bulletinRecoveryOperation } from '../model/bulletin-operation-state';
import type { BulletinEditorController } from './bulletin-editor-controller';
import type { BulletinOperationGate } from './bulletin-operation-gate';
import { refreshBulletinListProjection } from './bulletin-list-projection';
import { refreshSavedBulletinMetrics } from './bulletin-metrics-controller';
import {
  confirmBulletinDelete,
  confirmBulletinProofResult,
  confirmBulletinSave
} from './bulletin-transaction-confirmation';
import { getValidBulletinDraft } from './bulletin-transaction-validation';
import { deleteBulletinsWithProof, retryBulletinProof, saveBulletinWithProof } from './bulletin-write-operations';

type StateSetter<T> = Dispatch<SetStateAction<T>>;
type BulletinValidationProof = Pick<
  BulletinDependencyProof,
  'fieldSelection' | 'kind' | 'metrics' | 'monitorSelection' | 'monitors'
>;

type TransactionContext = {
  canDeleteRef: RefObject<boolean>;
  canWriteRef: RefObject<boolean>;
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
  const removeMany = useBulletinRemove(context, client, notification, confirmedDeletedIds);
  return {
    remove: (record: Bulletin) => removeMany([record.id], false),
    removeMany: (ids: readonly number[]) => removeMany(ids, true),
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
    if (!context.canWriteRef.current) return false;
    const draft = getValidDraft(context, notification);
    if (!draft) return false;
    const owner = context.gate.begin('saving');
    if (!owner) return false;
    context.editor.controls.invalidateDetail();
    let saved: Bulletin | null = null;
    try {
      saved = await saveBulletinWithProof(draft, context.gate, owner);
      if (!saved || !context.gate.isCurrent(owner)) return false;
      await confirmBulletinSave(saved, context, client, notification, owner);
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
    async (ids: readonly number[], batch: boolean) => {
      if (!context.canDeleteRef.current) return false;
      let canonicalIds: number[];
      try {
        canonicalIds = normalizeBulletinIds(ids);
      } catch (reason) {
        notify(notification, context.t, 'deleteError', classifyBulletinFailure(reason));
        return false;
      }
      const confirmedDeletedIds = confirmedDeletedIdsRef.current;
      if (canonicalIds.some(id => confirmedDeletedIds.has(id))) return false;
      const owner = context.gate.begin('deleting');
      if (!owner) return false;
      context.editor.controls.invalidateDetail();
      try {
        const confirmed = await deleteBulletinsWithProof(canonicalIds, batch, context.gate, owner);
        if (!confirmed || !context.gate.isCurrent(owner)) return false;
        await confirmBulletinDelete(canonicalIds, batch, context, client, notification, confirmedDeletedIds, owner);
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
    if (!canRetryBulletinRecovery(context)) return false;
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
      await confirmBulletinProofResult(result, context, client, notification, confirmedDeletedIds, owner);
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

function canRetryBulletinRecovery(context: TransactionContext) {
  const recovery = context.gate.getRecovery();
  if (!recovery) return false;
  const operation = bulletinRecoveryOperation(recovery);
  return operation === 'save' ? context.canWriteRef.current : context.canDeleteRef.current;
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
