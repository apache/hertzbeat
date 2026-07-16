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

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { App, Button, Input, Typography } from 'antd';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import { SettingsNav } from '@/shared/settings/settings-nav';

import { deleteLabel, loadLabels, saveLabel, type LabelRecord } from '../api/label-api';
import { LabelEditor, type LabelEditorState } from '../components/label-editor';
import { LabelResults } from '../components/label-results';
import styles from '../components/label.module.css';
import { useLabelQueryController } from '../controller/label-query-controller';
import { buildLabelDisplayName, buildLabelMonitorPath } from '../model/label-model';

export function LabelPage() {
  const { t } = useTranslation();
  const { message } = App.useApp();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { query, setPage, setSearch } = useLabelQueryController();
  const [searchDraft, setSearchDraft] = useState({ source: query.search, value: query.search });
  const draftSearch = searchDraft.source === query.search ? searchDraft.value : query.search;
  const [editor, setEditor] = useState<LabelEditorState>();
  const labels = useQuery({ queryKey: ['labels', query], queryFn: () => loadLabels(query) });
  const refresh = () => void queryClient.invalidateQueries({ queryKey: ['labels'] });
  const save = useMutation({
    mutationFn: ({ value, isNew }: { value: Partial<LabelRecord>; isNew: boolean }) => saveLabel(value, isNew),
    onSuccess: () => {
      setEditor(undefined);
      refresh();
      void message.success(t('labels.saveSuccess'));
    },
    onError: () => void message.error(t('labels.saveFailed'))
  });
  const remove = useMutation({
    mutationFn: deleteLabel,
    onSuccess: () => {
      refresh();
      void message.success(t('labels.deleteSuccess'));
    },
    onError: () => void message.error(t('labels.deleteFailed'))
  });
  const copy = async (label: LabelRecord) => {
    try {
      await navigator.clipboard.writeText(buildLabelDisplayName(label));
      void message.success(t('labels.copySuccess'));
    } catch {
      void message.error(t('labels.copyFailed'));
    }
  };
  const submitSearch = () => {
    const search = draftSearch.trim();
    setSearchDraft({ source: search, value: search });
    setSearch(search);
  };
  return (
    <div className={styles.page}>
      <header className={styles.heading}>
        <Typography.Title level={2}>{t('labels.title')}</Typography.Title>
        <Typography.Text type="secondary">{t('labels.description')}</Typography.Text>
      </header>
      <SettingsNav />
      <div className={styles.toolbar}>
        <Input
          allowClear
          value={draftSearch}
          placeholder={t('labels.search')}
          onChange={(event) => setSearchDraft({ source: query.search, value: event.target.value })}
          onPressEnter={submitSearch}
        />
        <Button type="primary" onClick={submitSearch}>
          {t('common.query')}
        </Button>
        <Button onClick={() => void labels.refetch()}>{t('common.refresh')}</Button>
        <Button type="primary" onClick={() => setEditor({ value: {}, isNew: true })}>
          {t('labels.new')}
        </Button>
      </div>
      <LabelResults
        loading={labels.isPending}
        error={labels.isError}
        records={labels.data?.content ?? []}
        pageIndex={query.pageIndex}
        pageSize={query.pageSize}
        total={labels.data?.totalElements ?? 0}
        onPageChange={setPage}
        onCopy={(label) => void copy(label)}
        onEdit={(label) => setEditor({ value: { ...label }, isNew: false })}
        onRemove={(id) => remove.mutate(id)}
        onInspect={(label) => void navigate(buildLabelMonitorPath(label))}
      />
      {editor && (
        <LabelEditor
          editor={editor}
          saving={save.isPending}
          onCancel={() => setEditor(undefined)}
          onSubmit={(value) => save.mutate({ value, isNew: editor.isNew })}
        />
      )}
    </div>
  );
}
