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

import { Alert, Button, Input, Space } from 'antd';
import { useTranslation } from 'react-i18next';

import { OperationalCommandBar, OperationalResultRegion } from '@/shared/operational-page';

import { LabelResults } from '../components/label-results';
import styles from '../components/label.module.css';
import type { useLabelEditorController } from '../controller/label-editor-controller';
import type { useLabelQueryController } from '../controller/label-query-controller';
import type { useLabelResourceController } from '../controller/label-resource-controller';
import type { LabelRecovery } from '../controller/label-save-recovery-controller';
import type { LabelActionCapabilities } from '../model/label-model';

type LabelQueryController = ReturnType<typeof useLabelQueryController>;
type LabelResourceController = ReturnType<typeof useLabelResourceController>;
type LabelEditorController = ReturnType<typeof useLabelEditorController>;

export function LabelPageActions({
  canCreate,
  locked,
  onCreate
}: {
  canCreate: boolean;
  locked: boolean;
  onCreate: () => void;
}) {
  const { t } = useTranslation();
  return (
    <Button type="primary" disabled={!canCreate || locked} onClick={onCreate}>
      {t('labels.new')}
    </Button>
  );
}

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
  return (
    <>
      <LabelRecoveryAlert
        command={resource.recoveryCommand}
        recovery={resource.recovery}
        saving={resource.isSaving}
        onRetry={resource.retryMutationProof}
      />
      <LabelToolbar
        draftSearch={draftSearch}
        refreshing={resource.refreshing}
        saving={resource.isSaving}
        onRefresh={resource.refresh}
        onSearchChange={onSearchChange}
        onSubmitSearch={onSubmitSearch}
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
          onPageChange={queryController.setPage}
          onCopy={label => void resource.copyLabel(label)}
          onEdit={editor.actions.edit}
          onRemove={resource.deleteLabel}
          onInspect={resource.inspectLabel}
        />
      </OperationalResultRegion>
    </>
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
  draftSearch: string;
  refreshing: boolean;
  saving: boolean;
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
        <Space.Compact className={styles.searchInput}>
          <Input
            allowClear
            disabled={props.saving}
            value={props.draftSearch}
            placeholder={t('labels.search')}
            onChange={event => props.onSearchChange(event.target.value)}
            onPressEnter={props.onSubmitSearch}
          />
          <Button type="primary" disabled={props.saving} onClick={props.onSubmitSearch}>
            {t('common.query')}
          </Button>
        </Space.Compact>
      }
      secondary={
        <Button disabled={props.saving} loading={props.refreshing} onClick={props.onRefresh}>
          {t('common.refresh')}
        </Button>
      }
    />
  );
}
