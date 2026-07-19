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
import { noticeReceiverResourceName } from '../notice-receiver-resource';
import { requireExactNoticeReceiver, requireNoticeReceiverAbsent } from '../notice-receiver-evidence';
import {
  classifyNoticeReceiverWriteFailure,
  type NoticeReceiverFailureKind,
  type NoticeReceiverNonMissingFailureKind
} from '../notice-receiver-failure';
import {
  useNoticeReceiverEditorController,
  useNoticeReceiverOperationGate,
  type NoticeReceiverEditorController,
  type NoticeReceiverOperationGate
} from './use-notice-receiver-editor-controller';

export type NoticeReceiverReadCapability = {
  loadExact: (id: number) => Promise<NoticeReceiver>;
  rereadAuthoritatively: () => Promise<{ records: NoticeReceiver[]; total: number }>;
};

export function useNoticeReceiverCommandController(read: NoticeReceiverReadCapability) {
  const { t } = useTranslation();
  const notification = useNotification();
  const create = useCreate<NoticeReceiver, HttpError, NoticeReceiverDraft>({
    resource: noticeReceiverResourceName,
    dataProviderName: noticeReceiverResourceName,
    invalidates: [],
    successNotification: false,
    errorNotification: false
  });
  const update = useUpdate<NoticeReceiver, HttpError, NoticeReceiverDraft>({
    resource: noticeReceiverResourceName,
    dataProviderName: noticeReceiverResourceName,
    invalidates: [],
    mutationMode: 'pessimistic',
    successNotification: false,
    errorNotification: false
  });
  const removeMutation = useDelete<NoticeReceiver, HttpError, NoticeReceiver>({});
  const gate = useNoticeReceiverOperationGate();
  const notify = createNotifications(notification, t);
  const editor = useNoticeReceiverEditorController(gate, read.loadExact, notify.readFailure);
  const context = { create, editor, gate, notify, read, removeMutation, update };
  return {
    state: {
      command: gate.command,
      busy: gate.command !== 'idle',
      saving: gate.command === 'saving',
      testing: gate.command === 'testing',
      ...editor.state
    },
    controls: editor.controls,
    actions: {
      ...editor.actions,
      submit: () => submitNoticeReceiver(context),
      remove: (record: NoticeReceiver) => removeNoticeReceiver(context, record),
      sendTest: () => sendNoticeReceiverTest(context)
    }
  };
}

type Notifications = ReturnType<typeof createNotifications>;
type CommandContext = {
  create: ReturnType<typeof useCreate<NoticeReceiver, HttpError, NoticeReceiverDraft>>;
  editor: NoticeReceiverEditorController;
  gate: NoticeReceiverOperationGate;
  notify: Notifications;
  read: NoticeReceiverReadCapability;
  removeMutation: ReturnType<typeof useDelete<NoticeReceiver, HttpError, NoticeReceiver>>;
  update: ReturnType<typeof useUpdate<NoticeReceiver, HttpError, NoticeReceiverDraft>>;
};

async function submitNoticeReceiver(context: CommandContext) {
  const draft = context.editor.controls.getDraft();
  if (!draft) return false;
  if (validateNoticeReceiverDraft(draft).length) {
    context.notify.validation();
    return false;
  }
  if (!context.gate.begin('saving')) return false;
  context.editor.controls.invalidateDetail();
  try {
    if (draft.id === undefined) {
      await context.create.mutateAsync(mutationParams(draft));
    } else {
      const result = await context.update.mutateAsync({
        id: draft.id,
        ...mutationParams(draft),
        mutationMode: 'pessimistic'
      });
      requireExactNoticeReceiver(result.data, draft.id);
    }
    await context.read.rereadAuthoritatively();
    context.editor.controls.setDraft(null);
    context.notify.saveSuccess();
    return true;
  } catch (error) {
    context.notify.saveFailure(classifyNoticeReceiverWriteFailure(error));
    return false;
  } finally {
    context.gate.end();
  }
}

async function removeNoticeReceiver(context: CommandContext, record: NoticeReceiver) {
  if (!context.gate.begin('removing')) return false;
  context.editor.controls.invalidateDetail();
  try {
    const result = await context.removeMutation.mutateAsync({
      id: record.id,
      resource: noticeReceiverResourceName,
      dataProviderName: noticeReceiverResourceName,
      invalidates: [],
      mutationMode: 'pessimistic',
      values: record,
      successNotification: false,
      errorNotification: false
    });
    requireExactNoticeReceiver(result.data, record.id);
    const proof = await context.read.rereadAuthoritatively();
    requireNoticeReceiverAbsent(proof.records, record.id);
    if (context.editor.controls.getDraft()?.id === record.id) context.editor.controls.setDraft(null);
    context.notify.deleteSuccess();
    return true;
  } catch (error) {
    context.notify.deleteFailure(classifyNoticeReceiverWriteFailure(error));
    return false;
  } finally {
    context.gate.end();
  }
}

async function sendNoticeReceiverTest(context: CommandContext) {
  const draft = context.editor.controls.getDraft();
  if (!draft) return false;
  if (validateNoticeReceiverDraft(draft).length) {
    context.notify.validation();
    return false;
  }
  if (!context.gate.begin('testing')) return false;
  try {
    await testNoticeReceiver(draft);
    context.notify.testSuccess();
    return true;
  } catch (error) {
    context.notify.testFailure(classifyNoticeReceiverWriteFailure(error));
    return false;
  } finally {
    context.gate.end();
  }
}

function mutationParams(draft: NoticeReceiverDraft) {
  return {
    resource: noticeReceiverResourceName,
    dataProviderName: noticeReceiverResourceName,
    invalidates: [],
    values: draft,
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
