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

import { Alert, Button, Input } from 'antd';
import { useTranslation } from 'react-i18next';

import { OperationalPage, OperationalPageHeader } from '@/shared/operational-page';
import { useStringQueryDraft } from '@/shared/query-context';

import { LabelEditor } from '../components/label-editor';
import { LabelResults } from '../components/label-results';
import styles from '../components/label.module.css';
import { useLabelEditorController } from '../controller/label-editor-controller';
import { useLabelQueryController } from '../controller/label-query-controller';
import { useLabelResourceController } from '../controller/label-resource-controller';
import type { LabelRecovery } from '../controller/label-save-recovery-controller';

export function LabelPage() {
  const { t } = useTranslation();
  const { query, reconcileConfirmedDelete, setPage, setSearch } = useLabelQueryController();
  const resource = useLabelResourceController(query, reconcileConfirmedDelete);
  const { value: draftSearch, setValue: setDraftSearch } = useStringQueryDraft(query.search, query.search);
  const editor = useLabelEditorController(resource);
  const writeLocked = resource.isLocked();
  const submitSearch = () => {
    const search = draftSearch.trim();
    setDraftSearch(search);
    setSearch(search);
  };
  return (
    <OperationalPage>
      <OperationalPageHeader
        title={t('labels.title')}
        description={t('labels.description')}
        actions={
          <Button type="primary" disabled={writeLocked} onClick={editor.actions.create}>
            {t('labels.new')}
          </Button>
        }
      />
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
        onSearchChange={setDraftSearch}
        onSubmitSearch={submitSearch}
      />
      <LabelResults
        busy={resource.isSaving}
        writeLocked={writeLocked}
        state={resource.listState}
        pageIndex={query.pageIndex}
        pageSize={query.pageSize}
        onPageChange={setPage}
        onCopy={label => void resource.copyLabel(label)}
        onEdit={editor.actions.edit}
        onRemove={resource.deleteLabel}
        onInspect={resource.inspectLabel}
      />
      {editor.state.editor && (
        <LabelEditor
          editor={editor.state.editor}
          locked={writeLocked}
          saving={resource.isSaving}
          onCancel={editor.actions.close}
          onSubmit={editor.actions.submit}
        />
      )}
    </OperationalPage>
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
    <div role="search" className={styles.commandBand}>
      <Input
        className={styles.searchInput}
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
      <Button disabled={props.saving} loading={props.refreshing} onClick={props.onRefresh}>
        {t('common.refresh')}
      </Button>
    </div>
  );
}
