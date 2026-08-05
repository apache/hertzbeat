/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { Button, Space } from 'antd';
import type { TFunction } from 'i18next';
import { useTranslation } from 'react-i18next';

import {
  OperationalPage,
  OperationalPageHeader,
  OperationalResultRegion,
  OperationalStatePanel
} from '@/shared/operational-page';

import { SystemConfigEditor } from '../components/system-config-editor';
import { RetryButton, SystemConfigReadFailure } from '../components/system-config-state';
import { useSystemConfigResourceController } from '../controller/system-config-resource-controller';

export function SystemConfigPage() {
  const { t } = useTranslation();
  const controller = useSystemConfigResourceController();

  return (
    <OperationalPage mode="form">
      <OperationalPageHeader title={t('systemConfig.title')} description={t('systemConfig.description')} />
      <OperationalResultRegion>
        <SystemConfigContent controller={controller} />
      </OperationalResultRegion>
    </OperationalPage>
  );
}

type SystemConfigController = ReturnType<typeof useSystemConfigResourceController>;

function SystemConfigContent({ controller }: { controller: SystemConfigController }) {
  const { t } = useTranslation();
  if (controller.state.kind === 'loading') {
    return <OperationalStatePanel kind="loading" title={t('systemConfig.loading')} />;
  }
  if (controller.state.kind === 'ready') return <SystemConfigReadyContent controller={controller} />;
  const failure = systemConfigReadFailure(controller.state.kind, t);
  return <SystemConfigReadFailure {...failure} onRetry={controller.retryRead} />;
}

function SystemConfigReadyContent({ controller }: { controller: SystemConfigController }) {
  const { t } = useTranslation();
  const { state } = controller;
  if (state.kind !== 'ready') return null;
  return (
    <>
      {!state.canConfigure && <OperationalStatePanel kind="permission" title={t('systemConfig.readOnly')} />}
      {state.canConfigure && state.recovery && (
        <OperationalStatePanel
          kind="unavailable"
          title={t('systemConfig.recovery')}
          action={
            <ProofRecoveryActions
              accepting={state.accepting}
              canUseCurrentServerSettings={state.canUseCurrentServerSettings}
              proving={state.proving}
              onRetry={controller.retrySave}
              onUseCurrent={controller.useCurrentServerSettings}
            />
          }
        />
      )}
      <SystemConfigEditor
        current={state.current}
        canConfigure={state.canConfigure}
        timezoneOptions={state.timezoneOptions}
        timezonesPending={state.timezonesPending}
        timezonesFailed={state.timezonesFailed}
        dirty={state.dirty}
        locked={state.locked}
        valid={state.valid}
        saving={state.saving}
        onTimezoneRetry={controller.retryTimezones}
        onUpdate={controller.update}
        onSave={controller.save}
        onDiscard={controller.discard}
      />
    </>
  );
}

function systemConfigReadFailure(
  kind: Exclude<SystemConfigController['state']['kind'], 'loading' | 'ready'>,
  t: TFunction
) {
  if (kind === 'missing') return { kind: 'empty' as const, message: t('systemConfig.missing') };
  if (kind === 'permission') return { kind: 'permission' as const, message: t('systemConfig.permission') };
  if (kind === 'unavailable') return { kind: 'unavailable' as const, message: t('systemConfig.unavailable') };
  if (kind === 'invalid') return { kind: 'error' as const, message: t('systemConfig.invalid') };
  return { kind: 'error' as const, message: t('common.routeError.description') };
}

function ProofRecoveryActions({
  accepting,
  canUseCurrentServerSettings,
  proving,
  onRetry,
  onUseCurrent
}: {
  accepting: boolean;
  canUseCurrentServerSettings: boolean;
  proving: boolean;
  onRetry: () => unknown;
  onUseCurrent: () => unknown;
}) {
  const { t } = useTranslation();
  return (
    <Space>
      <RetryButton loading={proving} onRetry={onRetry} />
      {canUseCurrentServerSettings && (
        <Button size="small" loading={accepting} onClick={onUseCurrent}>
          {t('systemConfig.useCurrentServerSettings')}
        </Button>
      )}
    </Space>
  );
}
