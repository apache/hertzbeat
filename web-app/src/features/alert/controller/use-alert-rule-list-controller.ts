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

import { App } from 'antd';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import {
  alertRuleFailureKind,
  type AlertRule,
  type AlertRuleListState,
  type AlertRulePage
} from '../model/alert-rule-model';
import { createAlertRuleListActions } from './alert-rule-list-actions';
import { useAlertRuleActionCapabilities } from './use-alert-rule-action-capabilities';
import { useAlertRuleExport } from './use-alert-rule-export';
import { useAlertRuleImport } from './use-alert-rule-import';
import { useAlertRuleListOperations } from './use-alert-rule-list-operations';
import { useAlertRuleListQueryController } from './use-alert-rule-list-query-controller';
import { useAlertRuleListReadController } from './use-alert-rule-list-read-controller';
import { useAlertRuleSelection } from './use-alert-rule-selection';

export function useAlertRuleListController() {
  const { t } = useTranslation();
  const { message } = App.useApp();
  const navigate = useNavigate();
  const capabilities = useAlertRuleActionCapabilities();
  const route = useAlertRuleListQueryController();
  const { listQuery, rereadLatest } = useAlertRuleListReadController(route.query);
  const list = resolveListState(listQuery.isPending, listQuery.error, listQuery.data);
  const selection = useAlertRuleSelection(route.query, list);
  const exportOperation = useAlertRuleExport();
  const importOperation = useAlertRuleImport(rereadLatest);
  const operations = useAlertRuleListOperations(rereadLatest, {
    success: () => {
      void message.success(t('alertRules.operationSuccess'));
    },
    failure: () => {
      void message.error(t('alertRules.operationFailed'));
    }
  });
  const actions = createAlertRuleListActions({ route, operations, navigate, rereadLatest });
  return {
    state: {
      capabilities,
      command: operations.command,
      list,
      query: route.query,
      refreshing: listQuery.isFetching,
      search: route.search,
      selectedIds: selection.selectedIds,
      exporting: exportOperation.exporting,
      importState: importOperation.state
    },
    importActions: {
      ...importOperation.actions,
      open: () => {
        if (capabilities.canWrite) importOperation.actions.open();
      },
      submit: () => (capabilities.canWrite ? importOperation.actions.submit() : Promise.resolve(false))
    },
    selectIds: (ids: number[]) => {
      if (!operations.isLocked()) selection.selectIds(ids);
    },
    exportSelected: exportOperation.exportSelected,
    ...actions,
    create: () => {
      if (capabilities.canWrite) actions.create();
    },
    edit: (id: number) => {
      if (capabilities.canWrite) actions.edit(id);
    },
    toggle: (rule: AlertRule, enabled: boolean) =>
      capabilities.canWrite ? actions.toggle(rule, enabled) : Promise.resolve(),
    remove: (id: number) => (capabilities.canDelete ? actions.remove(id) : Promise.resolve()),
    removeMany: (ids: readonly number[]) => (capabilities.canDelete ? actions.removeMany(ids) : Promise.resolve())
  };
}

function resolveListState(pending: boolean, error: Error | null, page: AlertRulePage | undefined): AlertRuleListState {
  if (pending) return { kind: 'loading' };
  if (error) return { kind: alertRuleFailureKind(error) === 'unavailable' ? 'unavailable' : 'error' };
  if (!page) return { kind: 'error' };
  if (page.content.length === 0 && page.totalElements === 0) return { kind: 'empty' };
  return { kind: 'ready', records: page.content, total: page.totalElements };
}
