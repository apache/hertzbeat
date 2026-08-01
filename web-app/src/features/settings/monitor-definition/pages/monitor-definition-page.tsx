/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { Alert, Button, Input, Modal, Typography } from 'antd';
import { useTranslation } from 'react-i18next';

import {
  OperationalCommandBar,
  OperationalPage,
  OperationalPageHeader,
  OperationalResultRegion,
  OperationalStatePanel
} from '@/shared/operational-page';

import { MonitorDefinitionCatalog } from '../components/monitor-definition-catalog';
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
      <OperationalCommandBar
        role="search"
        ariaLabel={t('monitorDefinitions.search')}
        primary={
          <Input
            className={styles.search}
            allowClear
            value={controller.search}
            placeholder={t('monitorDefinitions.search')}
            onChange={event => controller.actions.setSearch(event.target.value)}
          />
        }
        secondary={<Button onClick={controller.actions.refresh}>{t('common.refresh')}</Button>}
      />
      <OperationalResultRegion>
        <CatalogState controller={controller} />
      </OperationalResultRegion>
      <MonitorDefinitionWorkspaceView
        workspace={controller.workspace}
        onCancel={controller.actions.closeWorkspace}
        onChange={controller.actions.setDefinition}
        onRefreshAuthoritativeDraft={() => void controller.actions.refreshAuthoritativeDraft()}
        onRetryCatalogProof={() => void controller.actions.retryWorkspaceProof()}
        onRetry={() => void controller.actions.retryWorkspace()}
        onSave={() => void controller.actions.save()}
        onValidate={() => void controller.actions.validate()}
      />
      <DeleteDialog controller={controller} />
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
      canWrite={controller.canWrite}
      items={controller.items}
      onDelete={controller.actions.requestDelete}
      onEdit={app => void controller.actions.openEdit(app)}
      onView={app => void controller.actions.openView(app)}
    />
  );
}

function catalogFailureState(failure: MonitorDefinitionFailureKind) {
  if (failure === 'forbidden') return 'permission';
  if (failure === 'unavailable') return 'unavailable';
  return 'error';
}

function DeleteDialog({ controller }: { controller: ReturnType<typeof useMonitorDefinitionController> }) {
  const { t } = useTranslation();
  return (
    <Modal
      open={controller.deleteTarget !== null}
      title={t('monitorDefinitions.deleteTitle')}
      okText={t('common.delete')}
      cancelText={t('common.cancel')}
      okButtonProps={{
        danger: true,
        loading: controller.deletePending && controller.deleteWriteRecovery === null,
        disabled: controller.deleteWriteRecovery !== null
      }}
      cancelButtonProps={{ disabled: controller.deletePending && controller.deleteWriteRecovery === null }}
      onCancel={controller.actions.cancelDelete}
      onOk={() => void controller.actions.confirmDelete()}
    >
      <Typography.Paragraph>
        {t('monitorDefinitions.deleteConfirm', { app: controller.deleteTarget?.label ?? '' })}
      </Typography.Paragraph>
      {controller.deleteFailure && (
        <Alert
          type="error"
          showIcon
          message={t(monitorDefinitionFailureMessageKey(controller.deleteFailure))}
          action={
            controller.deleteWriteRecovery === 'uncertain' ? (
              <Button loading={controller.deletePending} onClick={() => void controller.actions.retryDeleteProof()}>
                {t('common.refresh')}
              </Button>
            ) : undefined
          }
        />
      )}
    </Modal>
  );
}
