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

import { Button, Space } from 'antd';
import { useTranslation } from 'react-i18next';

import {
  OperationalPage,
  OperationalPageHeader,
  OperationalResultRegion
} from '@/shared/operational-page/operational-page';
import { AlertCenterBulkActions } from '../components/alert-center-actions';
import { AlertCenterExportMenu } from '../components/alert-center-export-menu';
import { AlertCenterResults } from '../components/alert-center-results';
import { AlertCenterRecovery } from '../components/alert-center-recovery';
import { AlertCenterSummary } from '../components/alert-center-summary';
import { AlertCenterToolbar } from '../components/alert-center-toolbar';
import { useAlertCenterDeleteScope } from '../controller/use-alert-center-delete-scope';
import { useAlertCenterController } from '../controller/use-alert-center-controller';
import { useAlertCenterExport } from '../controller/use-alert-center-export';
import { canRetryAlertCenterRecovery } from '../model/alert-capability-model';

export function AlertCenterPage() {
  const controller = useAlertCenterController();
  const { command, draft, list, query, recovery, refreshing } = controller.state;
  const deleteScope = useAlertCenterDeleteScope(query);
  const busy = command !== 'idle' || recovery !== null;
  const selectedGroups = selectedAlertGroups(list, controller.state.selectedIds);

  return (
    <OperationalPage mode="data">
      <AlertCenterHeading
        busy={busy}
        manageRules={controller.manageRules}
        query={query}
        selectedGroups={selectedGroups}
      />
      <AlertCenterToolbar
        disabled={busy}
        draft={draft}
        refreshing={refreshing}
        onDraftChange={controller.setDraft}
        onSubmit={controller.submitFilters}
        onRefresh={controller.refresh}
      />
      <AlertCenterResultRegion
        busy={busy}
        controller={controller}
        deleteScope={deleteScope}
        selectedGroups={selectedGroups}
      />
    </OperationalPage>
  );
}

function AlertCenterResultRegion({
  busy,
  controller,
  deleteScope,
  selectedGroups
}: {
  busy: boolean;
  controller: ReturnType<typeof useAlertCenterController>;
  deleteScope: ReturnType<typeof useAlertCenterDeleteScope>;
  selectedGroups: ReturnType<typeof selectedAlertGroups>;
}) {
  const { capabilities, command, list, query, recovery, summary } = controller.state;
  return (
    <OperationalResultRegion>
      <AlertCenterSummary state={summary} retry={controller.retrySummary} />
      <AlertCenterBulkActions
        actionPolicy={capabilities}
        busy={busy}
        filteredTotal={list.kind === 'ready' ? list.total : selectedGroups.length}
        selectedGroups={selectedGroups}
        actions={{
          cancelPreparation: deleteScope.cancelPreparation,
          clear: controller.clearSelection,
          prepareFiltered: deleteScope.prepareFiltered,
          removeFiltered: controller.removeIds,
          removeSelected: controller.removeSelected
        }}
      />
      <AlertCenterRecovery
        canRetry={canRetryAlertCenterRecovery(capabilities, recovery)}
        recovery={recovery}
        retrying={command === 'recovering'}
        retry={controller.retryOperation}
      />
      <AlertCenterResults
        actionPolicy={capabilities}
        onAcknowledge={controller.acknowledge}
        busy={busy}
        state={list}
        pageIndex={query.pageIndex}
        pageSize={query.pageSize}
        selectedIds={controller.state.selectedIds}
        onPageChange={controller.changePage}
        onRemove={controller.remove}
        onReopen={controller.reopen}
        onResolve={controller.resolve}
        onUnacknowledge={controller.unacknowledge}
        onSelectIds={controller.selectIds}
        retry={controller.retryList}
      />
    </OperationalResultRegion>
  );
}

function AlertCenterHeading({
  busy,
  manageRules,
  query,
  selectedGroups
}: {
  busy: boolean;
  manageRules: () => unknown;
  query: ReturnType<typeof useAlertCenterController>['state']['query'];
  selectedGroups: ReturnType<typeof selectedAlertGroups>;
}) {
  const { t } = useTranslation();
  const exportController = useAlertCenterExport({ query, selectedGroups });
  return (
    <OperationalPageHeader
      title={t('alert.title')}
      description={t('alert.description')}
      actions={
        <Space size="small">
          <AlertCenterExportMenu
            busy={busy}
            exporting={exportController.exporting}
            exportAll={exportController.exportAll}
            exportFiltered={exportController.exportFiltered}
            exportSelected={exportController.exportSelected}
            exportTimeRange={exportController.exportTimeRange}
            selectedGroups={selectedGroups}
          />
          <Button onClick={() => void manageRules()}>{t('alertRules.manage')}</Button>
        </Space>
      }
    />
  );
}

function selectedAlertGroups(
  list: ReturnType<typeof useAlertCenterController>['state']['list'],
  selectedIds: number[]
) {
  if (list.kind !== 'ready') return [];
  const selected = new Set(selectedIds);
  return list.records.filter(group => selected.has(group.id));
}
