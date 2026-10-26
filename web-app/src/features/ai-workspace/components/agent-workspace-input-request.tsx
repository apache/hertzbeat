/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License.  You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { Button, Input, Typography } from 'antd';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { AgentInputRequest } from '../model/agent-workspace-reducer';
import type { AgentWorkspaceViewModel } from '../model/agent-workspace-view-model';
import styles from './agent-workspace-context-pane.module.css';

export function InputRequest({
  request,
  submit
}: {
  request: AgentInputRequest;
  submit: AgentWorkspaceViewModel['actions']['submitInteraction'];
}) {
  const { t } = useTranslation();
  const [values, setValues] = useState<Record<string, string>>({});
  return (
    <div className={styles.inputRequest}>
      <Typography.Text strong>{request.title}</Typography.Text>
      {request.description ? <Typography.Text type="secondary">{request.description}</Typography.Text> : null}
      {request.fields.map(field => (
        <InputField field={field} key={String(field.field)} values={values} setValues={setValues} />
      ))}
      <Button size="small" type="primary" onClick={() => void submit(request.interactionId, values)}>
        {t('aiWorkspace.actions.submit')}
      </Button>
    </div>
  );
}

function InputField({
  field,
  values,
  setValues
}: {
  field: Record<string, unknown>;
  values: Record<string, string>;
  setValues: React.Dispatch<React.SetStateAction<Record<string, string>>>;
}) {
  const name = typeof field.field === 'string' ? field.field : '';
  if (!name) return null;
  return (
    <label className={styles.inputField}>
      <span>{typeof field.label === 'string' ? field.label : name}</span>
      <Input
        type={field.type === 'password' ? 'password' : 'text'}
        value={values[name] ?? ''}
        placeholder={typeof field.placeholder === 'string' ? field.placeholder : undefined}
        onChange={event => setValues(current => ({ ...current, [name]: event.target.value }))}
      />
    </label>
  );
}
