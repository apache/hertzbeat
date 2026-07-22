/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { Alert, Button, Empty, Input, Skeleton, Space, Typography } from 'antd';
import { useTranslation } from 'react-i18next';

import { PluginDeleteDialog, PluginUploadDialog } from '../components/plugin-dialogs';
import { PluginList } from '../components/plugin-list';
import { PluginParamDialog } from '../components/plugin-param-dialog';
import { usePluginController } from '../controller/use-plugin-controller';
import styles from './plugin-page.module.css';

export function PluginPage() {
  const { t } = useTranslation();
  const controller = usePluginController();
  return (
    <div className={styles.page}>
      <header className={styles.heading}>
        <div>
          <Typography.Title level={2}>{t('plugins.title')}</Typography.Title>
          <Typography.Text type="secondary">{t('plugins.description')}</Typography.Text>
        </div>
        <Button
          type="primary"
          disabled={!controller.canWrite || controller.busy}
          onClick={controller.actions.openUpload}
        >
          {t('plugins.upload')}
        </Button>
      </header>
      {!controller.canWrite && <Alert type="info" showIcon message={t('plugins.readOnly')} />}
      {controller.mutationFailure && !controller.deleteTarget && (
        <Alert type="error" showIcon message={t(`plugins.failure.${controller.mutationFailure}`)} />
      )}
      {controller.notice && <Alert type="success" showIcon message={t(`plugins.notice.${controller.notice}`)} />}
      <PluginToolbar controller={controller} />
      <PluginResults controller={controller} />
      <PluginUploadDialog
        upload={controller.upload}
        invalid={controller.uploadInvalid}
        failure={controller.upload ? controller.uploadFailure : null}
        busy={controller.busy}
        onCancel={controller.actions.cancelUpload}
        onSave={() => void controller.actions.saveUpload()}
        onName={controller.actions.setUploadName}
        onFile={controller.actions.setUploadFile}
        onEnabled={controller.actions.setUploadEnabled}
      />
      <PluginDeleteDialog
        target={controller.deleteTarget}
        failure={controller.deleteTarget ? controller.mutationFailure : null}
        busy={controller.busy}
        onCancel={controller.actions.cancelDelete}
        onConfirm={() => void controller.actions.confirmDelete()}
      />
      <PluginParamDialog controller={controller.params} />
    </div>
  );
}

function PluginToolbar({ controller }: { controller: ReturnType<typeof usePluginController> }) {
  const { t } = useTranslation();
  return (
    <div className={styles.toolbar}>
      <Input.Search
        className={styles.search}
        allowClear
        value={controller.searchDraft}
        placeholder={t('plugins.search')}
        onChange={event => controller.actions.setSearchDraft(event.target.value)}
        onSearch={controller.actions.submitSearch}
      />
      <Button onClick={controller.actions.refresh}>{t('common.refresh')}</Button>
      <Button
        danger
        disabled={!controller.canWrite || controller.busy || controller.selectedIds.length === 0}
        onClick={controller.actions.requestDeleteSelected}
      >
        {t('plugins.deleteSelected')}
      </Button>
    </div>
  );
}

function PluginResults({ controller }: { controller: ReturnType<typeof usePluginController> }) {
  const { t } = useTranslation();
  if (controller.listState.kind === 'loading') return <State text={t('plugins.loading')} loading />;
  if (controller.listState.kind === 'empty') return <Empty description={t('plugins.empty')} />;
  if (controller.listState.kind === 'search-empty') return <Empty description={t('plugins.searchEmpty')} />;
  if (controller.listState.kind === 'unavailable') return <Empty description={t('plugins.failure.unavailable')} />;
  if (controller.listState.kind === 'error') return <Empty description={t('plugins.failure.error')} />;
  return (
    <PluginList
      records={controller.listState.records}
      total={controller.listState.total}
      query={controller.query}
      pageSizes={controller.pageSizes}
      selectedIds={controller.selectedIds}
      canWrite={controller.canWrite}
      busy={controller.busy}
      onSelected={controller.actions.setSelected}
      onPage={controller.actions.setPage}
      onToggle={plugin => void controller.actions.toggleStatus(plugin)}
      onDelete={controller.actions.requestDeleteOne}
      onConfigure={controller.actions.openParams}
    />
  );
}

function State({ text, loading = false }: { text: string; loading?: boolean }) {
  return (
    <Space direction="vertical">
      <Typography.Text>{text}</Typography.Text>
      {loading && <Skeleton active />}
    </Space>
  );
}
