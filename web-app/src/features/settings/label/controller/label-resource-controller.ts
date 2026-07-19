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

import { type LabelListState, type LabelRecord } from '../model/label-model';
import type { LabelQuery } from '../model/label-query-model';
import { useLabelActionsController } from './label-actions-controller';
import { useLabelMutationController } from './label-mutation-controller';

const labelResource = 'labels';
const labelDataProvider = 'labels';

export function useLabelResourceController(query: LabelQuery) {
  const list = useList<LabelRecord, HttpError>({
    resource: labelResource,
    dataProviderName: labelDataProvider,
    pagination: { currentPage: query.pageIndex + 1, pageSize: query.pageSize, mode: 'server' },
    filters: query.search ? [{ field: 'search', operator: 'contains', value: query.search }] : [],
    errorNotification: false
  });
  const mutations = useLabelMutationController();
  const actions = useLabelActionsController();
  const isMutationLocked = mutations.isLocked;
  const refetch = list.query.refetch;
  const listState = useMemo(
    () =>
      resolveListState(list.query.isPending, list.query.isError, list.query.error, list.result.data, list.result.total),
    [list.query.error, list.query.isError, list.query.isPending, list.result.data, list.result.total]
  );

  const refresh = useCallback(() => {
    if (isMutationLocked()) return;
    void refetch();
  }, [isMutationLocked, refetch]);

  return {
    ...actions,
    ...mutations,
    listState,
    refresh,
    refreshing: list.query.isFetching
  };
}

function resolveListState(
  isPending: boolean,
  isError: boolean,
  error: HttpError | null,
  records: LabelRecord[],
  total: number | undefined
): LabelListState {
  if (isPending) return { kind: 'loading' };
  if (isError) return isUnavailable(error) ? { kind: 'unavailable' } : { kind: 'error' };
  if (records.length === 0) return { kind: 'empty' };
  if (total === undefined) return { kind: 'error' };
  return { kind: 'ready', records, total };
}

function isUnavailable(error: HttpError | null) {
  return error?.statusCode === 0 || [502, 503, 504].includes(error?.statusCode ?? -1);
}
