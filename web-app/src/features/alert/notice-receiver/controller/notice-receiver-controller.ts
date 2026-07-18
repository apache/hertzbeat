/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { useCreate, useDataProvider, useDelete, useList, useNotification, useUpdate,
  type HttpError, type OpenNotificationParams } from '@refinedev/core';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import type { RemotePayloadState } from '@/shared/remote-state';

import { classifyNoticeReceiverError, testNoticeReceiver } from '../api/notice-receiver-api';
import { createNoticeReceiverDraft, noticeReceiverDraftFromDetail,
  selectNoticeReceiverType, setNoticeReceiverSecretCleared, updateNoticeReceiverDraft,
  validateNoticeReceiverDraft, type NoticeReceiver,
  type NoticeReceiverDraft, type NoticeReceiverQuery, type NoticeReceiverSecretKey,
  type NoticeReceiverType } from '../model/notice-receiver-model';
import { useNoticeReceiverQueryController } from './notice-receiver-query-controller';

const resource = 'notice-receivers';
const dataProviderName = 'notice-receivers';
type FailureKind = 'missing' | 'invalid' | 'unavailable' | 'error';
export type NoticeReceiverListState = RemotePayloadState<
  { records: NoticeReceiver[]; total: number },
  FailureKind
>;

export function useNoticeReceiverController() {
  const { t } = useTranslation();
  const notification = useNotification();
  const search = useNoticeReceiverQueryController();
  const { query } = search;
  const resourceState = useReceiverResource(query);
  const [draft, setDraft] = useState<NoticeReceiverDraft | null>(null);
  const [testing, setTesting] = useState(false);
  const [editing, setEditing] = useState(false);

  const submit = async () => {
    if (!draft || validateNoticeReceiverDraft(draft).length) return notifyValidation(notification, t);
    try {
      await resourceState.save(draft);
      setDraft(null);
      notification.open?.(notice(t('noticeReceivers.saveSuccess'), 'success'));
    } catch (error) {
      notification.open?.(notice(t(`noticeReceivers.save.${classifyRefineError(error)}`), 'error'));
    }
  };
  const edit = async (id: number) => {
    setEditing(true);
    try {
      setDraft(noticeReceiverDraftFromDetail(await resourceState.load(id)));
    } catch (error) {
      notification.open?.(notice(t(`noticeReceivers.read.${classifyRefineError(error)}`), 'error'));
    } finally {
      setEditing(false);
    }
  };
  const remove = async (record: NoticeReceiver) => {
    try {
      await resourceState.remove(record);
      notification.open?.(notice(t('noticeReceivers.deleteSuccess'), 'success'));
    } catch (error) {
      notification.open?.(notice(t(`noticeReceivers.deleteError.${classifyRefineError(error)}`), 'error'));
    }
  };
  const sendTest = async () => {
    if (!draft || validateNoticeReceiverDraft(draft).length) return notifyValidation(notification, t);
    setTesting(true);
    try {
      await testNoticeReceiver(draft);
      notification.open?.(notice(t('noticeReceivers.testSuccess'), 'success'));
    } catch (error) {
      notification.open?.(notice(t(`noticeReceivers.testError.${classifyNoticeReceiverError(error)}`), 'error'));
    } finally {
      setTesting(false);
    }
  };

  return {
    state: { query, name: search.name, draft, list: resourceState.list, testing, editing,
      saving: resourceState.saving, deleting: resourceState.deleting, refreshing: resourceState.refreshing },
    actions: { setName: search.setName, search: search.search, changePage: search.changePage,
      refresh: resourceState.refresh, create: () => setDraft(createNoticeReceiverDraft()), edit, remove,
      close: () => setDraft(null), updateDraft: (patch: Partial<NoticeReceiverDraft>) => setDraft(current => current
        ? updateNoticeReceiverDraft(current, patch) : null),
      selectType: (type: NoticeReceiverType) => setDraft(current => current ? selectNoticeReceiverType(current, type) : null),
      setSecretCleared: (key: NoticeReceiverSecretKey, cleared: boolean) => setDraft(current => current
        ? setNoticeReceiverSecretCleared(current, key, cleared) : null), submit, sendTest }
  };
}

