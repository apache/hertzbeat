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

import type { NavigateFunction } from 'react-router-dom';

import { buildAlertRuleEditPath, buildAlertRuleNewPath } from '@/shared/navigation/app-paths';
import { zeroBasedPageChange } from '@/shared/query-context';

import type { AlertRuleKind, AlertRulePage } from '../model/alert-rule-model';
import type { AlertRuleListQueryController } from './use-alert-rule-list-query-controller';
import type { AlertRuleListOperations } from './use-alert-rule-list-operations';

type AlertRuleListActionDependencies = {
  route: AlertRuleListQueryController;
  operations: AlertRuleListOperations;
  navigate: NavigateFunction;
  rereadLatest: () => Promise<AlertRulePage>;
};

/** Applies one command lock consistently to list, query, and navigation actions. */
export function createAlertRuleListActions({
  route,
  operations,
  navigate,
  rereadLatest
}: AlertRuleListActionDependencies) {
  const unlessLocked = (action: () => void) => {
    if (!operations.isLocked()) action();
  };
  return {
    setSearch: (value: string) => unlessLocked(() => route.setSearch(value)),
    submitSearch: () => unlessLocked(() => route.updateQuery({ search: route.search.trim(), pageIndex: 0 })),
    changePage: (page: number, pageSize: number) =>
      unlessLocked(() => route.updateQuery(zeroBasedPageChange(page, pageSize, route.query.pageSize))),
    refresh: () => {
      if (operations.hasReceipt()) return operations.resume();
      if (operations.isLocked()) return Promise.resolve();
      return rereadLatest()
        .then(() => undefined)
        .catch(() => undefined);
    },
    create: (kind: AlertRuleKind) =>
      unlessLocked(() => {
        void navigate(buildAlertRuleNewPath(kind));
      }),
    edit: (id: number) =>
      unlessLocked(() => {
        void navigate(buildAlertRuleEditPath(id));
      }),
    toggle: operations.toggle,
    remove: operations.remove,
    removeMany: operations.removeMany
  };
}
