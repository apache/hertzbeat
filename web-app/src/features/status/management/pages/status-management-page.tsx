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

import { Button, Typography } from 'antd';
import { useTranslation } from 'react-i18next';

import { StatusManagementEditors } from '../components/status-management-editors';
import {
  StatusComponentSection,
  StatusIncidentSection,
  StatusOrgSection
} from '../components/status-management-sections';
import styles from '../components/status-management.module.css';
import { useStatusManagementController } from '../controller/use-status-management-controller';

export function StatusManagementPage() {
  const { t } = useTranslation();
  const controller = useStatusManagementController();
  const statusOrg = controller.org.kind === 'ready' ? controller.org.record : undefined;
  const statusComponents = controller.components.kind === 'ready' ? controller.components.records : [];
  const statusIncidents = controller.incidents.kind === 'ready' ? controller.incidents.records : [];
  const incidentTotal = controller.incidents.kind === 'ready' ? controller.incidents.total : 0;
  const { query } = controller.incidentQuery;
  return (
    <div className={styles.page}>
      <header className={styles.heading}>
        <div>
          <Typography.Title level={2}>{t('statusManagement.title')}</Typography.Title>
          <Typography.Text type="secondary">{t('statusManagement.description')}</Typography.Text>
        </div>
        <Button href="/status" target="_blank">{t('statusManagement.openPublicPage')}</Button>
      </header>
      <StatusOrgSection
        state={controller.org}
        saving={controller.orgSaving}
        onSave={controller.saveOrg}
      />
      <StatusComponentSection
        orgId={statusOrg?.id}
        state={controller.components}
        onNew={controller.openNewComponent}
        onEdit={controller.editComponent}
        onDelete={controller.deleteComponent}
      />
      <StatusIncidentSection
        orgId={statusOrg?.id}
        componentCount={statusComponents.length}
        draftSearch={controller.incidentQuery.draftSearch}
        state={controller.incidents}
        detailLoading={controller.incidentDetailLoading}
        detailState={controller.incidentDetailState}
        records={statusIncidents}
        pageIndex={query.pageIndex}
        pageSize={query.pageSize}
        total={incidentTotal}
        onDraftSearch={controller.incidentQuery.setDraftSearch}
        onQuery={controller.incidentQuery.submit}
        onRefresh={controller.refreshIncidents}
        onNew={controller.openNewIncident}
        onPageChange={controller.incidentQuery.changePage}
        onEdit={controller.openIncident}
        onDelete={controller.deleteIncident}
      />

      <StatusManagementEditors
        component={controller.componentEditor}
        incident={controller.incidentEditor}
        orgId={statusOrg?.id}
        components={statusComponents}
        componentSaving={controller.componentSaving}
        incidentSaving={controller.incidentSaving}
        onCloseComponent={controller.closeComponent}
        onCloseIncident={controller.closeIncident}
        onSaveComponent={controller.saveComponent}
        onSaveIncident={controller.saveIncident}
      />
    </div>
  );
}
