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

import { PlusOutlined, ReloadOutlined } from '@ant-design/icons';
import { Alert, Button, Popconfirm, Space, Tooltip, Typography } from 'antd';
import { useTranslation } from 'react-i18next';

import { OperationalCommandBar, OperationalResultRegion, OperationalSearchControl } from '@/shared/operational-page';
import { useSourceScopedValue } from '@/shared/query-context';

import { LabelResults } from '../components/label-results';
import type { useLabelEditorController } from '../controller/label-editor-controller';
import type { useLabelQueryController } from '../controller/label-query-controller';
import type { useLabelResourceController } from '../controller/label-resource-controller';
import type { LabelRecovery } from '../controller/label-save-recovery-controller';
import type { LabelActionCapabilities } from '../model/label-model';
import type { LabelRecord } from '../model/label-model';
import styles from '../components/label.module.css';

type LabelQueryController = ReturnType<typeof useLabelQueryController>;
type LabelResourceController = ReturnType<typeof useLabelResourceController>;
type LabelEditorController = ReturnType<typeof useLabelEditorController>;

export function LabelWorkspace({
  capabilities,
  queryController,
  resource,
  editor,
  writeLocked,
  draftSearch,
  onSearchChange,
  onSubmitSearch
}: {
  capabilities: LabelActionCapabilities;
  queryController: LabelQueryController;
  resource: LabelResourceController;
  editor: LabelEditorController;
  writeLocked: boolean;
  draftSearch: string;
  onSearchChange: (value: string) => void;
  onSubmitSearch: () => void;
}) {
  const { query } = queryController;
  const selection = useSourceScopedValue<number[]>(
    JSON.stringify([capabilities.canDelete, query.search, query.pageIndex, query.pageSize]),
    []
  );
  const selectedIds = selection.value;
  const setSelectedIds = selection.setValue;
  const selectedRecords =
    resource.listState.kind === 'ready'
      ? resource.listState.records.filter(record => selectedIds.includes(record.id))
      : [];
  const clearSelection = () => setSelectedIds([]);
  const refresh = () => {
    clearSelection();
    resource.refresh();
  };
  const submitSearch = () => {
    clearSelection();
    onSubmitSearch();
  };
  const setPage = (pageIndex: number, pageSize: Parameters<typeof queryController.setPage>[1]) => {
    clearSelection();
    queryController.setPage(pageIndex, pageSize);
  };
  return (
    <>
      <LabelRecoveryAlert
        command={resource.recoveryCommand}
        recovery={resource.recovery}
        saving={resource.isSaving}
        onRetry={resource.retryMutationProof}
      />
      <LabelToolbar
        canCreate={capabilities.canCreate}
        draftSearch={draftSearch}
        locked={writeLocked}
        refreshing={resource.refreshing}
        saving={resource.isSaving}
        onCreate={editor.actions.create}
        onRefresh={refresh}
        onSearchChange={onSearchChange}
        onSubmitSearch={submitSearch}
      />
      <LabelBulkActions
        records={selectedRecords}
        saving={resource.isSaving}
        locked={writeLocked}
        onClear={clearSelection}
        onDelete={records => resource.deleteLabels(records, clearSelection)}
      />
      <OperationalResultRegion>
        <LabelResults
          busy={resource.isSaving}
          canDelete={capabilities.canDelete}
          canUpdate={capabilities.canUpdate}
          writeLocked={writeLocked}
          state={resource.listState}
          pageIndex={query.pageIndex}
          pageSize={query.pageSize}
          selectedIds={selectedIds}
          onSelectionChange={setSelectedIds}
          onPageChange={setPage}
          onCopy={label => void resource.copyLabel(label)}
          onEdit={editor.actions.edit}
          onRemove={resource.deleteLabel}
          onInspect={resource.inspectLabel}
        />
      </OperationalResultRegion>
    </>
  );
}

function LabelBulkActions({
  records,
  saving,
  locked,
  onClear,
  onDelete
}: {
  records: LabelRecord[];
  saving: boolean;
  locked: boolean;
  onClear: () => void;
  onDelete: (records: LabelRecord[]) => void;
}) {
  const { t } = useTranslation();
  if (records.length === 0) return null;
  return (
    <div className={styles.bulkActions ?? ''} aria-live="polite">
      <Typography.Text strong>{t('labels.selected', { count: records.length })}</Typography.Text>
      <Space size={8}>
        <Button type="text" disabled={saving} onClick={onClear}>
          {t('labels.clearSelection')}
        </Button>
        <Popconfirm
          title={t('labels.deleteSelectedConfirm', { count: records.length })}
          okButtonProps={{ danger: true }}
          onConfirm={() => onDelete(records)}
        >
          <Button danger disabled={locked}>
            {t('labels.deleteSelected')}
          </Button>
        </Popconfirm>
      </Space>
    </div>
  );
}

function LabelRecoveryAlert({
  command,
  recovery,
  saving,
  onRetry
}: {
  command: 'save' | 'delete' | null;
  recovery: LabelRecovery;
  saving: boolean;
  onRetry: () => Promise<boolean>;
}) {
  const { t } = useTranslation();
  if (!recovery) return null;
  return (
    <Alert
      type="warning"
      showIcon
      message={t(command === 'delete' ? 'labels.deleteFailed' : 'labels.saveFailed')}
      action={
        <Button size="small" loading={saving} onClick={() => void onRetry()}>
          {t('common.retry')}
        </Button>
      }
    />
  );
}

type LabelToolbarProps = {
  canCreate: boolean;
  draftSearch: string;
  locked: boolean;
  refreshing: boolean;
  saving: boolean;
  onCreate: () => void;
  onRefresh: () => void;
  onSearchChange: (value: string) => void;
  onSubmitSearch: () => void;
};

function LabelToolbar(props: LabelToolbarProps) {
  const { t } = useTranslation();
  return (
    <OperationalCommandBar
      role="search"
      ariaLabel={t('labels.search')}
      primary={
        <OperationalSearchControl
          ariaLabel={t('labels.search')}
          disabled={props.saving}
          placeholder={t('labels.search')}
          submitLabel={t('common.query')}
          value={props.draftSearch}
          onChange={props.onSearchChange}
          onSubmit={props.onSubmitSearch}
        />
      }
      secondary={
        <Space size={8}>
          <Tooltip title={t('common.refresh')}>
            <Button
              aria-label={t('common.refresh')}
              icon={<ReloadOutlined aria-hidden="true" />}
              disabled={props.saving}
              loading={props.refreshing}
              onClick={props.onRefresh}
            />
          </Tooltip>
          <Button
            type="primary"
            icon={<PlusOutlined aria-hidden="true" />}
            disabled={!props.canCreate || props.locked}
            onClick={props.onCreate}
          >
            {t('labels.new')}
          </Button>
        </Space>
      }
    />
  );
}
