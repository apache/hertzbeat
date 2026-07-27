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

import type { NoticeActionCapabilities } from '../../model/notice-action-capability-model';
import { testNoticeReceiver } from '../api/notice-receiver-api';
import type { NoticeReceiverFailureKind, NoticeReceiverNonMissingFailureKind } from '../model/notice-receiver-failure';
import type { NoticeReceiver, NoticeReceiverDraft } from '../model/notice-receiver-model';
import { noticeReceiverResourceName } from '../notice-receiver-resource';
import { canRetryNoticeReceiver } from './notice-receiver-action-admission';
import {
  removeNoticeReceiver,
  retryNoticeReceiver,
  submitNoticeReceiver,
  type NoticeReceiverUpdateDraft,
  type NoticeReceiverWriteContext
} from './notice-receiver-write-operations';
import { useNoticeReceiverEditorController } from './use-notice-receiver-editor-controller';
import { useNoticeReceiverOperationController } from './use-notice-receiver-operation-controller';
import { useNoticeReceiverRoleLossRetirement } from './use-notice-receiver-role-loss-retirement';
import {
  dismissNoticeReceiverTest,
  retryNoticeReceiverTest,
  sendNoticeReceiverTest
} from './notice-receiver-test-operations';

export type NoticeReceiverReadCapability = {
  loadExact: (id: number) => Promise<NoticeReceiver>;
  rereadAuthoritatively: () => Promise<{ records: NoticeReceiver[]; total: number }>;
};

type NoticeReceiverCommandFacadeOptions = {
  operation: ReturnType<typeof useNoticeReceiverOperationController>;
  editor: ReturnType<typeof useNoticeReceiverEditorController>;
  context: NoticeReceiverWriteContext;
};

export function useNoticeReceiverCommandController(
  read: NoticeReceiverReadCapability,
  capabilities: NoticeActionCapabilities
) {
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
  const editor = useNoticeReceiverEditorController({
    capabilities,
    gate: operation,
    loadExact: read.loadExact,
    onReadFailure: notify.readFailure
  });
  useNoticeReceiverRoleLossRetirement({ capabilities, editor, operation });
  const context: NoticeReceiverWriteContext = {
    capabilities,
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
  return noticeReceiverCommandFacade({ operation, editor, context });
}

function noticeReceiverCommandFacade({ operation, editor, context }: NoticeReceiverCommandFacadeOptions) {
  return {
    state: {
      command: operation.command,
      busy: operation.command !== 'idle',
      saving: operation.command === 'saving',
      testing: operation.command === 'testing',
      recovery: operation.getRecovery(),
      testRecovery: operation.getTestRecovery(),
      canRetryOperation: canRetryNoticeReceiver(context.capabilities, operation.getReceipt()),
      ...editor.state
    },
    controls: { ...editor.controls, isLocked: operation.isLocked, hasReceipt: () => Boolean(operation.getReceipt()) },
    actions: {
      ...editor.actions,
      submit: () => submitNoticeReceiver(context),
      remove: (record: NoticeReceiver) => removeNoticeReceiver(context, record),
      retry: () => retryNoticeReceiver(context),
      sendTest: () => sendNoticeReceiverTest(context, testNoticeReceiver),
      retryTest: () => retryNoticeReceiverTest(context, testNoticeReceiver),
      dismissTestRecovery: () => dismissNoticeReceiverTest(context)
    }
  };
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
