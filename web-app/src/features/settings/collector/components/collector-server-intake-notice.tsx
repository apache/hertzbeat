/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { Alert, Button, Descriptions, Flex, Modal } from 'antd';
import { useTranslation } from 'react-i18next';

import { applicationRoutePaths } from '@/shared/navigation/app-paths';

import type { CollectorRecord } from '../model/collector-model';

type AvailableIntake = Extract<CollectorRecord['instrumentationIntake'], { status: 'available' }>;

type Props = {
  record: CollectorRecord;
  intake: AvailableIntake;
  saving: boolean;
  onCancel: () => void;
};

/**
 * Preserves a legacy Server-owned advertisement without presenting it as a
 * Collector capability. Server listeners are configured by the telemetry
 * intake workflow and must never be mutated from a Collector row.
 */
export function CollectorServerIntakeNotice({ record, intake, saving, onCancel }: Props) {
  const { t } = useTranslation();
  return (
    <Modal
      open
      title={t('collectors.intake.serverOwnedTitle')}
      closable={!saving}
      keyboard={!saving}
      maskClosable={false}
      onCancel={onCancel}
      footer={[
        <Button key="close" disabled={saving} onClick={onCancel}>
          {t('collectors.intake.close')}
        </Button>,
        <Button key="instrumentation" type="primary" href={applicationRoutePaths.instrumentation}>
          {t('collectors.intake.openInstrumentation')}
        </Button>
      ]}
    >
      <Flex vertical gap="middle">
        <Alert
          type="info"
          showIcon
          message={t('collectors.intake.serverOwned', { name: record.name })}
          description={t('collectors.intake.serverOwnedDescription')}
        />
        <Descriptions column={1} size="small" bordered>
          {intake.otlpHttpEndpoint && (
            <Descriptions.Item label={t('collectors.intake.httpCapability')}>
              {intake.otlpHttpEndpoint}
            </Descriptions.Item>
          )}
          {intake.otlpGrpcEndpoint && (
            <Descriptions.Item label={t('collectors.intake.grpcCapability')}>
              {intake.otlpGrpcEndpoint}
            </Descriptions.Item>
          )}
        </Descriptions>
      </Flex>
    </Modal>
  );
}
