/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { Button, Form, Input, InputNumber, Space } from 'antd';
import { useTranslation } from 'react-i18next';

import { managedRuntimeSafeNamePattern } from '../model/collector-runtime-config-model';
import { managedPrometheusLimits, type ManagedPrometheusTargetDraft } from '../model/collector-prometheus-source-model';

type Props = {
  target: ManagedPrometheusTargetDraft | null;
  disabled: boolean;
  onApply: (target: ManagedPrometheusTargetDraft) => void;
  onCancel: () => void;
};

export function CollectorPrometheusTargetForm(props: Props) {
  const { t } = useTranslation();
  const [form] = Form.useForm<ManagedPrometheusTargetDraft>();
  return (
    <Form<ManagedPrometheusTargetDraft>
      form={form}
      layout="vertical"
      disabled={props.disabled}
      initialValues={props.target ?? emptyTarget()}
      onFinish={props.onApply}
    >
      <Form.Item
        name="name"
        label={t('collectors.runtime.prometheus.name')}
        rules={[{ required: true }, { pattern: managedRuntimeSafeNamePattern }]}
      >
        <Input />
      </Form.Item>
      <Form.Item name="endpoint" label={t('collectors.runtime.prometheus.endpoint')} rules={[{ required: true }]}>
        <Input type="url" />
      </Form.Item>
      <SchedulingFields />
      <Form.Item name="tlsCaProfile" label={t('collectors.runtime.prometheus.tlsCaProfile')}>
        <Input />
      </Form.Item>
      <HeaderReferenceFields />
      <Space>
        <Button type="primary" htmlType="submit">
          {t('collectors.runtime.prometheus.apply')}
        </Button>
        <Button onClick={props.onCancel}>{t('collectors.runtime.prometheus.backToList')}</Button>
      </Space>
    </Form>
  );
}

function SchedulingFields() {
  const { t } = useTranslation();
  return (
    <Space align="start" wrap>
      <Form.Item
        name="intervalSeconds"
        label={t('collectors.runtime.prometheus.interval')}
        rules={[{ required: true }]}
      >
        <InputNumber
          min={managedPrometheusLimits.intervalSeconds.minimum}
          max={managedPrometheusLimits.intervalSeconds.maximum}
          precision={0}
        />
      </Form.Item>
      <Form.Item
        name="timeoutSeconds"
        label={t('collectors.runtime.prometheus.timeout')}
        dependencies={['intervalSeconds']}
        rules={[
          { required: true },
          ({ getFieldValue }) => ({
            validator: (_rule, value) =>
              value <= getFieldValue('intervalSeconds')
                ? Promise.resolve()
                : Promise.reject(new Error(t('collectors.runtime.prometheus.timeoutInvalid')))
          })
        ]}
      >
        <InputNumber
          min={managedPrometheusLimits.timeoutSeconds.minimum}
          max={managedPrometheusLimits.timeoutSeconds.maximum}
          precision={0}
        />
      </Form.Item>
    </Space>
  );
}

function HeaderReferenceFields() {
  const { t } = useTranslation();
  return (
    <Form.List name="headerSecretRefs">
      {(fields, { add, remove }) => (
        <Space direction="vertical" size="small">
          {fields.map((field, index) => (
            <Space key={field.key} align="start" wrap>
              <Form.Item
                name={[field.name, 'headerName']}
                label={t('collectors.runtime.prometheus.headerName')}
                rules={[{ required: true }]}
              >
                <Input />
              </Form.Item>
              <Form.Item
                name={[field.name, 'secretReferenceName']}
                label={t('collectors.runtime.prometheus.secretReferenceName')}
                rules={[{ required: true }]}
              >
                <Input />
              </Form.Item>
              <Button
                danger
                aria-label={t('collectors.runtime.prometheus.removeHeader', { index: index + 1 })}
                onClick={() => remove(field.name)}
              >
                {t('collectors.runtime.prometheus.remove')}
              </Button>
            </Space>
          ))}
          <Button
            disabled={fields.length >= managedPrometheusLimits.headerReferences}
            onClick={() => add({ headerName: '', secretReferenceName: '' })}
          >
            {t('collectors.runtime.prometheus.addHeader')}
          </Button>
          <span>{t('collectors.runtime.prometheus.secretReferenceNotice')}</span>
        </Space>
      )}
    </Form.List>
  );
}

function emptyTarget(): ManagedPrometheusTargetDraft {
  return {
    name: '',
    endpoint: '',
    intervalSeconds: managedPrometheusLimits.intervalSeconds.defaultValue,
    timeoutSeconds: managedPrometheusLimits.timeoutSeconds.defaultValue,
    headerSecretRefs: [],
    tlsCaProfile: ''
  };
}
