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

import { Form, Input, Select } from 'antd';
import { useTranslation } from 'react-i18next';
import { parseHeaders } from '../model/agent-provider-form';

export function AgentProviderAuthenticationFields({ editing, auth }: { editing: boolean; auth: string | undefined }) {
  const { t } = useTranslation();
  return (
    <>
      <Form.Item label={t('aiWorkspace.providers.authMode')} name="authMode">
        <Select
          options={['default', 'custom-header', 'none'].map(value => ({
            value,
            label: t(`aiWorkspace.providers.authentication.${value}`)
          }))}
        />
      </Form.Item>
      {auth === 'default' ? (
        <Form.Item
          extra={editing ? t('aiWorkspace.providers.apiKeyHint') : undefined}
          label={t('aiWorkspace.providers.apiKey')}
          name="apiKey"
          rules={[{ required: !editing }]}
        >
          <Input.Password autoComplete="new-password" />
        </Form.Item>
      ) : null}
      {auth === 'custom-header' ? <AgentProviderHeadersField /> : null}
    </>
  );
}

export function AgentProviderHeadersField() {
  const { t } = useTranslation();
  return (
    <Form.Item
      extra={t('aiWorkspace.providers.headersHint')}
      label={t('aiWorkspace.providers.headers')}
      name="headersJson"
      rules={[
        {
          validator: (_, value: string | undefined) => {
            try {
              parseHeaders(value);
              return Promise.resolve();
            } catch {
              return Promise.reject(new Error(t('aiWorkspace.providers.headersInvalid')));
            }
          }
        }
      ]}
    >
      <Input.TextArea rows={3} autoComplete="off" />
    </Form.Item>
  );
}
