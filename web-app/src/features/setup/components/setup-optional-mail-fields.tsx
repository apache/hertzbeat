/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { Form, Input, InputNumber, Select } from 'antd';
import { useTranslation } from 'react-i18next';

import { MAIL_SECURITY_MODES, type SetupOptionalDraft } from '../model/setup-optional';

export function SetupOptionalMailFields({ mail, disabled, update }: Props) {
  const { t } = useTranslation();
  return (
    <>
      <MailTextField
        id="setup-mail-host"
        label={t('setup.optional.mail.host')}
        value={mail.host}
        disabled={disabled}
        update={host => update({ host })}
      />
      <Form.Item label={t('setup.optional.mail.port')} htmlFor="setup-mail-port">
        <InputNumber
          id="setup-mail-port"
          min={1}
          max={65535}
          precision={0}
          disabled={disabled}
          value={mail.port}
          onChange={port => update({ port })}
        />
      </Form.Item>
      <Form.Item label={t('setup.optional.mail.security')} htmlFor="setup-mail-security">
        <Select
          id="setup-mail-security"
          disabled={disabled}
          value={mail.security}
          onChange={security => update({ security })}
          options={MAIL_SECURITY_MODES.map(value => ({ value, label: t(`setup.optional.mail.securityMode.${value}`) }))}
        />
      </Form.Item>
      <MailTextField
        id="setup-mail-username"
        label={t('setup.optional.mail.username')}
        value={mail.username}
        disabled={disabled}
        update={username => update({ username })}
      />
      <Form.Item label={t('setup.optional.mail.password')} htmlFor="setup-mail-password">
        <Input.Password
          id="setup-mail-password"
          autoComplete="new-password"
          disabled={disabled}
          value={mail.password}
          onChange={event => update({ password: event.target.value })}
        />
      </Form.Item>
      <MailTextField
        id="setup-mail-from"
        label={t('setup.optional.mail.fromAddress')}
        value={mail.fromAddress}
        disabled={disabled}
        update={fromAddress => update({ fromAddress })}
      />
    </>
  );
}

type Props = {
  mail: SetupOptionalDraft['mail'];
  disabled: boolean;
  update: (patch: Partial<SetupOptionalDraft['mail']>) => void;
};

function MailTextField(props: {
  id: string;
  label: string;
  value: string;
  disabled: boolean;
  update: (value: string) => void;
}) {
  return (
    <Form.Item label={props.label} htmlFor={props.id}>
      <Input
        id={props.id}
        disabled={props.disabled}
        value={props.value}
        onChange={event => props.update(event.target.value)}
      />
    </Form.Item>
  );
}
