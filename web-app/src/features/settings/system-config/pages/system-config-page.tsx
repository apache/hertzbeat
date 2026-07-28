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

import { Alert, Button, Skeleton, Space } from 'antd';
import { useTranslation } from 'react-i18next';

import { OperationalPage, OperationalPageHeader } from '@/shared/operational-page';

import { SystemConfigEditor } from '../components/system-config-editor';
import { useSystemConfigResourceController } from '../controller/system-config-resource-controller';

export function SystemConfigPage() {
  const { t } = useTranslation();
  const controller = useSystemConfigResourceController();
  const { state } = controller;

  return (
    <OperationalPage>
      <OperationalPageHeader title={t('systemConfig.title')} description={t('systemConfig.description')} />
      {state.kind === 'missing' && <ReadFailure message={t('systemConfig.missing')} onRetry={controller.retryRead} />}
      {state.kind === 'permission' && (
        <ReadFailure message={t('systemConfig.permission')} onRetry={controller.retryRead} />
      )}
      {state.kind === 'unavailable' && (
        <ReadFailure message={t('systemConfig.unavailable')} onRetry={controller.retryRead} />
      )}
      {state.kind === 'invalid' && <ReadFailure message={t('systemConfig.invalid')} onRetry={controller.retryRead} />}
      {state.kind === 'error' && (
        <ReadFailure message={t('common.routeError.description')} onRetry={controller.retryRead} />
      )}
      {state.kind === 'loading' && <Skeleton active paragraph={{ rows: 4 }} />}
      {state.kind === 'ready' && (
        <>
          {state.canConfigure && state.recovery && (
            <Alert
              type="warning"
              showIcon
              message={t('systemConfig.unavailable')}
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

function ReadFailure({ message, onRetry }: { message: string; onRetry: () => unknown }) {
  return <Alert type="error" showIcon message={message} action={<RetryButton onRetry={onRetry} />} />;
}

function RetryButton({ loading = false, onRetry }: { loading?: boolean; onRetry: () => unknown }) {
  const { t } = useTranslation();
  return (
    <Button
      size="small"
      loading={loading}
      onClick={() => {
        void onRetry();
      }}
    >
      {t('common.retry')}
    </Button>
  );
}
