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

import { Button, Form, Input, Select } from 'antd';
import { useTranslation } from 'react-i18next';

import type {
  AgentProviderConfiguration,
  AgentProviderInput,
  AgentProviderOption
} from '../model/agent-workspace-contract';
import type { AgentProviderViewModel } from '../model/agent-workspace-view-model';
import styles from './agent-provider-dialog.module.css';
import { AgentProviderTestControls } from './agent-provider-test-controls';

type ProviderForm = AgentProviderInput & { selection: string };

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
  const initial = provider ? formForProvider(provider) : formForOption(controller.options[0]);
  const running = controller.connectionTest?.state.phase === 'running';
  const test = async () => {
    try {
      const value = await form.validateFields();
      await controller.connectionTest?.start(providerInput(value, provider));
    } catch {
      /* Form fields own their validation messages. */
    }
  };
  const dismiss = () => {
    controller.connectionTest?.reset();
    close();
  };
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
      onFinish={value => {
        if (!running) void submit(value);
      }}
      onValuesChange={() => controller.connectionTest?.reset()}
    >
      <ProviderTypeField form={form} options={controller.options} disabled={Boolean(provider)} />
      <ProviderProtocolField />
      <ProviderConnectionFields provider={provider} />
      <AgentProviderTestControls
        test={controller.connectionTest}
        start={() => void test()}
        disabled={controller.phase === 'saving'}
      >
        <Button type="primary" htmlType="submit" disabled={running} loading={controller.phase === 'saving'}>
          {t('aiWorkspace.providers.save')}
        </Button>
        <Button onClick={dismiss}>{t('common.cancel')}</Button>
      </AgentProviderTestControls>
    </Form>
  );
}

function ProviderConnectionFields({ provider }: { provider: AgentProviderConfiguration | null }) {
  const { t } = useTranslation();
  return (
    <>
      <Form.Item name="type" hidden>
        <Input />
      </Form.Item>
      <Form.Item name="code" hidden>
        <Input />
      </Form.Item>
      <Form.Item label={t('aiWorkspace.providers.baseUrl')} name="baseUrl" rules={[{ required: true }]}>
        <Input />
      </Form.Item>
      <Form.Item label={t('aiWorkspace.providers.model')} name="model" rules={[{ required: true }]}>
        <Input />
      </Form.Item>
      <Form.Item
        extra={provider ? t('aiWorkspace.providers.apiKeyHint') : undefined}
        label={t('aiWorkspace.providers.apiKey')}
        name="apiKey"
      >
        <Input.Password autoComplete="new-password" />
      </Form.Item>
    </>
  );
}

function ProviderProtocolField() {
  const { t } = useTranslation();
  return (
    <Form.Item
      name="protocol"
      label={t('aiWorkspace.providers.protocol')}
      extra={t('aiWorkspace.providers.protocolHint')}
    >
      <Select
        options={[
          { value: 'chat-completions', label: t('aiWorkspace.providers.chatCompletions') },
          { value: 'responses', label: t('aiWorkspace.providers.responses') }
        ]}
      />
    </Form.Item>
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
  return (
    <Form.Item label={t('aiWorkspace.providers.type')} name="selection" rules={[{ required: true }]}>
      <Select
        disabled={disabled}
        options={options.map(option => ({ label: option.label, value: providerKey(option) }))}
        onChange={value => {
          const option = options.find(item => providerKey(item) === value);
          if (option) form.setFieldsValue(formForOption(option));
        }}
      />
    </Form.Item>
  );
}

function providerInput(value: ProviderForm, provider: AgentProviderConfiguration | null): AgentProviderInput {
  return {
    ...(provider ? { uid: provider.uid } : {}),
    type: value.type,
    code: value.code,
    baseUrl: value.baseUrl,
    model: value.model,
    protocol: value.protocol ?? 'chat-completions',
    ...(value.apiKey ? { apiKey: value.apiKey } : {})
  };
}

function formForProvider(provider: AgentProviderConfiguration): ProviderForm {
  return {
    selection: providerKey(provider),
    uid: provider.uid,
    type: provider.type,
    code: provider.code,
    baseUrl: provider.baseUrl ?? '',
    model: provider.model ?? '',
    apiKey: '',
    protocol: provider.protocol ?? 'chat-completions'
  };
}

function providerKey(provider: Pick<AgentProviderOption, 'type' | 'code'>) {
  return `${provider.type}:${provider.code}`;
}

function formForOption(option: AgentProviderOption | undefined): ProviderForm {
  return option
    ? {
        selection: providerKey(option),
        type: option.type,
        code: option.code,
        baseUrl: option.defaultBaseUrl ?? '',
        model: option.defaultModel ?? '',
        protocol: 'chat-completions',
        apiKey: ''
      }
    : { protocol: 'chat-completions', selection: '', type: '', code: '', baseUrl: '', model: '', apiKey: '' };
}
