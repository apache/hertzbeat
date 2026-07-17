/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { useDataProvider, useList, useNotification, type DataProvider, type HttpError } from '@refinedev/core';
import type { TFunction } from 'i18next';
import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';

import { noticeTemplateCreateActionUrl, noticeTemplateResourceName } from './notice-template-api';

import {
  createNoticeTemplateDraft,
  isNoticeTemplateReadOnly,
  noticeTemplateDraftFromResource,
  readNoticeTemplateQuery,
  validateNoticeTemplateDraft,
  writeNoticeTemplateQuery,
  type NoticeTemplateDraft,
  type NoticeTemplateListState,
  type NoticeTemplateQuery,
  type NoticeTemplateResourceRecord
} from './notice-template-model';

type Command = 'idle' | 'loading-detail' | 'saving' | 'deleting';
type FailureKind = 'error' | 'unavailable';

export function useNoticeTemplateController() {
  const { t } = useTranslation();
  const notification = useNotification();
  const resolveDataProvider = useDataProvider();
  const provider = resolveDataProvider(noticeTemplateResourceName);
  const queryController = useNoticeTemplateQuery();
  const listController = useNoticeTemplateList(queryController.query);
  const [preview, setPreview] = useState<NoticeTemplateResourceRecord | null>(null);
  const commands = useNoticeTemplateCommands({
    notification,
    provider,
    query: queryController.query,
    refreshAuthoritatively: listController.refreshAuthoritatively,
    t
  });

  return {
    changePage: queryController.changePage,
    changePreset: queryController.changePreset,
    closeDraft: commands.closeDraft,
    closePreview: () => setPreview(null),
    create: commands.create,
    edit: commands.edit,
    query: queryController.submitQuery,
    refresh: listController.refresh,
    remove: commands.remove,
    setName: queryController.setName,
    setPreview,
    state: {
      command: commands.command,
      draft: commands.draft,
      list: listController.listState,
      name: queryController.name,
      preview,
      query: queryController.query,
      refreshing: listController.refreshing
    },
    submit: commands.submit,
    updateDraft: commands.updateDraft
  };
}

function useNoticeTemplateQuery() {
  const [params, setParams] = useSearchParams();
  const serializedParams = params.toString();
  const query = useMemo(
    () => readNoticeTemplateQuery(new URLSearchParams(serializedParams)),
    [serializedParams]
  );
  const [nameDraft, setNameDraft] = useState({ source: query.name, value: query.name });
  const queryChanged = nameDraft.source !== query.name;
  if (queryChanged) setNameDraft({ source: query.name, value: query.name });
  const name = queryChanged ? query.name : nameDraft.value;
  const updateQuery = useCallback((patch: Partial<NoticeTemplateQuery>) => {
    setParams(writeNoticeTemplateQuery({ ...query, ...patch }));
  }, [query, setParams]);
  const setName = useCallback((value: string) => {
    setNameDraft({ source: query.name, value });
  }, [query.name]);

  return {
    changePage: (page: number, pageSize: number) => updateQuery({ pageIndex: page - 1, pageSize }),
    changePreset: (preset: boolean) => updateQuery({ preset, pageIndex: 0 }),
    name,
    query,
    setName,
    submitQuery: () => updateQuery({ name: name.trim(), pageIndex: 0 })
  };
}

function useNoticeTemplateList(query: NoticeTemplateQuery) {
  const queryKey = writeNoticeTemplateQuery(query).toString();
  const [refreshState, setRefreshState] = useState<{
    queryKey: string;
    failure: FailureKind | null;
  }>({ queryKey, failure: null });
  const queryChanged = refreshState.queryKey !== queryKey;
  if (queryChanged) setRefreshState({ queryKey, failure: null });
  const refreshFailure = queryChanged ? null : refreshState.failure;
  const list = useList<NoticeTemplateResourceRecord, HttpError>({
    resource: noticeTemplateResourceName,
    dataProviderName: noticeTemplateResourceName,
    pagination: { currentPage: query.pageIndex + 1, pageSize: query.pageSize, mode: 'server' },
    filters: [
      ...(query.name ? [{ field: 'name', operator: 'contains' as const, value: query.name }] : []),
      { field: 'preset', operator: 'eq' as const, value: query.preset }
    ],
    errorNotification: false
  });
  const listState = useMemo(
    () => resolveListState(
      list.query.isPending,
      list.query.isError,
      list.query.error,
      list.result.data,
      list.result.total,
      refreshFailure
    ),
    [
      list.query.error,
      list.query.isError,
      list.query.isPending,
      list.result.data,
      list.result.total,
      refreshFailure
    ]
  );
  const refreshAuthoritatively = useCallback(async () => {
    const result = await list.query.refetch();
    if (result.isError) {
      const failure = isUnavailable(result.error) ? 'unavailable' : 'error';
      setRefreshState({ queryKey, failure });
      if (result.error instanceof Error) throw result.error;
      throw new Error('Notice Template refresh failed');
    }
    setRefreshState({ queryKey, failure: null });
  }, [list.query, queryKey]);

  return {
    listState,
    refresh: () => void refreshAuthoritatively().catch(() => undefined),
    refreshAuthoritatively,
    refreshing: list.query.isFetching
  };
}

