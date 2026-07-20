/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { Form, Input, Modal, Radio, Select, Typography } from 'antd';
import type { FormInstance } from 'antd';
import { useTranslation } from 'react-i18next';

import type { StatusComponent } from '../model/status-management-contract';
import { formatLabels, parseLabels } from '../model/status-management-model';
import { StatusWriteRecoveryAlert } from './status-write-recovery-alert';

type ComponentFormValue = StatusComponent & { labelText?: string };
type StatusComponentEditorProps = {
  component: Partial<StatusComponent>;
  components: StatusComponent[];
  commandLocked: boolean;
  writeRecovery: 'proof' | 'commit-uncertain' | undefined;
  saving: boolean;
  onCancel: () => void;
  onRetry: () => void;
  onSubmit: (component: StatusComponent) => void;
};

export function StatusComponentEditor(props: StatusComponentEditorProps) {
  const { t } = useTranslation();
  const [form] = Form.useForm<ComponentFormValue>();
  const method = Form.useWatch('method', form) ?? props.component.method ?? 0;
  const isNew = props.component.id == null;
  const submit = (values: ComponentFormValue) => {
    if (!props.commandLocked) {
      props.onSubmit(componentPayload(props.component, values, method));
    }
  };
  return (
    <Modal
      open
      closable={!props.commandLocked}
      keyboard={!props.commandLocked}
      maskClosable={!props.commandLocked}
      destroyOnHidden
      title={t(isNew ? 'statusManagement.newComponent' : 'statusManagement.editComponent')}
      okText={t(props.writeRecovery === 'proof' ? 'common.retry' : 'common.save')}
      confirmLoading={props.saving}
      okButtonProps={{
        disabled: props.writeRecovery === 'commit-uncertain' || (props.commandLocked && !props.writeRecovery)
      }}
      cancelButtonProps={{ disabled: props.commandLocked }}
      onCancel={() => {
        if (!props.commandLocked) props.onCancel();
      }}
      onOk={() => {
        if (props.writeRecovery === 'proof') props.onRetry();
        else if (!props.commandLocked) form.submit();
      }}
    >
      {props.writeRecovery && <StatusWriteRecoveryAlert />}
      <ComponentForm
        form={form}
        component={props.component}
        components={props.components}
        disabled={props.commandLocked || Boolean(props.writeRecovery)}
        method={method}
        onFinish={submit}
      />
    </Modal>
  );
}

function ComponentForm(props: {
  form: FormInstance<ComponentFormValue>;
  component: Partial<StatusComponent>;
  components: StatusComponent[];
  disabled: boolean;
  method: number;
  onFinish: (values: ComponentFormValue) => void;
}) {
  const { t } = useTranslation();
  const isNew = props.component.id == null;
  return (
    <Form
      disabled={props.disabled}
      form={props.form}
      layout="vertical"
      initialValues={componentFormValue(props.component)}
      onFinish={props.onFinish}
    >
      <Form.Item name="name" label={t('statusManagement.name')} rules={[{ required: true, whitespace: true }]}>
        <Input />
      </Form.Item>
      <Form.Item name="description" label={t('status.descriptionLabel')}>
        <Input />
      </Form.Item>
      <Form.Item name="method" label={t('statusManagement.method')}>
        <Radio.Group optionType="button" options={componentMethodOptions(t)} />
      </Form.Item>
      {props.method === 0 ? (
        <Form.Item name="labelText" label={t('statusManagement.labels')} extra={t('statusManagement.labelsHint')}>
          <Input placeholder={t('statusManagement.labelsHint')} />
        </Form.Item>
      ) : (
        <Form.Item name="configState" label={t('status.state')}>
          <Select options={componentStateOptions(t)} />
        </Form.Item>
      )}
      {!isNew && props.components.some(item => item.id === props.component.id) && (
        <Typography.Text type="secondary">{t('statusManagement.componentUpdateHint')}</Typography.Text>
      )}
    </Form>
  );
}

function componentMethodOptions(t: (key: string) => string) {
  return [
    { value: 0, label: t('statusManagement.automatic') },
    { value: 1, label: t('statusManagement.manual') }
  ];
}

function componentStateOptions(t: (key: string) => string) {
  return [
    { value: 0, label: t('status.normal') },
    { value: 1, label: t('status.abnormal') },
    { value: 2, label: t('statusManagement.unknown') }
  ];
}

function componentFormValue(component: Partial<StatusComponent>): ComponentFormValue {
  return {
    orgId: component.orgId ?? 0,
    name: component.name ?? '',
    description: component.description ?? '',
    method: component.method ?? 0,
    configState: component.configState ?? 0,
    state: component.state ?? 0,
    labelText: formatLabels(component.labels),
    ...(component.id == null ? {} : { id: component.id })
  };
}

function componentPayload(
  component: Partial<StatusComponent>,
  values: ComponentFormValue,
  method: number
): StatusComponent {
  const { labelText, ...record } = values;
  return {
    ...record,
    ...(component.id == null ? {} : { id: component.id }),
    name: values.name.trim(),
    ...(values.description == null ? {} : { description: values.description.trim() }),
    labels: method === 0 ? parseLabels(labelText ?? '') : {}
  };
}
