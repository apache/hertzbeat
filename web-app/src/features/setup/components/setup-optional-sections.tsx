/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { Button, Form, Input, InputNumber, Typography } from 'antd';
import { useTranslation } from 'react-i18next';

import {
  optionalMailValidationReady,
  type SetupOptionalDraft,
  type SetupOptionalValidationEvidence
} from '../model/setup-optional';
import { SetupOptionalValidation } from './setup-optional-validation';
import { SetupOptionalMailFields } from './setup-optional-mail-fields';
import styles from './setup-configuration-form.module.css';

type Props = {
  draft: SetupOptionalDraft;
  disabled: boolean;
  updateDraft: (patch: Partial<SetupOptionalDraft>) => void;
  validation: { publicAccess: SetupOptionalValidationEvidence; mail: SetupOptionalValidationEvidence };
  validatePublicAccess: () => void;
  validateMail: () => void;
};

export function PublicAccessSection(props: Props) {
  const { t } = useTranslation();
  const validating = props.validation.publicAccess?.state === 'checking';
  const update = (patch: Partial<Pick<SetupOptionalDraft, PublicField>>) => props.updateDraft(patch);
  return (
    <section className={styles.section} aria-labelledby="setup-public-access-title">
      <SectionHeading
        id="setup-public-access-title"
        title={t('setup.optional.publicAccess.title')}
        description={t('setup.optional.publicAccess.description')}
      />
      <TextField
        id="setup-public-base-url"
        label={t('setup.optional.publicAccess.publicBaseUrl')}
        value={props.draft.publicBaseUrl}
        disabled={props.disabled}
        update={value => update({ publicBaseUrl: value })}
      />
      <TextField
        id="setup-otlp-http-endpoint"
        label={t('setup.optional.publicAccess.otlpHttp')}
        value={props.draft.serverOtlpHttpEndpoint}
        disabled={props.disabled}
        update={value => update({ serverOtlpHttpEndpoint: value })}
      />
      <TextField
        id="setup-otlp-grpc-endpoint"
        label={t('setup.optional.publicAccess.otlpGrpc')}
        value={props.draft.serverOtlpGrpcEndpoint}
        disabled={props.disabled}
        update={value => update({ serverOtlpGrpcEndpoint: value })}
      />
      <SetupOptionalValidation evidence={props.validation.publicAccess} />
      <Button disabled={props.disabled || validating} loading={validating} onClick={props.validatePublicAccess}>
        {t('setup.optional.validatePublicAccess')}
      </Button>
    </section>
  );
}

export function RetentionSection(props: Props) {
  const { t } = useTranslation();
  return (
    <section className={styles.section} aria-labelledby="setup-retention-title">
      <SectionHeading
        id="setup-retention-title"
        title={t('setup.optional.retention.title')}
        description={t('setup.optional.retention.description')}
      />
      <Form.Item label={t('setup.optional.retention.days')} htmlFor="setup-retention-days">
        <InputNumber
          id="setup-retention-days"
          min={1}
          precision={0}
          disabled={props.disabled}
          value={props.draft.retentionDays}
          onChange={value => props.updateDraft({ retentionDays: value })}
        />
      </Form.Item>
    </section>
  );
}

export function MailSection(props: Props) {
  const { t } = useTranslation();
  const mail = props.draft.mail;
  const validating = props.validation.mail?.state === 'checking';
  const update = (patch: Partial<SetupOptionalDraft['mail']>) => props.updateDraft({ mail: { ...mail, ...patch } });
  return (
    <section className={styles.section} aria-labelledby="setup-mail-title">
      <SectionHeading
        id="setup-mail-title"
        title={t('setup.optional.mail.title')}
        description={t('setup.optional.mail.description')}
      />
      <SetupOptionalMailFields mail={mail} disabled={props.disabled} update={update} />
      <SetupOptionalValidation evidence={props.validation.mail} />
      <Button
        disabled={props.disabled || validating || !optionalMailValidationReady(mail)}
        loading={validating}
        onClick={props.validateMail}
      >
        {t('setup.optional.validateMail')}
      </Button>
    </section>
  );
}

type PublicField = 'publicBaseUrl' | 'serverOtlpHttpEndpoint' | 'serverOtlpGrpcEndpoint';

function TextField({
  id,
  label,
  value,
  disabled,
  update
}: {
  id: string;
  label: string;
  value: string;
  disabled: boolean;
  update: (value: string) => void;
}) {
  return (
    <Form.Item label={label} htmlFor={id}>
      <Input id={id} disabled={disabled} value={value} onChange={event => update(event.target.value)} />
    </Form.Item>
  );
}

function SectionHeading({ id, title, description }: { id: string; title: string; description: string }) {
  return (
    <header className={styles.heading}>
      <Typography.Title id={id} level={3}>
        {title}
      </Typography.Title>
      <Typography.Paragraph type="secondary">{description}</Typography.Paragraph>
    </header>
  );
}
