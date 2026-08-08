/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { Alert, Button, Form, Input, Typography } from 'antd';
import { useTranslation } from 'react-i18next';

import type { SetupErrorCode } from '../model/setup-contract';
import type { SetupRequestFailure } from '../model/setup-configuration-state';
import { generalSetupErrorKey } from './setup-error-message';

type Props = {
  username: string;
  password: string;
  confirmPassword: string;
  setUsername: (value: string) => void;
  setPassword: (value: string) => void;
  setConfirmPassword: (value: string) => void;
  canSubmit: boolean;
  confirmationMismatch: boolean;
  submitting: boolean;
  failure: SetupRequestFailure | null;
  submit: () => Promise<void>;
};

export function SetupAdministratorForm(props: Props) {
  const { t } = useTranslation();
  return (
    <Form
      layout="vertical"
      requiredMark={false}
      onFinish={() => {
        if (props.canSubmit) void props.submit();
      }}
    >
      <Typography.Title level={2}>{t('setup.administrator.title')}</Typography.Title>
      <Typography.Paragraph type="secondary">{t('setup.administrator.description')}</Typography.Paragraph>
      {props.failure && <Alert type="error" showIcon message={t(administratorFailureKey(props.failure.errorCode))} />}
      <Form.Item label={t('setup.administrator.username')} htmlFor="setup-administrator-username" required>
        <Input
          id="setup-administrator-username"
          required
          autoComplete="username"
          disabled={props.submitting}
          value={props.username}
          onChange={event => props.setUsername(event.target.value)}
        />
      </Form.Item>
      <Form.Item label={t('setup.administrator.password')} htmlFor="setup-administrator-password" required>
        <Input.Password
          id="setup-administrator-password"
          required
          autoComplete="new-password"
          disabled={props.submitting}
          value={props.password}
          onChange={event => props.setPassword(event.target.value)}
        />
      </Form.Item>
      <Form.Item
        label={t('setup.administrator.confirmPassword')}
        htmlFor="setup-administrator-confirm-password"
        required
        {...(props.confirmationMismatch
          ? { validateStatus: 'error' as const, help: t('setup.administrator.passwordMismatch') }
          : {})}
      >
        <Input.Password
          id="setup-administrator-confirm-password"
          required
          autoComplete="new-password"
          disabled={props.submitting}
          value={props.confirmPassword}
          onChange={event => props.setConfirmPassword(event.target.value)}
        />
      </Form.Item>
      <Button type="primary" htmlType="submit" loading={props.submitting} disabled={!props.canSubmit}>
        {t('setup.administrator.create')}
      </Button>
    </Form>
  );
}

function administratorFailureKey(errorCode: SetupErrorCode | null) {
  const generalKey = generalSetupErrorKey(errorCode);
  if (generalKey) return generalKey;
  if (errorCode === 'administrator_already_configured') return 'setup.administrator.alreadyConfigured';
  if (errorCode === 'administrator_username_invalid') return 'setup.administrator.usernameInvalid';
  if (errorCode === 'setup_locked') return 'setup.administrator.setupLocked';
  return 'setup.administrator.createFailed';
}
