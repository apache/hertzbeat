/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { Typography } from 'antd';
import { useTranslation } from 'react-i18next';

import { SetupConfigurationForm } from '../components/setup-configuration-form';
import { useSetupConfigurationController } from '../controller/use-setup-configuration-controller';
import type { SetupStatus } from '../model/setup-contract';
import styles from './setup-page.module.css';

export function SetupPhaseRouter({
  status,
  refetchStatus
}: {
  status: SetupStatus;
  refetchStatus: () => Promise<unknown> | void;
}) {
  if (status.phase === 'administrator_required') return <PendingStep kind="administrator" />;
  if (status.phase === 'optional_configuration') return <PendingStep kind="optional" />;
  if (status.phase === 'complete') return null;
  return <ConfigurationStep status={status} refetchStatus={refetchStatus} />;
}

function ConfigurationStep({
  status,
  refetchStatus
}: {
  status: SetupStatus;
  refetchStatus: () => Promise<unknown> | void;
}) {
  const controller = useSetupConfigurationController(status, refetchStatus);
  return (
    <section className={styles.content}>
      <SetupConfigurationForm {...controller} />
    </section>
  );
}

function PendingStep({ kind }: { kind: 'administrator' | 'optional' }) {
  const { t } = useTranslation();
  return (
    <section className={styles.content} aria-labelledby={`setup-${kind}-title`}>
      <Typography.Title id={`setup-${kind}-title`} level={2}>
        {t(`setup.steps.${kind}.title`)}
      </Typography.Title>
      <Typography.Paragraph>{t(`setup.steps.${kind}.pending`)}</Typography.Paragraph>
    </section>
  );
}
