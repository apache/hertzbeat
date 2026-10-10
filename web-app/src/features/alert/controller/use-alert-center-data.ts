/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License.  You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { useQuery } from '@tanstack/react-query';
import { useCallback } from 'react';

import { loadAlertGroups, loadAlertSummary } from '../api/alert-api';
import type { AlertQuery } from '../model/alert-model';
import { alertCenterQueryKeys } from './alert-center-query-keys';

export function useAlertCenterData(query: AlertQuery) {
  const summary = useQuery({
    queryKey: alertCenterQueryKeys.summary(),
    queryFn: ({ signal }) => loadAlertSummary(signal)
  });
  const list = useQuery({
    queryKey: alertCenterQueryKeys.groups(query),
    queryFn: ({ signal }) => loadAlertGroups(query, signal)
  });
  const { refetch: refetchList } = list;
  const { refetch: refetchSummary } = summary;
  const refresh = useCallback(() => Promise.all([refetchSummary(), refetchList()]), [refetchList, refetchSummary]);

  return { list, summary, refetchList, refetchSummary, refresh };
}