function useReceiverResource(query: NoticeReceiverQuery) {
  const identity = JSON.stringify(query);
  const dataProvider = useDataProvider()(dataProviderName);
  const [failure, setFailure] = useState<{ identity: string; error: HttpError } | null>(null);
  const list = useList<NoticeReceiver, HttpError>({ resource, dataProviderName,
    pagination: { currentPage: query.pageIndex + 1, pageSize: query.pageSize, mode: 'server' },
    filters: query.name ? [{ field: 'name', operator: 'contains', value: query.name }] : [], errorNotification: false });
  const create = useCreate<NoticeReceiver, HttpError, NoticeReceiverDraft>({ resource, dataProviderName,
    invalidates: [], successNotification: false, errorNotification: false });
  const update = useUpdate<NoticeReceiver, HttpError, NoticeReceiverDraft>({ resource, dataProviderName,
    invalidates: [], mutationMode: 'pessimistic', successNotification: false, errorNotification: false });
  const removeMutation = useDelete<NoticeReceiver, HttpError, NoticeReceiver>({});
  const activeFailure = failure?.identity === identity ? failure.error : null;
  const state = useMemo(() => resolveListState(list.query.isPending,
    activeFailure ?? (list.query.isError ? list.query.error : null), list.result.data, list.result.total),
  [activeFailure, list.query.error, list.query.isError, list.query.isPending, list.result.data, list.result.total]);

  const proveList = async (deletedId?: number) => {
    const proof = await list.query.refetch();
    if (proof.isError) throw rereadError(classifyRefineError(proof.error));
    if (!proof.data) throw rereadError('invalid');
    if (deletedId !== undefined && proof.data.data.some(item => item.id === deletedId)) {
      throw rereadError('invalid', 'NOTICE_RECEIVER_DELETE_NOT_CONVERGED');
    }
    setFailure(null);
  };
  const save = async (draft: NoticeReceiverDraft) => {
    try {
      if (draft.id === undefined) await create.mutateAsync({ resource, dataProviderName, invalidates: [], values: draft,
        successNotification: false, errorNotification: false });
      else await update.mutateAsync({ id: draft.id, resource, dataProviderName, invalidates: [],
        mutationMode: 'pessimistic', values: draft, successNotification: false, errorNotification: false });
      await proveList();
    } catch (error) {
      captureRefreshFailure(error, identity, setFailure);
      throw throwable(error);
    }
  };
  const remove = async (record: NoticeReceiver) => {
    try {
      await removeMutation.mutateAsync({ id: record.id, resource, dataProviderName, invalidates: [],
        mutationMode: 'pessimistic', values: record, successNotification: false, errorNotification: false });
      await proveList(record.id);
    } catch (error) {
      captureRefreshFailure(error, identity, setFailure);
      throw throwable(error);
    }
  };
  return { list: state, save, remove,
    load: async (id: number) => (await dataProvider.getOne<NoticeReceiver>({ resource, id })).data,
    refresh: () => void list.query.refetch().then(result => setFailure(result.isError
      ? { identity, error: result.error } : null)),
    saving: create.mutation.isPending || update.mutation.isPending,
    deleting: removeMutation.mutation.isPending,
    refreshing: list.query.isFetching };
}

function resolveListState(pending: boolean, error: HttpError | null, records: NoticeReceiver[], total?: number): NoticeReceiverListState {
  if (pending) return { kind: 'loading' };
  if (error) return { kind: classifyRefineError(error) };
  return total === undefined ? { kind: 'invalid' } : { kind: 'ready', records, total };
}

function classifyRefineError(error: unknown): FailureKind {
  const candidate = error as Partial<HttpError> & { code?: string | number };
  if (candidate.statusCode === 404 || candidate.code === 'NOTICE_RECEIVER_MISSING') return 'missing';
  if (candidate.code === 'NOTICE_RECEIVER_RESPONSE_INVALID' || candidate.code === 'NOTICE_RECEIVER_REREAD_INVALID') return 'invalid';
  if (candidate.statusCode === 0 || [502, 503, 504].includes(candidate.statusCode ?? -1)) return 'unavailable';
  return typeof candidate.code === 'string' && candidate.code.startsWith('NOTICE_RECEIVER_') ? 'invalid' : 'error';
}

function rereadError(kind: FailureKind, code = `NOTICE_RECEIVER_LIST_REREAD_${kind.toUpperCase()}`) {
  return Object.assign(new Error('Notice receiver list reread failed'), {
    statusCode: kind === 'missing' ? 404 : kind === 'unavailable' ? 503 : kind === 'invalid' ? 422 : 500, code
  }) as Error & HttpError & { code: string };
}

function captureRefreshFailure(error: unknown, identity: string,
  setFailure: (failure: { identity: string; error: HttpError }) => void) {
  const candidate = error as Partial<HttpError> & { code?: string };
  if (candidate.code?.includes('LIST_REREAD') || candidate.code === 'NOTICE_RECEIVER_DELETE_NOT_CONVERGED') {
    setFailure({ identity, error: candidate as HttpError });
  }
}

function notifyValidation(notification: ReturnType<typeof useNotification>, t: (key: string) => string) {
  notification.open?.(notice(t('noticeReceivers.validation'), 'error'));
}
function throwable(error: unknown) {
  if (error instanceof Error) return error;
  return Object.assign(new Error('Notice receiver operation failed'),
    error && typeof error === 'object' ? error : {});
}
function notice(message: string, type: OpenNotificationParams['type']): OpenNotificationParams {
  return { message, type };
}
