/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { Alert, Button, Checkbox, Form, Typography } from 'antd';
import { useTranslation } from 'react-i18next';

import type { SetupWarningCode } from '../model/setup-contract';
import {
  optionalDraftValid,
  type SetupOptionalDraft,
  type SetupOptionalValidationEvidence
} from '../model/setup-optional';
import styles from './setup-configuration-form.module.css';
import { MailSection, PublicAccessSection, RetentionSection } from './setup-optional-sections';
import { optionalWarningKey } from './setup-optional-warning';

export type SetupOptionalFormProps = {
  draft: SetupOptionalDraft;
  updateDraft: (patch: Partial<SetupOptionalDraft>) => void;
  save: () => void;
  savePending: boolean;
  saveFailureKey: string | null;
  validatePublicAccess: () => void;
  validateMail: () => void;
  validation: { publicAccess: SetupOptionalValidationEvidence; mail: SetupOptionalValidationEvidence };
  pendingWarnings: readonly SetupWarningCode[];
  acknowledgedWarnings: readonly SetupWarningCode[];
  setWarningAcknowledged: (warning: SetupWarningCode, acknowledged: boolean) => void;
  complete: () => void;
  completePending: boolean;
  completeFailureKey: string | null;
};

export function SetupOptionalForm(props: SetupOptionalFormProps) {
  const { t } = useTranslation();
  const busy = props.savePending || props.completePending;
  const warningsAcknowledged = props.pendingWarnings.every(warning => props.acknowledgedWarnings.includes(warning));
  const sections = { ...props, disabled: busy };
  return (
    <Form layout="vertical" requiredMark={false}>
      <header className={styles.heading}>
        <Typography.Title level={2}>{t('setup.steps.optional.title')}</Typography.Title>
        <Typography.Paragraph>{t('setup.optional.description')}</Typography.Paragraph>
      </header>
      <PublicAccessSection {...sections} />
      <RetentionSection {...sections} />
      <MailSection {...sections} />
      {props.saveFailureKey && <Alert type="error" showIcon message={t(props.saveFailureKey)} />}
      <Button disabled={busy || !optionalDraftValid(props.draft)} loading={props.savePending} onClick={props.save}>
        {t('setup.optional.save')}
      </Button>
      <section className={styles.section} aria-labelledby="setup-complete-title">
        <Typography.Title id="setup-complete-title" level={3}>
          {t('setup.optional.complete.title')}
        </Typography.Title>
        <Typography.Paragraph type="secondary">{t('setup.optional.complete.description')}</Typography.Paragraph>
        {props.pendingWarnings.map(warning => (
          <Checkbox
            key={warning}
            checked={props.acknowledgedWarnings.includes(warning)}
            onChange={event => props.setWarningAcknowledged(warning, event.target.checked)}
          >
            {t(optionalWarningKey(warning))}
          </Checkbox>
        ))}
        {props.completeFailureKey && <Alert type="error" showIcon message={t(props.completeFailureKey)} />}
        <Button
          type="primary"
          disabled={busy || !warningsAcknowledged}
          loading={props.completePending}
          onClick={props.complete}
        >
          {t('setup.optional.complete.action')}
        </Button>
      </section>
    </Form>
  );
}
