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
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import type { StatusOrg } from '../api/status-management-api';

const emptyOrg: StatusOrg = { name: '', description: '', home: '', logo: '', feedback: '', color: '#5b6fd8', state: 0 };

export function StatusOrgForm({ org, saving, onSubmit }: {
  org: StatusOrg | undefined;
  saving: boolean;
  onSubmit: (org: StatusOrg) => Promise<void>;
}) {
  const { t } = useTranslation();
  const [editing, setEditing] = useState(!org);
  const [form] = Form.useForm<StatusOrg>();
  const submitting = useRef(false);
  const initialized = useRef(false);
  const previousOrg = useRef(org);
  useEffect(() => {
    const orgChanged = previousOrg.current !== org;
    previousOrg.current = org;
    if (!initialized.current || (!editing && orgChanged)) {
      form.setFieldsValue(org ?? emptyOrg);
      initialized.current = true;
    }
  }, [editing, form, org]);

  const save = async (value: StatusOrg) => {
    if (saving || submitting.current) return;
    submitting.current = true;
    try {
      await onSubmit(value);
      setEditing(false);
    } catch {
      // The mutation reports the failure; retaining this state keeps the draft retryable.
    } finally {
      submitting.current = false;
    }
  };

  const submit = (value: StatusOrg) => {
    void save(value);
  };

  const cancel = () => {
    if (saving || submitting.current || !org) return;
    form.setFieldsValue(org);
    previousOrg.current = org;
    setEditing(false);
  };

  const edit = () => {
    form.setFieldsValue(org ?? emptyOrg);
    previousOrg.current = org;
    setEditing(true);
  };

  return (
    <Form form={form} layout="vertical" onFinish={submit}>
      <div className="status-org-grid">
        <Form.Item name="name" label={t('statusManagement.name')} rules={[{ required: true, whitespace: true }]}><Input disabled={!editing || saving} /></Form.Item>
        <Form.Item name="home" label={t('statusManagement.home')} rules={[{ required: true, whitespace: true }]}><Input disabled={!editing || saving} /></Form.Item>
        <Form.Item name="description" label={t('status.descriptionLabel')} rules={[{ required: true, whitespace: true }]}><Input disabled={!editing || saving} /></Form.Item>
        <Form.Item name="logo" label={t('statusManagement.logo')} rules={[{ required: true, whitespace: true }]}><Input disabled={!editing || saving} /></Form.Item>
        <Form.Item name="feedback" label={t('statusManagement.feedback')}><Input disabled={!editing || saving} /></Form.Item>
        <Form.Item name="color" label={t('statusManagement.color')}><Input disabled={!editing || saving} type="color" /></Form.Item>
      </div>
      <Space>
        {editing ? (
          <>
            <Button type="primary" htmlType="submit" loading={saving} disabled={saving}>{t('common.save')}</Button>
            {org && (
              <Button htmlType="button" disabled={saving} onClick={cancel}>
                {t('common.cancel')}
              </Button>
            )}
          </>
        ) : <Button htmlType="button" onClick={edit}>{t('common.edit')}</Button>}
      </Space>
    </Form>
  );
}
