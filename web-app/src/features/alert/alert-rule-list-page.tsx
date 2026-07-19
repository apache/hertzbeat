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

import { useTranslation } from 'react-i18next';

import { AlertManagementNav } from './alert-management-nav';
import styles from './alert-rule-list-page.module.css';
import { buildAlertRuleListColumns } from './components/alert-rule-list-columns';
import {
  AlertRuleListHeading,
  AlertRuleListRecovery,
  AlertRuleListToolbar
} from './components/alert-rule-list-controls';
import { AlertRuleListResults } from './components/alert-rule-list-results';
import { useAlertRuleListController } from './controller/use-alert-rule-list-controller';

export function AlertRuleListPage() {
  const { t } = useTranslation();
  const controller = useAlertRuleListController();
  const { command, list, query, refreshing, search } = controller.state;
  const busy = command !== 'idle';
  const recovering = command === 'recovering';
  return (
    <div className={styles.page}>
      <AlertRuleListHeading busy={busy} create={controller.create} />
      <AlertManagementNav />
      <AlertRuleListToolbar
        search={search}
        refreshing={refreshing}
        busy={busy}
        recovering={recovering}
        setSearch={controller.setSearch}
        submitSearch={controller.submitSearch}
        refresh={controller.refresh}
      />
      <AlertRuleListRecovery visible={recovering} retry={controller.refresh} />
      <AlertRuleListResults
        state={list}
        columns={buildAlertRuleListColumns(t, {
          busy,
          edit: controller.edit,
          toggle: controller.toggle,
          remove: controller.remove
        })}
        pageIndex={query.pageIndex}
        pageSize={query.pageSize}
        busy={busy}
        retryDisabled={busy && !recovering}
        changePage={controller.changePage}
        retry={controller.refresh}
      />
    </div>
  );
}
