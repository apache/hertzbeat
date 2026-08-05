/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { Alert, Button, Modal, Typography } from 'antd';
import { useTranslation } from 'react-i18next';

import {
  monitorDefinitionFailureMessageKey,
  type MonitorDefinitionCatalogItem,
  type MonitorDefinitionFailureKind
} from '../model/monitor-definition-model';

export function MonitorDefinitionDeleteDialog(props: {
  failure: MonitorDefinitionFailureKind | null;
  pending: boolean;
  target: MonitorDefinitionCatalogItem | null;
  writeRecovery: 'uncertain' | null;
  onCancel: () => void;
  onConfirm: () => void;
  onRetryProof: () => void;
}) {
  const { t } = useTranslation();
  return (
    <Modal
      open={props.target !== null}
      title={t('monitorDefinitions.deleteTitle')}
      okText={t('common.delete')}
      cancelText={t('common.cancel')}
      okButtonProps={{
        danger: true,
        loading: props.pending && props.writeRecovery === null,
        disabled: props.writeRecovery !== null
      }}
      cancelButtonProps={{ disabled: props.pending && props.writeRecovery === null }}
      onCancel={props.onCancel}
      onOk={props.onConfirm}
    >
      <Typography.Paragraph>
        {t('monitorDefinitions.deleteConfirm', { app: props.target?.label ?? '' })}
      </Typography.Paragraph>
      {props.failure && (
        <Alert
          type="error"
          showIcon
          message={t(monitorDefinitionFailureMessageKey(props.failure))}
          action={
            props.writeRecovery === 'uncertain' ? (
              <Button loading={props.pending} onClick={props.onRetryProof}>
                {t('common.refresh')}
              </Button>
            ) : undefined
          }
        />
      )}
    </Modal>
  );
}
