/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { Alert, Button, Checkbox, Form, Input, Modal, Select } from 'antd';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import {
  collectorIntakeCanBeCleared,
  collectorIntakeState,
  parseCollectorIntakeAdvertisementRequest,
  type CollectorIntakeAdvertisementRequest,
  type CollectorIntakeCapability
} from '@/shared/collector';

import type { CollectorMutationFailure, CollectorRecord } from '../model/collector-model';

type FormValue = {
  gateway: 'collector' | 'server';
  capabilities: CollectorIntakeCapability[];
  otlpHttpEndpoint: string;
  otlpGrpcEndpoint: string;
};

type Props = {
  canDelete: boolean;
  record: CollectorRecord | null;
  saving: boolean;
  failure: CollectorMutationFailure | null;
  onCancel: () => void;
  onSave: (request: CollectorIntakeAdvertisementRequest) => void;
  onClear: () => void;
};

export function CollectorIntakeDialog(props: Props) {
  const [confirmClear, setConfirmClear] = useState(false);
  if (!props.record) return null;
  return (
    <>
      <IntakeEditorModal {...props} record={props.record} onRequestClear={() => setConfirmClear(true)} />
      <ClearIntakeDialog
        record={props.record}
        open={confirmClear}
        onCancel={() => setConfirmClear(false)}
        onConfirm={() => {
          setConfirmClear(false);
          props.onClear();
        }}
      />
    </>
  );
}

function IntakeEditorModal(props: Props & { record: CollectorRecord; onRequestClear: () => void }) {
  const { t } = useTranslation();
  const [form] = Form.useForm<FormValue>();
  const capabilities = Form.useWatch('capabilities', form) ?? [];
  const [invalid, setInvalid] = useState(false);
  const submit = (value: FormValue) => {
    const request = parseCollectorIntakeAdvertisementRequest(toRequest(value));
    setInvalid(!request);
    if (request) props.onSave(request);
  };
  const state = collectorIntakeState(props.record.instrumentationIntake);
  return (
    <Modal
      open
      destroyOnHidden
      title={t('collectors.intake.title', { name: props.record.name })}
      okText={t('collectors.intake.save')}
      cancelText={t('common.cancel')}
      confirmLoading={props.saving}
      closable={!props.saving}
      keyboard={!props.saving}
      maskClosable={false}
      cancelButtonProps={{ disabled: props.saving }}
      onCancel={props.onCancel}
      onOk={() => form.submit()}
    >
      {invalid && <Alert type="error" showIcon message={t('collectors.intake.invalid')} />}
      {props.failure && <Alert type="error" showIcon message={t(`collectors.failure.${props.failure}`)} />}
      <Alert
        type={state === 'available' ? 'success' : state === 'notAdvertised' ? 'info' : 'warning'}
        showIcon
        message={t(`collectors.intake.state.${state}`)}
      />
      <Alert type="info" showIcon message={t('collectors.intake.endpointGuidance')} />
      <Form
        form={form}
        layout="vertical"
        initialValues={initialFormValue(props.record)}
        onValuesChange={() => setInvalid(false)}
        onFinish={submit}
      >
        <IntakeFields capabilities={capabilities} />
        {props.canDelete && collectorIntakeCanBeCleared(props.record.instrumentationIntake) && (
          <Button danger disabled={props.saving} onClick={props.onRequestClear}>
            {t('collectors.intake.clear')}
          </Button>
        )}
      </Form>
    </Modal>
  );
}

function IntakeFields({ capabilities }: { capabilities: CollectorIntakeCapability[] }) {
  const { t } = useTranslation();
  return (
    <>
      <Form.Item name="gateway" label={t('collectors.intake.gateway')}>
        <Select
          options={[
            { value: 'collector', label: t('collectors.intake.gatewayCollector') },
            { value: 'server', label: t('collectors.intake.gatewayServer') }
          ]}
        />
      </Form.Item>
      <Form.Item name="capabilities" label={t('collectors.intake.capabilities')}>
        <Checkbox.Group>
          <Checkbox value="otlp_http_protobuf">{t('collectors.intake.httpCapability')}</Checkbox>
          <Checkbox value="otlp_grpc">{t('collectors.intake.grpcCapability')}</Checkbox>
        </Checkbox.Group>
      </Form.Item>
      {capabilities.includes('otlp_http_protobuf') && (
        <Form.Item name="otlpHttpEndpoint" label={t('collectors.intake.httpEndpoint')}>
          <Input />
        </Form.Item>
      )}
      {capabilities.includes('otlp_grpc') && (
        <Form.Item name="otlpGrpcEndpoint" label={t('collectors.intake.grpcEndpoint')}>
          <Input />
        </Form.Item>
      )}
    </>
  );
}

function ClearIntakeDialog({
  record,
  open,
  onCancel,
  onConfirm
}: {
  record: CollectorRecord;
  open: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const { t } = useTranslation();
  return (
    <Modal
      open={open}
      title={t('collectors.intake.clearTitle', { name: record.name })}
      okText={t('collectors.intake.clear')}
      cancelText={t('common.cancel')}
      okButtonProps={{ danger: true }}
      maskClosable={false}
      onCancel={onCancel}
      onOk={onConfirm}
    >
      {t('collectors.intake.clearDescription')}
    </Modal>
  );
}

function initialFormValue(record: CollectorRecord): FormValue {
  const intake = record.instrumentationIntake;
  if (intake.status === 'available') {
    return {
      gateway: intake.gateway,
      capabilities: [...intake.capabilities],
      otlpHttpEndpoint: intake.otlpHttpEndpoint ?? '',
      otlpGrpcEndpoint: intake.otlpGrpcEndpoint ?? ''
    };
  }
  return { gateway: 'server', capabilities: ['otlp_http_protobuf'], otlpHttpEndpoint: '', otlpGrpcEndpoint: '' };
}

function toRequest(value: FormValue): unknown {
  return {
    schemaVersion: 1,
    gateway: value.gateway,
    capabilities: value.capabilities,
    otlpHttpEndpoint: value.capabilities.includes('otlp_http_protobuf') ? value.otlpHttpEndpoint : null,
    otlpGrpcEndpoint: value.capabilities.includes('otlp_grpc') ? value.otlpGrpcEndpoint : null
  };
}
