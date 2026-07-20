/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import {
  useCreate,
  useDelete,
  useNotification,
  useUpdate,
  type HttpError,
  type OpenNotificationParams
} from '@refinedev/core';
import { useTranslation } from 'react-i18next';

import { testNoticeReceiver } from '../api/notice-receiver-api';
import {
  validateNoticeReceiverDraft,
  type NoticeReceiver,
  type NoticeReceiverDraft
} from '../model/notice-receiver-model';
import type {
  NoticeReceiverFailureKind,
  NoticeReceiverNonMissingFailureKind
} from '../model/notice-receiver-failure-kind';
import { noticeReceiverResourceName } from '../notice-receiver-resource';
import {
  removeNoticeReceiver,
  retryNoticeReceiver,
  submitNoticeReceiver,
  type NoticeReceiverUpdateDraft,
  type NoticeReceiverWriteContext
} from './notice-receiver-write-operations';
import { useNoticeReceiverEditorController } from './use-notice-receiver-editor-controller';
import { useNoticeReceiverOperationController } from './use-notice-receiver-operation-controller';

export type NoticeReceiverReadCapability = {
  loadExact: (id: number) => Promise<NoticeReceiver>;
  rereadAuthoritatively: () => Promise<{ records: NoticeReceiver[]; total: number }>;
};

export function useNoticeReceiverCommandController(read: NoticeReceiverReadCapability) {
  const { t } = useTranslation();
  const notification = useNotification();
  const create = useCreate<NoticeReceiver, HttpError, NoticeReceiverDraft>(mutationOptions());
  const update = useUpdate<NoticeReceiver, HttpError, NoticeReceiverDraft>({
    ...mutationOptions(),
    mutationMode: 'pessimistic'
  });
  const removeMutation = useDelete<NoticeReceiver, HttpError, NoticeReceiver>({});
  const operation = useNoticeReceiverOperationController();
  const notify = createNotifications(notification, t);
  const editor = useNoticeReceiverEditorController(operation, read.loadExact, notify.readFailure);
  const context: NoticeReceiverWriteContext = {
    create: draft => create.mutateAsync(mutationParams(draft)).then(result => result.data),
    update: (draft: NoticeReceiverUpdateDraft) =>
      update
        .mutateAsync({
          id: draft.id,
          ...mutationParams(draft),
          mutationMode: 'pessimistic'
        })
        .then(result => result.data),
    remove: record => removeMutation.mutateAsync(deleteParams(record)).then(result => result.data),
    editor,
    operation,
    notify,
    loadExact: read.loadExact,
    reread: read.rereadAuthoritatively
  };
  return {
    state: {
      command: operation.command,
      busy: operation.command !== 'idle',
      saving: operation.command === 'saving',
      testing: operation.command === 'testing',
      recovery: operation.getRecovery(),
      ...editor.state
    },
    controls: { ...editor.controls, isLocked: operation.isLocked, hasReceipt: () => Boolean(operation.getReceipt()) },
    actions: {
      ...editor.actions,
      submit: () => submitNoticeReceiver(context),
      remove: (record: NoticeReceiver) => removeNoticeReceiver(context, record),
      retry: () => retryNoticeReceiver(context),
      sendTest: () => sendNoticeReceiverTest(context, testNoticeReceiver)
    }
  };
}

async function sendNoticeReceiverTest(
  context: NoticeReceiverWriteContext,
  send: (draft: NoticeReceiverDraft) => Promise<void>
) {
  const draft = context.editor.controls.getDraft();
  if (!draft) return false;
  if (validateNoticeReceiverDraft(draft).length) {
    context.notify.validation();
    return false;
  }
  const owner = context.operation.begin('testing');
  if (!owner) return false;
  try {
    await send(draft);
    if (!context.operation.isCurrent(owner)) return false;
    context.notify.testSuccess();
    return true;
  } catch (error) {
    if (!context.operation.isCurrent(owner)) return false;
    context.notify.testFailure(classifyTestFailure(error));
    return false;
  } finally {
    context.operation.end(owner);
  }
}

function mutationOptions() {
  return {
    resource: noticeReceiverResourceName,
    dataProviderName: noticeReceiverResourceName,
    invalidates: [],
    successNotification: false as const,
    errorNotification: false as const
  };
}

function mutationParams(draft: NoticeReceiverDraft) {
  return { ...mutationOptions(), values: draft };
}

function deleteParams(record: NoticeReceiver) {
  return {
    id: record.id,
    resource: noticeReceiverResourceName,
    dataProviderName: noticeReceiverResourceName,
    invalidates: [],
    mutationMode: 'pessimistic' as const,
    values: record,
    successNotification: false as const,
    errorNotification: false as const
  };
}

function createNotifications(notification: ReturnType<typeof useNotification>, t: (key: string) => string) {
  const open = (key: string, type: OpenNotificationParams['type']) => notification.open?.({ message: t(key), type });
  return {
    validation: () => open('noticeReceivers.validation', 'error'),
    readFailure: (kind: NoticeReceiverFailureKind) => open(`noticeReceivers.read.${kind}`, 'error'),
    saveSuccess: () => open('noticeReceivers.saveSuccess', 'success'),
    saveFailure: (kind: NoticeReceiverNonMissingFailureKind) => open(`noticeReceivers.save.${kind}`, 'error'),
    deleteSuccess: () => open('noticeReceivers.deleteSuccess', 'success'),
    deleteFailure: (kind: NoticeReceiverNonMissingFailureKind) => open(`noticeReceivers.deleteError.${kind}`, 'error'),
    testSuccess: () => open('noticeReceivers.testSuccess', 'success'),
    testFailure: (kind: NoticeReceiverNonMissingFailureKind) => open(`noticeReceivers.testError.${kind}`, 'error')
  };
}

function classifyTestFailure(error: unknown): NoticeReceiverNonMissingFailureKind {
  const status = (error as { statusCode?: number } | null)?.statusCode;
  return status === 0 || status === undefined || status >= 500 ? 'unavailable' : 'error';
}
