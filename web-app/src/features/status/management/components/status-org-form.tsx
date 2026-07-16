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

import { Button, Form, Input, Space } from 'antd';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import type { StatusOrg } from '../api/status-management-api';

const emptyOrg: StatusOrg = { name: '', description: '', home: '', logo: '', feedback: '', color: '#5b6fd8', state: 0 };

export function StatusOrgForm({ org, saving, onSubmit }: {
  org: StatusOrg | undefined;
  saving: boolean;
  onSubmit: (org: StatusOrg) => void;
}) {
  const { t } = useTranslation();
  const [editing, setEditing] = useState(!org);
  const [form] = Form.useForm<StatusOrg>();
  useEffect(() => {
    form.setFieldsValue(org ?? emptyOrg);
  }, [form, org]);

  const submit = (value: StatusOrg) => {
    setEditing(false);
    onSubmit(value);
  };

  return (
    <Form form={form} layout="vertical" onFinish={submit}>
      <div className="status-org-grid">
        <Form.Item name="name" label={t('statusManagement.name')} rules={[{ required: true, whitespace: true }]}><Input disabled={!editing} /></Form.Item>
        <Form.Item name="home" label={t('statusManagement.home')} rules={[{ required: true, whitespace: true }]}><Input disabled={!editing} /></Form.Item>
        <Form.Item name="description" label={t('status.descriptionLabel')} rules={[{ required: true, whitespace: true }]}><Input disabled={!editing} /></Form.Item>
        <Form.Item name="logo" label={t('statusManagement.logo')} rules={[{ required: true, whitespace: true }]}><Input disabled={!editing} /></Form.Item>
        <Form.Item name="feedback" label={t('statusManagement.feedback')}><Input disabled={!editing} /></Form.Item>
        <Form.Item name="color" label={t('statusManagement.color')}><Input disabled={!editing} type="color" /></Form.Item>
      </div>
      <Space>
        {editing ? (
          <>
            <Button type="primary" htmlType="submit" loading={saving}>{t('common.save')}</Button>
            {org && (
              <Button htmlType="button" onClick={() => { form.setFieldsValue(org); setEditing(false); }}>
                {t('common.cancel')}
              </Button>
            )}
          </>
        ) : <Button htmlType="button" onClick={() => setEditing(true)}>{t('common.edit')}</Button>}
      </Space>
    </Form>
  );
}
