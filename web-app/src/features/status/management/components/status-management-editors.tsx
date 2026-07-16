/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { Form, Input, List, Modal, Radio, Select, Typography } from 'antd';
import { useTranslation } from 'react-i18next';

import type { StatusComponent, StatusIncident } from '../api/status-management-api';
import {
  buildIncidentPayload,
  formatLabels,
  incidentStateKey,
  parseLabels
} from '../model/status-management-model';

type ComponentFormValue = StatusComponent & { labelText?: string };

export function StatusManagementEditors({ component, incident, orgId, components, componentSaving,
  incidentSaving, onCloseComponent, onCloseIncident, onSaveComponent, onSaveIncident }: {
  component: Partial<StatusComponent> | undefined;
  incident: StatusIncident | undefined;
  orgId: number | undefined;
  components: StatusComponent[];
  componentSaving: boolean;
  incidentSaving: boolean;
  onCloseComponent: () => void;
  onCloseIncident: () => void;
  onSaveComponent: (value: StatusComponent) => void;
  onSaveIncident: (value: StatusIncident) => void;
}) {
  return (
    <>
      {component && orgId && (
        <StatusComponentEditor
          component={{ ...component, orgId }}
          components={components}
          saving={componentSaving}
          onCancel={onCloseComponent}
          onSubmit={onSaveComponent}
        />
      )}
      {incident && (
        <StatusIncidentEditor
          incident={incident}
          components={components}
          saving={incidentSaving}
          onCancel={onCloseIncident}
          onSubmit={onSaveIncident}
        />
      )}
    </>
  );
}

function StatusComponentEditor({ component, components, saving, onCancel, onSubmit }: {
  component: Partial<StatusComponent>;
  components: StatusComponent[];
  saving: boolean;
  onCancel: () => void;
  onSubmit: (component: StatusComponent) => void;
}) {
  const { t } = useTranslation();
  const [form] = Form.useForm<ComponentFormValue>();
  const method = Form.useWatch('method', form) ?? component.method ?? 0;
  const isNew = component.id == null;
  const initialValues = componentFormValue(component);
  const submit = (values: ComponentFormValue) => onSubmit(componentPayload(component, values, method));

  return (
    <Modal
      open
      destroyOnHidden
      title={t(isNew ? 'statusManagement.newComponent' : 'statusManagement.editComponent')}
      confirmLoading={saving}
      onCancel={onCancel}
      onOk={() => form.submit()}
    >
      <Form form={form} layout="vertical" initialValues={initialValues} onFinish={submit}>
        <Form.Item name="name" label={t('statusManagement.name')} rules={[{ required: true, whitespace: true }]}>
          <Input />
        </Form.Item>
        <Form.Item name="description" label={t('status.descriptionLabel')}>
          <Input />
        </Form.Item>
        <Form.Item name="method" label={t('statusManagement.method')}>
          <Radio.Group optionType="button" options={[
            { value: 0, label: t('statusManagement.automatic') },
            { value: 1, label: t('statusManagement.manual') }
          ]} />
        </Form.Item>
        {method === 0 ? (
          <Form.Item name="labelText" label={t('statusManagement.labels')} extra={t('statusManagement.labelsHint')}>
            <Input placeholder="service=api, environment=production" />
          </Form.Item>
        ) : (
          <Form.Item name="configState" label={t('status.state')}>
            <Select options={componentStateOptions(t)} />
          </Form.Item>
        )}
        {!isNew && components.some(item => item.id === component.id) && (
          <Typography.Text type="secondary">{t('statusManagement.componentUpdateHint')}</Typography.Text>
        )}
      </Form>
    </Modal>
  );
}

function StatusIncidentEditor({ incident, components, saving, onCancel, onSubmit }: {
  incident: StatusIncident;
  components: StatusComponent[];
  saving: boolean;
  onCancel: () => void;
  onSubmit: (incident: StatusIncident) => void;
}) {
  const { t } = useTranslation();
  const [form] = Form.useForm<{ name: string; state: number; componentIds: number[]; message: string }>();
  const isNew = incident.id == null;
  const submit = (values: { name: string; state: number; componentIds: number[]; message: string }) => {
    onSubmit(buildIncidentPayload({
      incident: { ...incident, name: values.name, state: values.state },
      components,
      componentIds: values.componentIds,
      message: values.message,
      timestamp: Date.now()
    }));
  };

  return (
    <Modal
      open
      width={680}
      destroyOnHidden
      title={t(isNew ? 'statusManagement.newIncident' : 'statusManagement.updateIncident')}
      confirmLoading={saving}
      onCancel={onCancel}
      onOk={() => form.submit()}
    >
      <Form
        form={form}
        layout="vertical"
        initialValues={{
          name: incident.name,
          state: incident.state,
          componentIds: incident.components?.flatMap(item => item.id == null ? [] : [item.id]) ?? [],
          message: ''
        }}
        onFinish={submit}
      >
        <Form.Item name="name" label={t('statusManagement.incidentName')} rules={[{ required: true, whitespace: true }]}>
          <Input />
        </Form.Item>
        <Form.Item name="componentIds" label={t('status.components')} rules={[{ required: true }]}>
          <Select mode="multiple" options={components.flatMap(item => item.id == null ? [] : [{ value: item.id, label: item.name }])} />
        </Form.Item>
        <Form.Item name="state" label={t('status.state')}>
          <Select options={[0, 1, 2, 3].map(value => ({ value, label: t(incidentStateKey(value)) }))} />
        </Form.Item>
        <Form.Item name="message" label={t('statusManagement.updateMessage')} rules={[{ required: true, whitespace: true }]}>
          <Input.TextArea rows={3} />
        </Form.Item>
      </Form>
      {!isNew && incident.contents?.length ? (
        <List
          size="small"
          header={t('statusManagement.updateHistory')}
          dataSource={[...incident.contents].sort((left, right) => right.timestamp - left.timestamp)}
          renderItem={item => (
            <List.Item extra={new Date(item.timestamp).toLocaleString()}>
              <List.Item.Meta title={t(incidentStateKey(item.state))} description={item.message} />
            </List.Item>
          )}
        />
      ) : null}
    </Modal>
  );
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
