/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { Alert, Button, Empty, Input, Modal, Skeleton, Space, Typography } from 'antd';
import { useTranslation } from 'react-i18next';

import { OperationalPage, OperationalPageHeader } from '@/shared/operational-page';

import { MonitorDefinitionCatalog } from '../components/monitor-definition-catalog';
import { MonitorDefinitionWorkspaceView } from '../components/monitor-definition-workspace';
import { useMonitorDefinitionController } from '../controller/use-monitor-definition-controller';
import { monitorDefinitionFailureMessageKey } from '../model/monitor-definition-model';
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
      <Space.Compact role="search" className={styles.commandBand}>
        <Input
          allowClear
          value={controller.search}
          placeholder={t('monitorDefinitions.search')}
          onChange={event => controller.actions.setSearch(event.target.value)}
        />
        <Button onClick={controller.actions.refresh}>{t('common.refresh')}</Button>
      </Space.Compact>
      <CatalogState controller={controller} />
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
    return (
      <div aria-label={t('monitorDefinitions.loading')}>
        <Skeleton active paragraph={{ rows: 8 }} />
      </div>
    );
  }
  if (controller.listState.kind === 'error') {
    return (
      <Alert
        showIcon
        type="error"
        message={t(monitorDefinitionFailureMessageKey(controller.listState.failure))}
        action={<Button onClick={controller.actions.refresh}>{t('common.retry')}</Button>}
      />
    );
  }
  if (controller.listState.kind === 'empty') {
    return <Empty description={t('monitorDefinitions.empty')} />;
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
