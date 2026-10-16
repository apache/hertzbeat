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

import { AutoComplete, Button, Form, Input, Typography } from 'antd';
import { useTranslation } from 'react-i18next';
import { providerEndpoint, providerInput, type ProviderForm } from '../model/agent-provider-form';
import type { AgentProviderConfiguration } from '../model/agent-provider-contract';
import type { AgentProviderViewModel } from '../model/agent-workspace-view-model';
import { AgentProviderAuthenticationFields } from './agent-provider-authentication-fields';
import styles from './agent-provider-dialog.module.css';

export function AgentProviderConnectionFields({
  form,
  provider,
  controller
}: {
  form: ReturnType<typeof Form.useForm<ProviderForm>>[0];
  provider: AgentProviderConfiguration | null;
  controller: AgentProviderViewModel;
}) {
  const { t } = useTranslation();
  const protocol: string | undefined = Form.useWatch('protocol', form);
  const baseUrl: string | undefined = Form.useWatch('baseUrl', form);
  const auth: string | undefined = Form.useWatch('authMode', form);
  return (
    <>
      <Form.Item label={t('aiWorkspace.providers.name')} name="name" rules={[{ required: true }]}>
        <Input />
      </Form.Item>
      <Form.Item
        label={t('aiWorkspace.providers.baseUrl')}
        name="baseUrl"
        extra={t('aiWorkspace.providers.baseUrlHint')}
        rules={[{ required: true }]}
      >
        <Input />
      </Form.Item>
      <Typography.Paragraph type="secondary">
        {t('aiWorkspace.providers.endpoint')}: {providerEndpoint(baseUrl, protocol)}
      </Typography.Paragraph>
      <AgentProviderAuthenticationFields editing={Boolean(provider)} auth={auth} />
      <AgentProviderModelField form={form} provider={provider} controller={controller} />
    </>
  );
}

function AgentProviderModelField({
  form,
  provider,
  controller
}: {
  form: ReturnType<typeof Form.useForm<ProviderForm>>[0];
  provider: AgentProviderConfiguration | null;
  controller: AgentProviderViewModel;
}) {
  const { t } = useTranslation();
  const baseUrl: string | undefined = Form.useWatch('baseUrl', form);
  const fetchModels = async () => {
    try {
      await form.validateFields(['baseUrl', 'apiKey', 'headersJson']);
      await controller.actions.discoverModels?.(providerInput(form.getFieldsValue(), provider));
    } catch {
      /* Field validation remains visible in the form. */
    }
  };
  return (
    <>
      <Form.Item label={t('aiWorkspace.providers.model')} htmlFor="model" required>
        <div className={styles.modelPicker}>
          <Form.Item name="model" noStyle rules={[{ required: true, message: t('aiWorkspace.providers.modelHint') }]}>
            <AutoComplete
              id="model"
              aria-label={t('aiWorkspace.providers.model')}
              className={styles.modelInput ?? ''}
              placeholder={t('aiWorkspace.providers.modelHint')}
              options={(controller.modelCatalog?.models ?? []).map(model => ({
                value: model.id,
                label: model.name === model.id ? model.id : `${model.name} (${model.id})`
              }))}
              filterOption={(input, option) =>
                String(option?.label ?? '')
                  .toLowerCase()
                  .includes(input.toLowerCase())
              }
            />
          </Form.Item>
          <Button
            loading={Boolean(controller.modelsLoading)}
            disabled={!baseUrl?.trim() || !controller.actions.discoverModels}
            onClick={() => void fetchModels()}
          >
            {t('aiWorkspace.providers.fetchModels')}
          </Button>
        </div>
      </Form.Item>
      {controller.modelCatalog ? (
        <Typography.Paragraph role="status" type={controller.modelCatalog.status === 'ready' ? 'secondary' : 'warning'}>
          {t(
            `aiWorkspace.providers.modelDiscovery.${controller.modelCatalog.status === 'ready' && controller.modelCatalog.models.length === 0 ? 'empty' : controller.modelCatalog.status}`,
            { count: controller.modelCatalog.models.length }
          )}
          {controller.modelCatalog.truncated ? ` ${t('aiWorkspace.providers.modelDiscovery.truncated')}` : ''}
        </Typography.Paragraph>
      ) : null}
    </>
  );
}
