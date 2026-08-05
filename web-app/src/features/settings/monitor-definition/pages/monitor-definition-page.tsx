/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { Alert, Button, Input, Space } from 'antd';
import { useTranslation } from 'react-i18next';

import {
  OperationalPage,
  OperationalPageHeader,
  OperationalResultRegion,
  OperationalStatePanel
} from '@/shared/operational-page';

import { MonitorDefinitionCatalog } from '../components/monitor-definition-catalog';
import { MonitorDefinitionDeleteDialog } from '../components/monitor-definition-delete-dialog';
import { MonitorDefinitionWorkspaceView } from '../components/monitor-definition-workspace';
import { useMonitorDefinitionController } from '../controller/use-monitor-definition-controller';
import {
  monitorDefinitionFailureMessageKey,
  type MonitorDefinitionFailureKind
} from '../model/monitor-definition-model';
import styles from './monitor-definition-page.module.css';

export function MonitorDefinitionPage() {
  const { t } = useTranslation();
  const controller = useMonitorDefinitionController();
  return (
    <OperationalPage>
      <OperationalPageHeader
        title={t('monitorDefinitions.title')}
        description={t('monitorDefinitions.description')}
        actions={
          <Button type="primary" disabled={!controller.canWrite} onClick={controller.actions.openCreate}>
            {t('monitorDefinitions.create')}
          </Button>
        }
      />
      {!controller.canWrite && <Alert showIcon type="info" message={t('monitorDefinitions.readOnly')} />}
      {controller.notice && (
        <Alert showIcon type="success" message={t(`monitorDefinitions.disposition.${controller.notice}`)} />
      )}
      <OperationalResultRegion>
        <div className={styles.layout} data-monitor-definition-layout>
          <nav className={styles.selector} aria-label={t('monitorDefinitions.title')}>
            <Space.Compact block>
              <Input
                allowClear
                value={controller.search}
                placeholder={t('monitorDefinitions.search')}
                onChange={event => controller.actions.setSearch(event.target.value)}
              />
              <Button onClick={controller.actions.refresh}>{t('common.refresh')}</Button>
            </Space.Compact>
            <CatalogState controller={controller} />
          </nav>
          <main className={styles.workspace}>
            <MonitorDefinitionWorkspaceView
              canWrite={controller.canWrite}
              workspace={controller.workspace}
              onCancel={controller.actions.cancelEdit}
              onChange={controller.actions.setDefinition}
              onDelete={controller.actions.requestDelete}
              onEdit={app => void controller.actions.openEdit(app)}
              onRefreshAuthoritativeDraft={() => void controller.actions.refreshAuthoritativeDraft()}
              onRetryCatalogProof={() => void controller.actions.retryWorkspaceProof()}
              onRetry={() => void controller.actions.retryWorkspace()}
              onSave={() => void controller.actions.save()}
              onValidate={() => void controller.actions.validate()}
            />
          </main>
        </div>
      </OperationalResultRegion>
      <MonitorDefinitionDeleteDialog
        failure={controller.deleteFailure}
        pending={controller.deletePending}
        target={controller.deleteTarget}
        writeRecovery={controller.deleteWriteRecovery}
        onCancel={controller.actions.cancelDelete}
        onConfirm={() => void controller.actions.confirmDelete()}
        onRetryProof={() => void controller.actions.retryDeleteProof()}
      />
    </OperationalPage>
  );
}

function CatalogState({ controller }: { controller: ReturnType<typeof useMonitorDefinitionController> }) {
  const { t } = useTranslation();
  if (controller.listState.kind === 'loading') {
    return <OperationalStatePanel kind="loading" title={t('monitorDefinitions.loading')} />;
  }
  if (controller.listState.kind === 'error') {
    return (
      <OperationalStatePanel
        kind={catalogFailureState(controller.listState.failure)}
        title={t(monitorDefinitionFailureMessageKey(controller.listState.failure))}
        action={<Button onClick={controller.actions.refresh}>{t('common.retry')}</Button>}
      />
    );
  }
  if (controller.listState.kind === 'empty') {
    return <OperationalStatePanel kind="empty" title={t('monitorDefinitions.empty')} />;
  }
  if (controller.items.length === 0) {
    return <OperationalStatePanel kind="no-match" title={t('monitorDefinitions.searchEmpty')} />;
  }
  return (
    <MonitorDefinitionCatalog
      items={controller.items}
      selectedApp={controller.selectedApp}
      onSelect={app => void controller.actions.openView(app)}
    />
  );
}

function catalogFailureState(failure: MonitorDefinitionFailureKind) {
  if (failure === 'forbidden') return 'permission';
  if (failure === 'unavailable') return 'unavailable';
  return 'error';
}
