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

import { useQuery } from '@tanstack/react-query';
import { App, Button, Typography } from 'antd';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';

import { SettingsNav } from '@/shared/settings/settings-nav';

import { StatusManagementEditors } from '../components/status-management-editors';
import {
  StatusComponentSection,
  StatusIncidentSection,
  StatusOrgSection
} from '../components/status-management-sections';
import styles from '../components/status-management.module.css';
import {
  loadStatusComponents,
  loadStatusIncidents,
  loadStatusOrg,
  readStatusIncidentQuery,
  writeStatusIncidentQuery,
  type StatusComponent
} from '../api/status-management-api';
import { useStatusManagementMutations } from '../hooks/use-status-management-mutations';
import { useStatusIncidentEditor } from '../hooks/use-status-incident-editor';

type ComponentEditorState = Partial<StatusComponent>;

export function StatusManagementPage() {
  const { t } = useTranslation();
  const { message } = App.useApp();
  const reportIncidentLoadFailure = useCallback(
    () => void message.error(t('statusManagement.loadIncidentFailed')),
    [message, t]
  );
  const [searchParams, setSearchParams] = useSearchParams();
  const query = readStatusIncidentQuery(searchParams);
  const [draftSearch, setDraftSearch] = useState(query.search);
  const [componentEditor, setComponentEditor] = useState<ComponentEditorState>();

  const org = useQuery({ queryKey: ['status-page-org'], queryFn: loadStatusOrg, retry: false });
  const components = useQuery({ queryKey: ['status-page-components'], queryFn: loadStatusComponents });
  const incidents = useQuery({ queryKey: ['status-page-incidents', query], queryFn: () => loadStatusIncidents(query) });
  const incidentEditor = useStatusIncidentEditor(reportIncidentLoadFailure);
  const mutations = useStatusManagementMutations(
    org.data,
    () => setComponentEditor(undefined),
    incidentEditor.close
  );

  const statusOrg = org.data;
  const statusComponents = components.data ?? [];
  const updateQuery = (patch: Partial<typeof query>) =>
    setSearchParams(writeStatusIncidentQuery({ ...query, ...patch }));

  return (
    <div className={styles.page}>
      <header className={styles.heading}>
        <div>
          <Typography.Title level={2}>{t('statusManagement.title')}</Typography.Title>
          <Typography.Text type="secondary">{t('statusManagement.description')}</Typography.Text>
        </div>
        <Button href="/status" target="_blank">{t('statusManagement.openPublicPage')}</Button>
      </header>
      <SettingsNav />

      <StatusOrgSection
        org={statusOrg}
        pending={org.isPending}
        error={org.error}
        saving={mutations.orgSave.isPending}
        onSave={value => mutations.orgSave.mutate(value)}
      />
      <StatusComponentSection
        orgId={statusOrg?.id}
        records={statusComponents}
        loading={components.isPending}
        error={components.isError}
        onNew={() => setComponentEditor({ orgId: statusOrg?.id ?? 0 })}
        onEdit={setComponentEditor}
        onDelete={id => mutations.componentRemove.mutate(id)}
      />
      <StatusIncidentSection
        orgId={statusOrg?.id}
        componentCount={statusComponents.length}
        draftSearch={draftSearch}
        loading={incidents.isPending || incidentEditor.loading}
        error={incidents.isError}
        records={incidents.data?.content ?? []}
        pageIndex={query.pageIndex}
        pageSize={query.pageSize}
        total={incidents.data?.totalElements ?? 0}
        onDraftSearch={setDraftSearch}
        onQuery={() => updateQuery({ search: draftSearch.trim(), pageIndex: 0 })}
        onRefresh={() => void incidents.refetch()}
        onNew={() => incidentEditor.openNew(statusOrg?.id)}
        onPageChange={(pageIndex, pageSize) => updateQuery({ pageIndex, pageSize })}
        onEdit={incidentEditor.edit}
        onDelete={id => mutations.incidentRemove.mutate(id)}
      />

      <StatusManagementEditors
        component={componentEditor}
        incident={incidentEditor.incident}
        orgId={statusOrg?.id}
        components={statusComponents}
        componentSaving={mutations.componentSave.isPending}
        incidentSaving={mutations.incidentSave.isPending}
        onCloseComponent={() => setComponentEditor(undefined)}
        onCloseIncident={incidentEditor.close}
        onSaveComponent={value => mutations.componentSave.mutate(value)}
        onSaveIncident={value => mutations.incidentSave.mutate(value)}
      />
    </div>
  );
}
