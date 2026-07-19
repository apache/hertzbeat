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

import { Button, Input, Typography } from 'antd';
import { useTranslation } from 'react-i18next';

import { useStringQueryDraft } from '@/shared/query-context';

import { LabelEditor } from '../components/label-editor';
import { LabelResults } from '../components/label-results';
import styles from '../components/label.module.css';
import { useLabelEditorController } from '../controller/label-editor-controller';
import { useLabelQueryController } from '../controller/label-query-controller';
import { useLabelResourceController } from '../controller/label-resource-controller';

export function LabelPage() {
  const { t } = useTranslation();
  const { query, setPage, setSearch } = useLabelQueryController();
  const resource = useLabelResourceController(query);
  const { value: draftSearch, setValue: setDraftSearch } = useStringQueryDraft(query.search, query.search);
  const editor = useLabelEditorController(resource);
  const submitSearch = () => {
    const search = draftSearch.trim();
    setDraftSearch(search);
    setSearch(search);
  };
  return (
    <div className={styles.page}>
      <header className={styles.heading}>
        <Typography.Title level={2}>{t('labels.title')}</Typography.Title>
        <Typography.Text type="secondary">{t('labels.description')}</Typography.Text>
      </header>
      <div className={styles.toolbar}>
        <Input
          allowClear
          disabled={resource.isSaving}
          value={draftSearch}
          placeholder={t('labels.search')}
          onChange={event => setDraftSearch(event.target.value)}
          onPressEnter={submitSearch}
        />
        <Button type="primary" disabled={resource.isSaving} onClick={submitSearch}>
          {t('common.query')}
        </Button>
        <Button disabled={resource.isSaving} loading={resource.refreshing} onClick={resource.refresh}>
          {t('common.refresh')}
        </Button>
        <Button type="primary" disabled={resource.isSaving} onClick={editor.actions.create}>
          {t('labels.new')}
        </Button>
      </div>
      <LabelResults
        busy={resource.isSaving}
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
          saving={resource.isSaving}
          onCancel={editor.actions.close}
          onSubmit={editor.actions.submit}
        />
      )}
    </div>
  );
}
