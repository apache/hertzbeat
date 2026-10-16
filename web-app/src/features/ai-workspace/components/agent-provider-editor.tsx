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

import { Button, Collapse, Form, Input, Select } from 'antd';
import { AgentProviderConnectionFields } from './agent-provider-connection-fields';
import { AgentProviderHeadersField } from './agent-provider-authentication-fields';
import {
  formForOption,
  applyProviderOption,
  selectableProviderOptions,
  formForProvider,
  providerInput,
  providerKey,
  type ProviderForm
} from '../model/agent-provider-form';
import { useTranslation } from 'react-i18next';

import type { AgentProviderConfiguration, AgentProviderOption } from '../model/agent-workspace-contract';
import type { AgentProviderViewModel } from '../model/agent-workspace-view-model';
import styles from './agent-provider-dialog.module.css';

export function AgentProviderEditor({
  controller,
  provider,
  close
}: {
  controller: AgentProviderViewModel;
  provider: AgentProviderConfiguration | null;
  close: () => void;
}) {
  const { t } = useTranslation();
  const [form] = Form.useForm<ProviderForm>();
  const initial = provider
    ? formForProvider(provider)
    : formForOption(controller.options.find(option => option.type === 'protocol') ?? controller.options[0]);
  const submit = async (value: ProviderForm) => {
    const input = providerInput(value, provider);
    const saved = provider
      ? await controller.actions.update(provider.uid, input)
      : await controller.actions.create(input);
    if (saved) close();
  };
  return (
    <Form
      className={styles.form}
      form={form}
      initialValues={initial}
      layout="vertical"
      onFinish={value => void submit(value)}
      onValuesChange={(changed: Partial<ProviderForm>) => {
        if ('protocol' in changed) form.setFieldValue('selection', `protocol:${changed.protocol}`);
        if (['selection', 'protocol', 'baseUrl', 'authMode', 'apiKey', 'headersJson'].some(key => key in changed))
          controller.actions.clearModels?.();
      }}
    >
      <ProviderTypeField form={form} options={controller.options} disabled={Boolean(provider)} />
      <Form.Item name="type" hidden>
        <Input />
      </Form.Item>
      <Form.Item name="code" hidden>
        <Input />
      </Form.Item>
      <AgentProviderConnectionFields form={form} provider={provider} controller={controller} />
      <AgentProviderAdvancedFields form={form} />
      <div className={styles.formActions}>
        <Button type="primary" htmlType="submit" loading={controller.phase === 'saving'}>
          {t('aiWorkspace.providers.save')}
        </Button>
        <Button onClick={close}>{t('common.cancel')}</Button>
      </div>
    </Form>
  );
}

function ProviderTypeField({
  form,
  options,
  disabled
}: {
  form: ReturnType<typeof Form.useForm<ProviderForm>>[0];
  options: AgentProviderOption[];
  disabled: boolean;
}) {
  const { t } = useTranslation();
  const visible = selectableProviderOptions(options);
  return (
    <Form.Item label={t('aiWorkspace.providers.type')} name="selection">
      <Select
        disabled={disabled}
        options={['protocol', 'presets'].map(group => ({
          label: t(`aiWorkspace.providers.${group === 'protocol' ? 'genericProtocols' : 'vendorPresets'}`),
          options: visible
            .filter(option => (option.type === 'protocol') === (group === 'protocol'))
            .map(option => ({ label: option.label, value: providerKey(option) }))
        }))}
        onChange={value => {
          const option = options.find(item => providerKey(item) === value);
          if (option) form.setFieldsValue(applyProviderOption(option, form.getFieldsValue()));
        }}
      />
    </Form.Item>
  );
}

function AgentProviderAdvancedFields({ form }: { form: ReturnType<typeof Form.useForm<ProviderForm>>[0] }) {
  const { t } = useTranslation();
  const auth: string | undefined = Form.useWatch('authMode', form);
  return (
    <Collapse
      ghost
      items={[
        {
          key: 'advanced',
          forceRender: true,
          label: t('aiWorkspace.providers.advanced'),
          children: (
            <>
              <Form.Item label={t('aiWorkspace.providers.protocol')} name="protocol" rules={[{ required: true }]}>
                <Select
                  options={['openai-chat', 'openai-responses', 'anthropic-messages'].map(value => ({
                    value,
                    label: t(`aiWorkspace.providers.protocols.${value}`)
                  }))}
                />
              </Form.Item>
              {auth !== 'custom-header' ? <AgentProviderHeadersField /> : null}
            </>
          )
        }
      ]}
    />
  );
}
