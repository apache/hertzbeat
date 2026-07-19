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

import type { RemotePageState } from '@/shared/remote-state';

import { classifyAlertRuleReadError } from '../alert-rule-api';
import type { AlertRule, AlertRulePage } from '../alert-rule-model';
import { createAlertRuleListActions } from './alert-rule-list-actions';
import { useAlertRuleListOperations } from './use-alert-rule-list-operations';
import { useAlertRuleListQueryController } from './use-alert-rule-list-query-controller';
import { useAlertRuleListReadController } from './use-alert-rule-list-read-controller';

export type AlertRuleListState = RemotePageState<AlertRule, 'unavailable' | 'error'>;

export function useAlertRuleListController() {
  const { t } = useTranslation();
  const { message } = App.useApp();
  const navigate = useNavigate();
  const route = useAlertRuleListQueryController();
  const { listQuery, rereadLatest } = useAlertRuleListReadController(route.query);
  const operations = useAlertRuleListOperations(rereadLatest, {
    success: () => {
      void message.success(t('alertRules.operationSuccess'));
    },
    failure: () => {
      void message.error(t('alertRules.operationFailed'));
    }
  });
  return {
    state: {
      command: operations.command,
      list: resolveListState(listQuery.isPending, listQuery.error, listQuery.data),
      query: route.query,
      refreshing: listQuery.isFetching,
      search: route.search
    },
    ...createAlertRuleListActions({ route, operations, navigate, rereadLatest })
  };
}

function resolveListState(pending: boolean, error: Error | null, page: AlertRulePage | undefined): AlertRuleListState {
  if (pending) return { kind: 'loading' };
  if (error) return { kind: classifyAlertRuleReadError(error) === 'unavailable' ? 'unavailable' : 'error' };
  if (!page) return { kind: 'error' };
  if (page.content.length === 0 && page.totalElements === 0) return { kind: 'empty' };
  return { kind: 'ready', records: page.content, total: page.totalElements };
}
