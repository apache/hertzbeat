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

import { StatusManagementEditors } from '../components/status-management-editors';
import { StatusManagementHeader } from '../components/status-management-header';
import { StatusWriteRecoveryAlert } from '../components/status-write-recovery-alert';
import { StatusComponentSection } from '../components/status-component-section';
import { StatusIncidentSection } from '../components/status-incident-section';
import { StatusOrgSection } from '../components/status-org-section';
import { publicStatusPath } from '@/features/status/shared/status-constants';
import { OperationalPage, OperationalResultRegion } from '@/shared/operational-page';
import { useStatusManagementController } from '../controller/use-status-management-controller';

export function StatusManagementPage() {
  const controller = useStatusManagementController();
  const statusOrg = controller.org.kind === 'ready' ? controller.org.record : undefined;
  const statusComponents = controller.components.kind === 'ready' ? controller.components.records : [];
  return (
    <OperationalPage mode="workspace">
      <StatusManagementHeader publicStatusHref={publicStatusPath} />
      <OperationalResultRegion>
        <StatusOrgSection
          canCreate={controller.capabilities.canCreate}
          canUpdate={controller.capabilities.canUpdate}
          state={controller.org}
          saving={controller.orgSaving}
          commandLocked={controller.commandLocked}
          writeRecovery={controller.orgWriteRecovery}
          onRetryWrite={controller.retryOrgWrite}
          onSave={controller.saveOrg}
        />
        <StatusComponentSection
          canCreate={controller.capabilities.canCreate}
          canUpdate={controller.capabilities.canUpdate}
          canDelete={controller.capabilities.canDelete}
          orgId={statusOrg?.id}
          state={controller.components}
          commandLocked={controller.commandLocked}
          deleteRecovery={controller.componentDeleteRecovery}
          deleteRecoveryPending={controller.componentDeleteRecoveryPending}
          onNew={controller.openNewComponent}
          onRefresh={controller.refreshComponents}
          onEdit={controller.editComponent}
          onDelete={controller.deleteComponent}
        />
        <StatusIncidentWorkspace
          controller={controller}
          orgId={statusOrg?.id}
          componentCount={statusComponents.length}
        />
      </OperationalResultRegion>

      <StatusEditorLayer controller={controller} components={statusComponents} />
    </OperationalPage>
  );
}

function StatusIncidentWorkspace({
  controller,
  orgId,
  componentCount
}: {
  controller: ReturnType<typeof useStatusManagementController>;
  orgId: number | undefined;
  componentCount: number;
}) {
  const records = controller.incidents.kind === 'ready' ? controller.incidents.records : [];
  const total = controller.incidents.kind === 'ready' ? controller.incidents.total : 0;
  const { query } = controller.incidentQuery;
  return (
    <StatusIncidentSection
      canCreate={controller.capabilities.canCreate}
      canUpdate={controller.capabilities.canUpdate}
      canDelete={controller.capabilities.canDelete}
      orgId={orgId}
      componentCount={componentCount}
      draftSearch={controller.incidentQuery.draftSearch}
      state={controller.incidents}
      detailLoading={controller.incidentDetailLoading}
      detailState={controller.incidentDetailState}
      records={records}
      pageIndex={query.pageIndex}
      pageSize={query.pageSize}
      total={total}
      commandLocked={controller.commandLocked}
      deleteRecovery={controller.incidentDeleteRecovery}
      deleteRecoveryPending={controller.incidentDeleteRecoveryPending}
      onDraftSearch={controller.incidentQuery.setDraftSearch}
      onQuery={controller.incidentQuery.submit}
      onRefresh={controller.refreshIncidents}
      onNew={controller.openNewIncident}
      onPageChange={controller.incidentQuery.changePage}
      onEdit={controller.openIncident}
      onDelete={controller.deleteIncident}
    />
  );
}

function StatusEditorLayer({
  controller,
  components
}: {
  controller: ReturnType<typeof useStatusManagementController>;
  components: Parameters<typeof StatusManagementEditors>[0]['components'];
}) {
  return (
    <>
      {!controller.componentEditor && controller.componentWriteRecovery && <StatusWriteRecoveryAlert />}
      {!controller.incidentEditor && controller.incidentWriteRecovery && <StatusWriteRecoveryAlert />}
      <StatusManagementEditors
        component={controller.componentEditor}
        incident={controller.incidentEditor}
        components={components}
        commandLocked={controller.commandLocked}
        componentWriteRecovery={controller.componentWriteRecovery}
        incidentWriteRecovery={controller.incidentWriteRecovery}
        componentSaving={controller.componentSaving}
        incidentSaving={controller.incidentSaving}
        onCloseComponent={controller.closeComponent}
        onCloseIncident={controller.closeIncident}
        onRetryComponentWrite={controller.retryComponentWrite}
        onRetryIncidentWrite={controller.retryIncidentWrite}
        onSaveComponent={controller.saveComponent}
        onSaveIncident={controller.saveIncident}
      />
    </>
  );
}
