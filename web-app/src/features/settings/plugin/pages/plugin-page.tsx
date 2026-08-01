/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { Alert, Button, Input } from 'antd';
import { useTranslation } from 'react-i18next';

import {
  OperationalCommandBar,
  OperationalPage,
  OperationalPageHeader,
  OperationalResultRegion,
  OperationalStatePanel,
  type OperationalStateKind
} from '@/shared/operational-page';

import { PluginDeleteDialog, PluginUploadDialog } from '../components/plugin-dialogs';
import { PluginList } from '../components/plugin-list';
import { PluginParamDialog } from '../components/plugin-param-dialog';
import { usePluginController } from '../controller/use-plugin-controller';
import styles from './plugin-page.module.css';

export function PluginPage() {
  const { t } = useTranslation();
  const controller = usePluginController();
  return (
    <OperationalPage>
      <OperationalPageHeader
        title={t('plugins.title')}
        description={t('plugins.description')}
        actions={
          <Button
            type="primary"
            disabled={!controller.canWrite || controller.busy}
            onClick={controller.actions.openUpload}
          >
            {t('plugins.upload')}
          </Button>
        }
      />
      {!controller.canWrite && <Alert type="info" showIcon message={t('plugins.readOnly')} />}
      {controller.mutationFailure && !controller.deleteTarget && (
        <Alert type="error" showIcon message={t(`plugins.failure.${controller.mutationFailure}`)} />
      )}
      {controller.notice && <Alert type="success" showIcon message={t(`plugins.notice.${controller.notice}`)} />}
      <PluginToolbar controller={controller} />
      <OperationalResultRegion>
        <PluginResults controller={controller} />
      </OperationalResultRegion>
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
    </OperationalPage>
  );
}

function PluginToolbar({ controller }: { controller: ReturnType<typeof usePluginController> }) {
  const { t } = useTranslation();
  return (
    <OperationalCommandBar
      role="search"
      ariaLabel={t('plugins.search')}
      primary={
        <Input.Search
          className={styles.search}
          allowClear
          disabled={!controller.canWrite}
          value={controller.searchDraft}
          placeholder={t('plugins.search')}
          onChange={event => controller.actions.setSearchDraft(event.target.value)}
          onSearch={controller.actions.submitSearch}
        />
      }
      secondary={
        <>
          <Button disabled={!controller.canWrite} onClick={controller.actions.refresh}>
            {t('common.refresh')}
          </Button>
          <Button
            danger
            disabled={!controller.canWrite || controller.busy || controller.selectedIds.length === 0}
            onClick={controller.actions.requestDeleteSelected}
          >
            {t('plugins.deleteSelected')}
          </Button>
        </>
      }
    />
  );
}

function PluginResults({ controller }: { controller: ReturnType<typeof usePluginController> }) {
  const { t } = useTranslation();
  if (controller.listState.kind !== 'ready') {
    const presentation = pluginListStatePresentation(controller.listState.kind);
    return <OperationalStatePanel kind={presentation.kind} title={t(presentation.titleKey)} />;
  }
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

function pluginListStatePresentation(
  kind: Exclude<ReturnType<typeof usePluginController>['listState']['kind'], 'ready'>
) {
  const presentations = {
    loading: { kind: 'loading', titleKey: 'plugins.loading' },
    empty: { kind: 'empty', titleKey: 'plugins.empty' },
    'search-empty': { kind: 'no-match', titleKey: 'plugins.searchEmpty' },
    invalid: { kind: 'error', titleKey: 'plugins.failure.invalid' },
    permission: { kind: 'permission', titleKey: 'plugins.failure.permission' },
    unavailable: { kind: 'unavailable', titleKey: 'plugins.failure.unavailable' },
    error: { kind: 'error', titleKey: 'plugins.failure.error' }
  } satisfies Record<typeof kind, { kind: OperationalStateKind; titleKey: string }>;
  return presentations[kind];
}
