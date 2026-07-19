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

import { Form } from 'antd';
import { useEffect, useRef, useState } from 'react';

import type { StatusOrg, StatusOrgRecord } from '../model/status-management-contract';
import { StatusOrgActions, StatusOrgFields } from './status-org-presentation';

const emptyOrg: StatusOrg = { name: '', description: '', home: '', logo: '', feedback: '', color: '#5b6fd8', state: 0 };

interface StatusOrgFormProps {
  org: StatusOrg | undefined;
  saving: boolean;
  onSubmit: (org: StatusOrg) => Promise<StatusOrgRecord>;
}

export function StatusOrgForm({ org, saving, onSubmit }: StatusOrgFormProps) {
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
      <StatusOrgFields disabled={!editing || saving} />
      <StatusOrgActions editing={editing} saving={saving} canCancel={Boolean(org)} onCancel={cancel} onEdit={edit} />
    </Form>
  );
}
