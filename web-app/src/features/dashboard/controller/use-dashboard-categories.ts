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

import { useQuery } from '@tanstack/react-query';
import { ApiMessageError } from '@/core/http/api-message';
import { loadDashboardCategorySummary } from '../api/dashboard-category-api';
import { dashboardCategories } from '../model/dashboard-category';
import { dashboardQueryKeys } from './dashboard-query-keys';
export function useDashboardCategories() {
  const query = useQuery({
    queryKey: dashboardQueryKeys.categories(),
    queryFn: ({ signal }) => loadDashboardCategorySummary(signal),
    retry: false,
    refetchInterval: 60_000
  });
  return {
    kind: query.error
      ? query.error instanceof ApiMessageError && [401, 403].includes(query.error.status ?? 0)
        ? 'permission'
        : 'error'
      : query.isPending
        ? 'loading'
        : 'ready',
    categories: query.data && !query.error ? dashboardCategories(query.data) : []
  } as const;
}
