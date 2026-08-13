/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { Button, Form, Input, Select } from 'antd';
import { useTranslation } from 'react-i18next';

import type {
  AgentProviderConfiguration,
  AgentProviderInput,
  AgentProviderOption
} from '../model/agent-workspace-contract';
import type { AgentProviderViewModel } from '../model/agent-workspace-view-model';
import styles from './agent-provider-dialog.module.css';

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
    >
      <ProviderTypeField form={form} options={controller.options} disabled={Boolean(provider)} />
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
    apiKey: ''
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
        apiKey: ''
      }
    : { selection: '', type: '', code: '', baseUrl: '', model: '', apiKey: '' };
}
