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

import { Button } from 'antd';
import { useTranslation } from 'react-i18next';

import {
  OperationalPage,
  OperationalPageHeader,
  OperationalResultRegion
} from '@/shared/operational-page/operational-page';

import { AlertManagementNav } from '../components/alert-management-nav';
import { AlertCenterBulkActions } from '../components/alert-center-actions';
import { AlertCenterResults } from '../components/alert-center-results';
import { AlertCenterRecovery } from '../components/alert-center-recovery';
import { AlertCenterSummary } from '../components/alert-center-summary';
import { AlertCenterToolbar } from '../components/alert-center-toolbar';
import { useAlertCenterController } from '../controller/use-alert-center-controller';
import { canRetryAlertCenterRecovery } from '../model/alert-capability-model';

export function AlertCenterPage() {
  const controller = useAlertCenterController();
  const { capabilities, command, draft, list, query, recovery, refreshing, summary } = controller.state;
  const busy = command !== 'idle' || recovery !== null;

  return (
    <OperationalPage mode="data">
      <AlertCenterHeading manageRules={controller.manageRules} />
      <AlertManagementNav />
      <AlertCenterToolbar
        disabled={busy}
        draft={draft}
        query={query}
        refreshing={refreshing}
        onDraftChange={controller.setDraft}
        onSubmit={controller.submitFilters}
        onStatusChange={controller.changeStatus}
        onSeverityChange={controller.changeSeverity}
        onRefresh={controller.refresh}
      />
      <OperationalResultRegion>
        <AlertCenterSummary state={summary} retry={controller.retrySummary} />
        <AlertCenterBulkActions
          actionPolicy={capabilities}
          busy={busy}
          selectedGroups={selectedAlertGroups(list, controller.state.selectedIds)}
          actions={{
            acknowledge: controller.acknowledgeSelected,
            clear: controller.clearSelection,
            remove: controller.removeSelected,
            reopen: controller.reopenSelected,
            resolve: controller.resolveSelected,
            unacknowledge: controller.unacknowledgeSelected
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
    </OperationalPage>
  );
}

function AlertCenterHeading({ manageRules }: { manageRules: () => unknown }) {
  const { t } = useTranslation();
  return (
    <OperationalPageHeader
      title={t('alert.title')}
      description={t('alert.description')}
      actions={<Button onClick={() => void manageRules()}>{t('alertRules.manage')}</Button>}
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
