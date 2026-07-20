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

import { Alert, Button, Skeleton, Typography } from 'antd';
import { useTranslation } from 'react-i18next';

import { SystemConfigEditor } from '../components/system-config-editor';
import { useSystemConfigResourceController } from '../controller/system-config-resource-controller';
import styles from './system-config-page.module.css';

export function SystemConfigPage() {
  const { t } = useTranslation();
  const controller = useSystemConfigResourceController();
  const { state } = controller;

  return (
    <div className={styles.page}>
      <header className={styles.heading}>
        <Typography.Title level={2}>{t('systemConfig.title')}</Typography.Title>
        <Typography.Text type="secondary">{t('systemConfig.description')}</Typography.Text>
      </header>
      {state.kind === 'unavailable' && (
        <Alert
          type="error"
          showIcon
          message={t('systemConfig.unavailable')}
          action={<RetryButton onRetry={controller.retry} />}
        />
      )}
      {state.kind === 'error' && (
        <Alert
          type="error"
          showIcon
          message={t('common.routeError.description')}
          action={<RetryButton onRetry={controller.retry} />}
        />
      )}
      {state.kind === 'loading' && <Skeleton active paragraph={{ rows: 4 }} />}
      {state.kind === 'ready' && (
        <>
          {state.recovery && (
            <Alert
              type="warning"
              showIcon
              message={t('systemConfig.unavailable')}
              action={<RetryButton loading={state.proving} onRetry={controller.retry} />}
            />
          )}
          <SystemConfigEditor
            current={state.current}
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
    </div>
  );
}

function RetryButton({ loading = false, onRetry }: { loading?: boolean; onRetry: () => Promise<void> }) {
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
