/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { SetupAdministratorForm } from '../components/setup-administrator-form';
import { SetupConfigurationForm } from '../components/setup-configuration-form';
import { SetupOptionalForm } from '../components/setup-optional-form';
import { useSetupAdministratorController } from '../controller/use-setup-administrator-controller';
import { useSetupConfigurationController } from '../controller/use-setup-configuration-controller';
import { useSetupOptionalController } from '../controller/use-setup-optional-controller';
import type { SetupCompleteResponse } from '../model/setup-optional';
import type { SetupStatus } from '../model/setup-contract';
import type { SetupStatusRefresh } from '../controller/setup-status-refresh';
import styles from './setup-page.module.css';

export function SetupPhaseRouter({
  status,
  refetchStatus,
  onCompleted
}: {
  status: SetupStatus;
  refetchStatus: SetupStatusRefresh;
  onCompleted: (response: SetupCompleteResponse) => void;
}) {
  if (status.phase === 'administrator_required') {
    return <AdministratorStep status={status} refetchStatus={refetchStatus} />;
  }
  if (status.phase === 'optional_configuration') {
    return <OptionalStep status={status} refetchStatus={refetchStatus} onCompleted={onCompleted} />;
  }
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

function OptionalStep({
  status,
  refetchStatus,
  onCompleted
}: {
  status: SetupStatus;
  refetchStatus: SetupStatusRefresh;
  onCompleted: (response: SetupCompleteResponse) => void;
}) {
  const controller = useSetupOptionalController(status, refetchStatus, onCompleted);
  return (
    <section className={styles.content}>
      <SetupOptionalForm {...controller} />
    </section>
  );
}
