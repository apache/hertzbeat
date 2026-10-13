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
