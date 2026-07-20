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

import { Form, Input, Select } from 'antd';
import { useTranslation } from 'react-i18next';

import type { StatusComponent } from '../model/status-management-contract';
import { incidentStateKey, statusIncidentState } from '../model/status-management-model';

interface StatusIncidentFieldsProps {
  components: StatusComponent[];
}

export type StatusIncidentFormValue = {
  name: string;
  state: number;
  componentIds: number[];
  message: string;
};

export function StatusIncidentFields({ components }: StatusIncidentFieldsProps) {
  const { t } = useTranslation();

  return (
    <>
      <Form.Item name="name" label={t('statusManagement.incidentName')} rules={[{ required: true, whitespace: true }]}>
        <Input />
      </Form.Item>
      <Form.Item name="componentIds" label={t('status.components')} rules={[{ required: true }]}>
        <Select
          mode="multiple"
          options={components.flatMap(item => (item.id == null ? [] : [{ value: item.id, label: item.name }]))}
        />
      </Form.Item>
      <Form.Item name="state" label={t('status.state')}>
        <Select
          options={Object.values(statusIncidentState).map(value => ({ value, label: t(incidentStateKey(value)) }))}
        />
      </Form.Item>
      <Form.Item
        name="message"
        label={t('statusManagement.updateMessage')}
        rules={[{ required: true, whitespace: true }]}
      >
        <Input.TextArea rows={3} />
      </Form.Item>
    </>
  );
}
