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

import { useList, type HttpError } from '@refinedev/core';
import { useCallback, useMemo } from 'react';

import { useSourceScopedValue } from '@/shared/query-context';

import {
  writeNoticeTemplateQuery,
  type NoticeTemplateListState,
  type NoticeTemplateQuery,
  type NoticeTemplateResourceRecord
} from '../model/notice-template-model';
import { noticeTemplateResourceName } from '../api/notice-template-resource';
import {
  classifyNoticeTemplateCollectionFailure,
  normalizeNoticeTemplateCollectionFailure
} from '../model/notice-template-failure';

type FailureKind = 'error' | 'unavailable';

export function useNoticeTemplateListController(query: NoticeTemplateQuery) {
  const queryKey = writeNoticeTemplateQuery(query).toString();
  const { value: refreshFailure, setValue: setRefreshFailure } = useSourceScopedValue<FailureKind | null>(
    queryKey,
    null
  );

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
    () =>
      resolveListState(
        list.query.isPending,
        list.query.isError,
        list.query.error,
        list.result.data,
        list.result.total,
        refreshFailure
      ),
    [list.query.error, list.query.isError, list.query.isPending, list.result.data, list.result.total, refreshFailure]
  );
  const refreshAuthoritatively = useCallback(async () => {
    const result = await list.query.refetch();
    if (result.isError) {
      const reason = normalizeNoticeTemplateCollectionFailure(result.error);
      const failure = reason.kind === 'unavailable' ? 'unavailable' : 'error';
      setRefreshFailure(failure);
      throw reason;
    }
    setRefreshFailure(null);
  }, [list.query, setRefreshFailure]);

  return {
    listState,
    refresh: () => void refreshAuthoritatively().catch(() => undefined),
    refreshAuthoritatively,
    refreshing: list.query.isFetching
  };
}

function resolveListState(
  pending: boolean,
  failed: boolean,
  error: unknown,
  records: NoticeTemplateResourceRecord[],
  total: number | undefined,
  refreshFailure: FailureKind | null
): NoticeTemplateListState {
  if (refreshFailure) return { kind: refreshFailure };
  if (pending) return { kind: 'loading' };
  if (failed) {
    return { kind: classifyNoticeTemplateCollectionFailure(error) === 'unavailable' ? 'unavailable' : 'error' };
  }
  if (total === undefined) return { kind: 'error' };
  if (records.length === 0 && total === 0) return { kind: 'empty' };
  return { kind: 'ready', records, total };
}
