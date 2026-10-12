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

import { loadAlertRuleDatasourceStatus } from '../api/alert-rule-api';
import { alertRuleFailureKind, type AlertRuleDatasourceState } from '../model/alert-rule-model';
import { alertRuleQueryKeys } from './alert-rule-query-keys';

/** Owns the runtime evidence that determines which periodic strategies can run. */
export function useAlertRuleDatasourceController() {
  const query = useQuery({
    queryKey: alertRuleQueryKeys.datasourceStatus(),
    queryFn: ({ signal }) => loadAlertRuleDatasourceStatus(signal),
    retry: false
  });
  return {
    state: resolveDatasourceState(query),
    retry: async () => {
      await query.refetch();
    }
  };
}

function resolveDatasourceState(
  query: ReturnType<typeof useQuery<Awaited<ReturnType<typeof loadAlertRuleDatasourceStatus>>>>
): AlertRuleDatasourceState {
  if (query.isPending) return { kind: 'loading' };
  if (query.isError) {
    return { kind: alertRuleFailureKind(query.error) === 'unavailable' ? 'unavailable' : 'error' };
  }
  return { kind: 'ready', status: query.data };
}
