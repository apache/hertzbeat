/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { useNotification } from '@refinedev/core';
import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useRef, type Dispatch, type SetStateAction } from 'react';

import {
  classifyBulletinError,
  createBulletinAndRead,
  deleteBulletinAndConfirm,
  updateBulletinAndRead
} from '../api/bulletin-api';
import { validateBulletinDraft, type Bulletin, type BulletinDraft } from '../model/bulletin-model';
import type { BulletinDependencies } from './bulletin-dependencies-controller';
import type { BulletinEditorController, BulletinOperationGate } from './bulletin-editor-controller';
import { refreshSavedBulletinMetrics } from './bulletin-metrics-controller';
import { bulletinQueryKeys } from './bulletin-query-keys';

type BulletinFailure = 'missing' | 'invalid' | 'unavailable' | 'error';
type StateSetter<T> = Dispatch<SetStateAction<T>>;

type TransactionContext = {
  dependencies: BulletinDependencies;
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
  return {
    remove: useBulletinRemove(context, client, notification),
    save: useBulletinSave(context, client, notification)
  };
}

function useBulletinSave(
  context: TransactionContext,
  client: ReturnType<typeof useQueryClient>,
  notification: ReturnType<typeof useNotification>
) {
  const { dependencies, editor, gate, refresh, setSelectedId, t } = context;
  return useCallback(async () => {
    const draft = getValidDraft(editor, dependencies, notification, t);
    if (!draft) return false;
    const owner = gate.begin('saving');
    if (!owner) return false;
    editor.controls.invalidateDetail();
    let saved: Bulletin | undefined;
    try {
      saved = await saveCanonicalBulletin(draft);
      if (!gate.isCurrent(owner)) return false;
      await refreshListProjection(client, refresh, () => gate.isCurrent(owner));
      if (!gate.isCurrent(owner)) return false;

      // Retire the submitted draft while this command still owns the editor.
      setSelectedId(saved.id);
      editor.controls.setDraft(null);
      notification.open?.({ message: t('bulletin.saveSuccess'), type: 'success' });
    } catch (error) {
      if (!gate.isCurrent(owner)) return false;
      const operation = draft.id == null ? 'create' : 'update';
      notify(notification, t, 'save', classifyBulletinError(error, operation));
      return false;
    } finally {
      gate.end(owner);
    }
    try {
      await refreshSavedBulletinMetrics(client, saved.id);
    } catch {
      // The metrics query owns its unavailable/error state. The write is already confirmed.
    }
    return true;
  }, [client, dependencies, editor, gate, notification, refresh, setSelectedId, t]);
}

function getValidDraft(
  editor: BulletinEditorController,
  dependencies: BulletinDependencies,
  notification: ReturnType<typeof useNotification>,
  t: (key: string) => string
) {
  const draft = editor.controls.getDraft();
  if (!draft || dependencies.kind !== 'ready') return null;
  if (validateBulletinDraft(draft, dependencies.monitors, dependencies.metrics).length) {
    notification.open?.({ message: t('bulletin.validation'), type: 'error' });
    return null;
  }
  return draft;
}

function saveCanonicalBulletin(draft: BulletinDraft) {
  return draft.id == null ? createBulletinAndRead(draft) : updateBulletinAndRead(draft);
}

function useBulletinRemove(
  context: TransactionContext,
  client: ReturnType<typeof useQueryClient>,
  notification: ReturnType<typeof useNotification>
) {
  const { editor, gate, refresh, selectedId, setSelectedId, t } = context;
  const confirmedDeletedIdsRef = useRef(new Set<number>());
  return useCallback(
    async (record: Bulletin) => {
      if (confirmedDeletedIdsRef.current.has(record.id)) return false;
      const owner = gate.begin('deleting');
      if (!owner) return false;
      editor.controls.invalidateDetail();
      try {
        await deleteBulletinAndConfirm(record.id);
        if (!gate.isCurrent(owner)) return false;
        confirmedDeletedIdsRef.current.add(record.id);
        await refreshListProjection(client, refresh, () => gate.isCurrent(owner));
        if (!gate.isCurrent(owner)) return false;

        // The delete proof is authoritative; a stale list projection must not make it repeatable.
        if (selectedId === record.id) setSelectedId(null);
        notification.open?.({ message: t('bulletin.deleteSuccess'), type: 'success' });
        return true;
      } catch (error) {
        if (!gate.isCurrent(owner)) return false;
        notify(notification, t, 'deleteError', classifyBulletinError(error, 'delete'));
        return false;
      } finally {
        gate.end(owner);
      }
    },
    [client, editor, gate, notification, refresh, selectedId, setSelectedId, t]
  );
}

async function refreshListProjection(
  client: ReturnType<typeof useQueryClient>,
  refresh: () => Promise<boolean>,
  isCurrent: () => boolean
) {
  try {
    await client.invalidateQueries({ queryKey: bulletinQueryKeys.lists() });
    if (isCurrent()) await refresh();
  } catch {
    // The canonical mutation helper already proved the write. Query state exposes projection failure.
  }
}

function notify(
  notification: ReturnType<typeof useNotification>,
  t: (key: string) => string,
  operation: 'save' | 'deleteError',
  failure: BulletinFailure
) {
  notification.open?.({ message: t(`bulletin.${operation}.${failure}`), type: 'error' });
}
