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
import { useCallback, useEffect, useRef } from 'react';

import {
  labelActionCapabilities,
  labelResourceName,
  type LabelActionCapabilities,
  type LabelListState,
  type LabelRecord
} from '../model/label-model';
import { classifyLabelReadFailure, labelProjectionConverged, type LabelMutationEvidence } from '../model/label-failure';
import type { LabelDeletePageReceipt, LabelQuery } from '../model/label-query-model';
import { useLabelActionsController } from './label-actions-controller';
import { useLabelMutationController } from './label-mutation-controller';

export function useLabelResourceController(
  query: LabelQuery,
  reconcileConfirmedDelete?: (receipt: LabelDeletePageReceipt) => boolean,
  capabilities: LabelActionCapabilities = labelActionCapabilities(['ADMIN'])
) {
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  const list = useList<LabelRecord, HttpError>({
    resource: labelResourceName,
    dataProviderName: labelResourceName,
    pagination: { currentPage: query.pageIndex + 1, pageSize: query.pageSize, mode: 'server' },
    filters: query.search ? [{ field: 'search', operator: 'contains', value: query.search }] : [],
    queryOptions: { enabled: capabilities.canRead },
    errorNotification: false
  });
  const refetch = list.query.refetch;
  const convergeProjection = useCallback(
    async (evidence: LabelMutationEvidence) => {
      const projection = await refetch();
      return (
        !projection.isError &&
        projection.data !== undefined &&
        labelProjectionConverged(evidence, projection.data.data, projection.data.total)
      );
    },
    [refetch]
  );
  const visibleRecords = list.result.data.length;
  // The callback captured when DELETE starts is its immutable query/page receipt across later renders.
  const onDeleteConfirmed = useCallback(() => {
    reconcileConfirmedDelete?.({ query, visibleRecords });
  }, [query, reconcileConfirmedDelete, visibleRecords]);
  const mutations = useLabelMutationController(convergeProjection, onDeleteConfirmed, capabilities);
  const actions = useLabelActionsController();
  const isMutationInFlight = mutations.isInFlight;
  const listState = resolveListState(
    capabilities.canRead,
    list.query.isPending,
    list.query.isError,
    list.query.error,
    list.result.data,
    list.result.total
  );

  const refresh = useCallback(() => {
    if (!mounted.current || !capabilities.canRead || isMutationInFlight()) return false;
    void refetch();
    return true;
  }, [capabilities.canRead, isMutationInFlight, refetch]);

  return {
    ...actions,
    ...mutations,
    listState,
    refresh,
    refreshing: list.query.isFetching
  };
}

function resolveListState(
  canRead: boolean,
  isPending: boolean,
  isError: boolean,
  error: HttpError | null,
  records: LabelRecord[],
  total: number | undefined
): LabelListState {
  if (!canRead) return { kind: 'permission' };
  if (isPending) return { kind: 'loading' };
  if (isError) return { kind: classifyLabelReadFailure(error) };
  if (typeof total !== 'number' || !Number.isSafeInteger(total) || total < 0 || records.length > total) {
    return { kind: 'error' };
  }
  if (records.length === 0) return total === 0 ? { kind: 'empty' } : { kind: 'error' };
  return { kind: 'ready', records, total };
}
