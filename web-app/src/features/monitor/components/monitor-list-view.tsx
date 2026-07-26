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

import { OperationalPage, OperationalPageHeader } from '@/shared/operational-page';

import type { MonitorListViewActions, MonitorListViewState } from '../model/monitor-list-model';

import { MonitorBulkActions } from './monitor-list-actions';
import { MonitorImportDialog } from './monitor-import-dialog';
import { MonitorListManagementActions } from './monitor-list-management-actions';
import { MonitorListResults } from './monitor-list-results';
import { MonitorListToolbar } from './monitor-list-toolbar';
import styles from './monitor-list.module.css';

export type MonitorListViewProps = { state: MonitorListViewState; actions: MonitorListViewActions };

export function MonitorListView({ state, actions }: MonitorListViewProps) {
  const { t } = useTranslation();
  return (
    <OperationalPage>
      <OperationalPageHeader
        title={t('monitor.title')}
        description={t('monitor.description')}
        actions={
          <MonitorListManagementActions
            disabled={state.operating}
            canImport={state.monitorImport.canImport}
            canExport={state.canExport}
            create={actions.create}
            openImport={actions.openImport}
            exportAll={actions.exportAll}
          />
        }
      />
      <MonitorListToolbar
        query={state.query}
        draft={state.draft}
        apps={state.apps}
        disabled={state.operating}
        refreshing={state.refreshing}
        actions={actions}
      />
      <MonitorBulkActions
        selectedIds={state.selectedIds}
        run={actions.runBulk}
        exportSelected={actions.exportSelected}
        canExport={state.canExport}
        clearSelection={actions.clearSelection}
        disabled={state.operating}
      />
      <MonitorListResults
        evidence={state.monitors}
        query={state.query}
        selectedIds={state.selectedIds}
        operating={state.operating}
        actions={actions}
      />
      <MonitorImportDialog
        state={state.monitorImport}
        onCancel={actions.cancelImport}
        onFile={actions.selectImportFile}
        onSubmit={actions.submitImport}
      />
    </OperationalPage>
  );
}
