/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import type { NavigateFunction } from 'react-router-dom';

import type { AlertRulePage } from '../alert-rule-model';
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
      unlessLocked(() =>
        route.updateQuery({
          pageIndex: pageSize === route.query.pageSize ? page - 1 : 0,
          pageSize
        })
      ),
    refresh: () => {
      if (operations.hasReceipt()) return operations.resume();
      if (operations.isLocked()) return Promise.resolve();
      return rereadLatest()
        .then(() => undefined)
        .catch(() => undefined);
    },
    create: () =>
      unlessLocked(() => {
        void navigate('/alerts/rules/new');
      }),
    edit: (id: number) =>
      unlessLocked(() => {
        void navigate(`/alerts/rules/${id}/edit`);
      }),
    toggle: operations.toggle,
    remove: operations.remove
  };
}
