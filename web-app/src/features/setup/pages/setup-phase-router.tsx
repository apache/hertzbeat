/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { Typography } from 'antd';
import { useTranslation } from 'react-i18next';

import { SetupAdministratorForm } from '../components/setup-administrator-form';
import { SetupConfigurationForm } from '../components/setup-configuration-form';
import { useSetupAdministratorController } from '../controller/use-setup-administrator-controller';
import { useSetupConfigurationController } from '../controller/use-setup-configuration-controller';
import type { SetupStatus } from '../model/setup-contract';
import type { SetupStatusRefresh } from '../controller/setup-status-refresh';
import styles from './setup-page.module.css';

export function SetupPhaseRouter({
  status,
  refetchStatus
}: {
  status: SetupStatus;
  refetchStatus: SetupStatusRefresh;
}) {
  if (status.phase === 'administrator_required') {
    return <AdministratorStep status={status} refetchStatus={refetchStatus} />;
  }
  if (status.phase === 'optional_configuration') return <PendingStep kind="optional" />;
  if (status.phase === 'complete') return null;
  return <ConfigurationStep key={configurationFlowKey(status.phase)} status={status} refetchStatus={refetchStatus} />;
}

function configurationFlowKey(phase: SetupStatus['phase']) {
  if (phase === 'configuration_required' || phase === 'external_apply_required') return 'configuration';
  return phase;
}

function AdministratorStep({ status, refetchStatus }: { status: SetupStatus; refetchStatus: SetupStatusRefresh }) {
  const controller = useSetupAdministratorController(status, refetchStatus);
  return (
    <section className={styles.content}>
      <SetupAdministratorForm {...controller} />
    </section>
  );
}

function ConfigurationStep({ status, refetchStatus }: { status: SetupStatus; refetchStatus: SetupStatusRefresh }) {
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
