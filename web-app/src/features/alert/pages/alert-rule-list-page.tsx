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

import {
  OperationalCommandBar,
  OperationalPage,
  OperationalResultRegion
} from '@/shared/operational-page/operational-page';

import { AlertManagementNav } from '../components/alert-management-nav';
import { AlertRuleImportDialog } from '../components/alert-rule-import-dialog';
import { buildAlertRuleListColumns } from '../components/alert-rule-list-columns';
import {
  AlertRuleListHeading,
  AlertRuleListRecovery,
  AlertRuleListToolbar
} from '../components/alert-rule-list-controls';
import { AlertRuleListResults } from '../components/alert-rule-list-results';
import { useAlertRuleListController } from '../controller/use-alert-rule-list-controller';

export function AlertRuleListPage() {
  const { t } = useTranslation();
  const controller = useAlertRuleListController();
  const { capabilities, command, exporting, importState, list, query, refreshing, search, selectedIds } =
    controller.state;
  const commandBusy = command !== 'idle';
  const interactionLocked = commandBusy || exporting || importState.busy;
  const recovering = command === 'recovering';
  return (
    <OperationalPage mode="data">
      <AlertRuleListHeading
        {...capabilities}
        busy={interactionLocked}
        exporting={exporting}
        selectedCount={selectedIds.length}
        create={controller.create}
        importRules={controller.importActions.open}
        removeSelected={() => controller.removeMany(selectedIds)}
        exportSelected={format => controller.exportSelected(selectedIds, format)}
      />
      <AlertRuleImportDialog
        state={importState}
        onCancel={controller.importActions.cancel}
        onFile={controller.importActions.selectFile}
        onInspect={controller.importActions.inspect}
        onSubmit={controller.importActions.submit}
      />
      <AlertManagementNav />
      <OperationalCommandBar
        role="search"
        ariaLabel={t('alertRules.search')}
        primary={
          <AlertRuleListToolbar
            search={search}
            refreshing={refreshing}
            busy={interactionLocked}
            recovering={recovering}
            setSearch={controller.setSearch}
            submitSearch={controller.submitSearch}
            refresh={controller.refresh}
          />
        }
      />
      <OperationalResultRegion>
        <AlertRuleListRecovery visible={recovering} retry={controller.refresh} />
        <AlertRuleListResults
          state={list}
          columns={buildAlertRuleListColumns(t, {
            ...capabilities,
            busy: interactionLocked,
            edit: controller.edit,
            toggle: controller.toggle,
            remove: controller.remove
          })}
          pageIndex={query.pageIndex}
          pageSize={query.pageSize}
          busy={interactionLocked}
          selectedIds={selectedIds}
          selectIds={controller.selectIds}
          retryDisabled={interactionLocked && !recovering}
          changePage={controller.changePage}
          retry={controller.refresh}
        />
      </OperationalResultRegion>
    </OperationalPage>
  );
}
