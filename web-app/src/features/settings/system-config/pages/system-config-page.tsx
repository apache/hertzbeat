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
  const { state } = controller;

  return (
    <OperationalPage>
      <OperationalPageHeader title={t('systemConfig.title')} description={t('systemConfig.description')} />
      <OperationalResultRegion>
        {state.kind === 'missing' && (
          <SystemConfigReadFailure kind="empty" message={t('systemConfig.missing')} onRetry={controller.retryRead} />
        )}
        {state.kind === 'permission' && (
          <SystemConfigReadFailure
            kind="permission"
            message={t('systemConfig.permission')}
            onRetry={controller.retryRead}
          />
        )}
        {state.kind === 'unavailable' && (
          <SystemConfigReadFailure
            kind="unavailable"
            message={t('systemConfig.unavailable')}
            onRetry={controller.retryRead}
          />
        )}
        {state.kind === 'invalid' && (
          <SystemConfigReadFailure kind="error" message={t('systemConfig.invalid')} onRetry={controller.retryRead} />
        )}
        {state.kind === 'error' && (
          <SystemConfigReadFailure
            kind="error"
            message={t('common.routeError.description')}
            onRetry={controller.retryRead}
          />
        )}
        {state.kind === 'loading' && <OperationalStatePanel kind="loading" title={t('systemConfig.loading')} />}
        {state.kind === 'ready' && (
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
        )}
      </OperationalResultRegion>
    </OperationalPage>
  );
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
