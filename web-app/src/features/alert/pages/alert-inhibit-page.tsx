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

import { AlertManagementNav } from '../components/alert-management-nav';
import {
  OperationalCommandBar,
  OperationalPage,
  OperationalResultRegion
} from '@/shared/operational-page/operational-page';
import { AlertInhibitPageHeader } from '../components/alert-inhibit-page-header';
import { AlertNoiseControlNav } from '../components/alert-noise-control-nav';
import { AlertNoiseControlManagementContextBar } from '../components/alert-noise-control-management-context';
import { AlertInhibitRecovery } from '../components/alert-inhibit-recovery';
import { AlertInhibitDetailFailure, AlertInhibitResults } from '../components/alert-inhibit-results';
import { AlertInhibitToolbar } from '../components/alert-inhibit-toolbar';
import { useAlertInhibitController } from '../controller/use-alert-inhibit-controller';
import { alertInhibitRouteRecovery } from '../model/alert-inhibit-recovery-capability';
import { AlertInhibitDraftEditor } from './alert-inhibit-draft-editor';

export function AlertInhibitPage() {
  const { t } = useTranslation();
  const controller = useAlertInhibitController();
  const { capabilities } = controller;
  const { command, detail, draft, list, management, query, recovery, refreshing, search, selectedIds } =
    controller.state;
  const routeRecovery = alertInhibitRouteRecovery(recovery, capabilities, draft !== null);
  const busy = command !== 'idle';
  const removeSelected = () => {
    if (!busy && selectedIds.length > 0) void controller.removeMany(selectedIds);
  };
  return (
    <OperationalPage mode="data">
      <AlertInhibitPageHeader
        busy={busy}
        capabilities={capabilities}
        selectedCount={selectedIds.length}
        create={controller.create}
        removeSelected={removeSelected}
      />
      <AlertManagementNav />
      <AlertNoiseControlNav />
      <AlertInhibitManagement controller={controller} management={management} busy={busy} />
      <OperationalCommandBar
        role="search"
        ariaLabel={t('alertInhibits.search')}
        primary={
          <AlertInhibitToolbar
            busy={busy}
            search={search}
            refreshing={refreshing}
            setSearch={controller.setSearch}
            submitSearch={controller.submitSearch}
            refresh={controller.refresh}
          />
        }
      />
      <OperationalResultRegion>
        <AlertInhibitRecovery
          recovery={routeRecovery.recovery}
          retrying={command !== 'recovering' || !routeRecovery.canRetry}
          retry={controller.retry}
        />
        {capabilities.canWrite && (
          <AlertInhibitDetailFailure state={detail} busy={busy} retry={controller.retryDetail} />
        )}
        <AlertInhibitResults
          capabilities={capabilities}
          state={list}
          busy={busy}
          pageIndex={query.pageIndex}
          pageSize={query.pageSize}
          selectedIds={selectedIds}
          selectIds={controller.selectIds}
          edit={controller.edit}
          toggle={controller.toggle}
          remove={controller.remove}
          changePage={controller.changePage}
          retry={controller.refresh}
        />
      </OperationalResultRegion>
      {capabilities.canWrite && <AlertInhibitDraftEditor controller={controller} />}
    </OperationalPage>
  );
}

function AlertInhibitManagement({
  controller,
  management,
  busy
}: {
  controller: ReturnType<typeof useAlertInhibitController>;
  management: ReturnType<typeof useAlertInhibitController>['state']['management'];
  busy: boolean;
}) {
  return (
    <AlertNoiseControlManagementContextBar
      translationRoot="alertInhibits"
      {...managementContextProps(controller, management, busy)}
    />
  );
}

function managementContextProps(
  controller: ReturnType<typeof useAlertInhibitController>,
  management: ReturnType<typeof useAlertInhibitController>['state']['management'],
  busy: boolean
) {
  return {
    context: management.context,
    missingCount: management.missingCount,
    busy,
    viewAll: controller.viewAllRules,
    viewMatched: controller.viewMatchedRules,
    returnToEntity: controller.returnToEntity
  };
}