function useNoticeTemplateCommands({
  notification,
  provider,
  query,
  refreshAuthoritatively,
  t
}: {
  notification: ReturnType<typeof useNotification>;
  provider: DataProvider;
  query: NoticeTemplateQuery;
  refreshAuthoritatively: () => Promise<void>;
  t: TFunction;
}) {
  const [draft, setDraft] = useState<NoticeTemplateDraft | null>(null);
  const [command, setCommand] = useState<Command>('idle');
  const guardWritable = useCallback((template: NoticeTemplateResourceRecord) => {
    if (!isNoticeTemplateReadOnly(template)) return true;
    notification.open?.({ message: t('common.routeError.description'), type: 'error' });
    return false;
  }, [notification, t]);

  const create = useCallback(() => {
    if (command !== 'idle') return;
    setDraft(createNoticeTemplateDraft());
  }, [command]);
  const edit = useCallback(async (template: NoticeTemplateResourceRecord) => {
    if (command !== 'idle' || !guardWritable(template) || template.backendId == null || !provider.getOne) return;
    setCommand('loading-detail');
    try {
      const response = await provider.getOne<NoticeTemplateResourceRecord>({
        resource: noticeTemplateResourceName,
        id: template.backendId
      });
      if (isNoticeTemplateReadOnly(response.data)) throw new Error('Preset template cannot be edited');
      setDraft(noticeTemplateDraftFromResource(response.data));
    } catch {
      notification.open?.({ message: t('noticeTemplates.loadFailed'), type: 'error' });
    } finally {
      setCommand('idle');
    }
  }, [command, guardWritable, notification, provider, t]);
  const submit = useCallback(async () => {
    if (!draft || command !== 'idle') return;
    if (validateNoticeTemplateDraft(draft).length > 0) {
      notification.open?.({ message: t('noticeTemplates.validation'), type: 'error' });
      return;
    }
    setCommand('saving');
    try {
      if (draft.id === undefined) {
        if (!provider.custom) throw new Error('Notice Template create action is unavailable');
        const response = await provider.custom({
          url: noticeTemplateCreateActionUrl,
          method: 'post',
          payload: draft
        });
        if (response.data.acknowledged !== true) throw new Error('Notice Template create was not acknowledged');
      } else {
        if (!provider.update) throw new Error('Notice Template update action is unavailable');
        await provider.update<NoticeTemplateResourceRecord, NoticeTemplateDraft>({
          resource: noticeTemplateResourceName,
          id: draft.id,
          variables: draft
        });
      }
      await refreshAuthoritatively();
      setDraft(null);
      notification.open?.({ message: t('noticeTemplates.saveSuccess'), type: 'success' });
    } catch {
      notification.open?.({ message: t('noticeTemplates.saveFailed'), type: 'error' });
    } finally {
      setCommand('idle');
    }
  }, [command, draft, notification, provider, refreshAuthoritatively, t]);
  const remove = useNoticeTemplateRemove({
    command,
    guardWritable,
    notification,
    provider,
    query,
    refreshAuthoritatively,
    setCommand,
    t
  });

  return {
    closeDraft: () => command === 'idle' && setDraft(null),
    command,
    create,
    draft,
    edit,
    remove,
    submit,
    updateDraft: (patch: Partial<NoticeTemplateDraft>) => {
      setDraft(current => current ? { ...current, ...patch } : current);
    }
  };
}

function useNoticeTemplateRemove({
  command,
  guardWritable,
  notification,
  provider,
  query,
  refreshAuthoritatively,
  setCommand,
  t
}: {
  command: Command;
  guardWritable: (template: NoticeTemplateResourceRecord) => boolean;
  notification: ReturnType<typeof useNotification>;
  provider: DataProvider;
  query: NoticeTemplateQuery;
  refreshAuthoritatively: () => Promise<void>;
  setCommand: (command: Command) => void;
  t: TFunction;
}) {
  return useCallback(async (template: NoticeTemplateResourceRecord) => {
    if (command !== 'idle' || !guardWritable(template) || template.backendId == null || !provider.deleteOne) return;
    setCommand('deleting');
    try {
      await provider.deleteOne<
        NoticeTemplateResourceRecord,
        { record: NoticeTemplateResourceRecord; query: NoticeTemplateQuery }
      >({
        resource: noticeTemplateResourceName,
        id: template.backendId,
        variables: { record: template, query }
      });
      await refreshAuthoritatively();
      notification.open?.({ message: t('noticeTemplates.deleteSuccess'), type: 'success' });
    } catch {
      notification.open?.({ message: t('noticeTemplates.deleteFailed'), type: 'error' });
    } finally {
      setCommand('idle');
    }
  }, [command, guardWritable, notification, provider, query, refreshAuthoritatively, setCommand, t]);
}

function resolveListState(
  pending: boolean,
  failed: boolean,
  error: HttpError | null,
  records: NoticeTemplateResourceRecord[],
  total: number | undefined,
  refreshFailure: FailureKind | null
): NoticeTemplateListState {
  if (refreshFailure) return { kind: refreshFailure };
  if (pending) return { kind: 'loading' };
  if (failed) return { kind: isUnavailable(error) ? 'unavailable' : 'error' };
  if (total === undefined) return { kind: 'error' };
  if (records.length === 0 && total === 0) return { kind: 'empty' };
  return { kind: 'ready', records, total };
}

function isUnavailable(error: HttpError | null) {
  const code: unknown = error?.code;
  if (typeof code === 'string' && code.startsWith('NOTICE_TEMPLATE_')) return false;
  return error?.statusCode === 0 || [502, 503, 504].includes(error?.statusCode ?? -1);
}
