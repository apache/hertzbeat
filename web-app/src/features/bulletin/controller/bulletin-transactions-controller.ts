/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { useNotification } from '@refinedev/core';
import { useQueryClient } from '@tanstack/react-query';
import { useCallback, type Dispatch, type SetStateAction } from 'react';

import {
  classifyBulletinError,
  createBulletinAndRead,
  deleteBulletinAndConfirm,
  loadBulletin,
  updateBulletinAndRead
} from '../api/bulletin-api';
import {
  validateBulletinDraft,
  type Bulletin,
  type BulletinDraft
} from '../model/bulletin-model';
import type { BulletinDependencies } from './bulletin-dependencies-controller';
import { refreshSavedBulletinMetrics } from './bulletin-metrics-controller';
import { bulletinQueryKeys } from './bulletin-query-keys';

type BulletinFailure = 'missing' | 'invalid' | 'unavailable' | 'error';
export type BulletinCommand = 'idle' | 'reading' | 'saving' | 'deleting';
type StateSetter<T> = Dispatch<SetStateAction<T>>;

type TransactionContext = {
  command: BulletinCommand;
  dependencies: BulletinDependencies;
  draft: BulletinDraft | null;
  refresh: () => Promise<boolean>;
  selectedId: number | null;
  setCommand: StateSetter<BulletinCommand>;
  setDraft: StateSetter<BulletinDraft | null>;
  setSelectedId: StateSetter<number | null>;
  t: (key: string) => string;
};

export function useBulletinTransactions(context: TransactionContext) {
  const client = useQueryClient();
  const notification = useNotification();
  return {
    edit: useBulletinEdit(context, notification),
    remove: useBulletinRemove(context, client, notification),
    save: useBulletinSave(context, client, notification)
  };
}

function useBulletinEdit(
  context: TransactionContext,
  notification: ReturnType<typeof useNotification>
) {
  const { command, setCommand, setDraft, t } = context;
  return useCallback(async (id: number) => {
    if (command !== 'idle') return;
    setCommand('reading');
    try {
      setDraft(await loadBulletin(id));
    } catch (error) {
      notify(notification, t, 'read', classifyBulletinError(error, 'read-detail'));
    } finally {
      setCommand('idle');
    }
  }, [command, notification, setCommand, setDraft, t]);
}

function useBulletinSave(
  context: TransactionContext,
  client: ReturnType<typeof useQueryClient>,
  notification: ReturnType<typeof useNotification>
) {
  const {
    command,
    dependencies,
    draft,
    refresh,
    setCommand,
    setDraft,
    setSelectedId,
    t
  } = context;
  return useCallback(async () => {
    if (!draft || command !== 'idle' || dependencies.kind !== 'ready') return false;
    if (validateBulletinDraft(draft, dependencies.monitors, dependencies.metrics).length) {
      notification.open?.({ message: t('bulletin.validation'), type: 'error' });
      return false;
    }
    setCommand('saving');
    try {
      const saved = draft.id == null
        ? await createBulletinAndRead(draft)
        : await updateBulletinAndRead(draft);
      await client.invalidateQueries({ queryKey: bulletinQueryKeys.lists() });
      if (!await refresh()) {
        notify(notification, t, 'save', 'error');
        return false;
      }
      setSelectedId(saved.id);
      await refreshSavedBulletinMetrics(client, saved.id);
      setDraft(null);
      notification.open?.({ message: t('bulletin.saveSuccess'), type: 'success' });
      return true;
    } catch (error) {
      const operation = draft.id == null ? 'create' : 'update';
      notify(notification, t, 'save', classifyBulletinError(error, operation));
      return false;
    } finally {
      setCommand('idle');
    }
  }, [
    client,
    command,
    dependencies,
    draft,
    notification,
    refresh,
    setCommand,
    setDraft,
    setSelectedId,
    t
  ]);
}

function useBulletinRemove(
  context: TransactionContext,
  client: ReturnType<typeof useQueryClient>,
  notification: ReturnType<typeof useNotification>
) {
  const { command, refresh, selectedId, setCommand, setSelectedId, t } = context;
  return useCallback(async (record: Bulletin) => {
    if (command !== 'idle') return false;
    setCommand('deleting');
    try {
      await deleteBulletinAndConfirm(record.id);
      if (selectedId === record.id) setSelectedId(null);
      await client.invalidateQueries({ queryKey: bulletinQueryKeys.lists() });
      if (!await refresh()) {
        notify(notification, t, 'deleteError', 'error');
        return false;
      }
      notification.open?.({ message: t('bulletin.deleteSuccess'), type: 'success' });
      return true;
    } catch (error) {
      notify(notification, t, 'deleteError', classifyBulletinError(error, 'delete'));
      return false;
    } finally {
      setCommand('idle');
    }
  }, [client, command, notification, refresh, selectedId, setCommand, setSelectedId, t]);
}

function notify(
  notification: ReturnType<typeof useNotification>,
  t: (key: string) => string,
  operation: 'read' | 'save' | 'deleteError',
  failure: BulletinFailure
) {
  notification.open?.({ message: t(`bulletin.${operation}.${failure}`), type: 'error' });
}
