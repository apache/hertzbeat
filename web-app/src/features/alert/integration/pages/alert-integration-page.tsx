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

import { Button, Result, Spin, Typography } from 'antd';
import { useTranslation } from 'react-i18next';

import { IntegrationGuide } from '../components/integration-guide';
import { IntegrationSourceRail } from '../components/integration-source-rail';
import styles from '../components/integration.module.css';
import { useAlertIntegrationController } from '../controller/use-alert-integration-controller';
import type { AlertIntegrationState } from '../model/alert-integration-model';

export function AlertIntegrationPage() {
  const { t } = useTranslation();
  const controller = useAlertIntegrationController();
  if (controller.state.kind !== 'ready') {
    return <IntegrationState state={controller.state} retry={controller.actions.retry} />;
  }
  const guide = controller.state.guide;
  if (!controller.contract) return <IntegrationState state={{ kind: 'contract' }} retry={controller.actions.retry} />;
  return (
    <div>
      <Typography.Title level={2}>{t('alertIntegrations.title', { source: t(guide.displayNameKey) })}</Typography.Title>
      <Typography.Paragraph type="secondary">{t('alertIntegrations.description')}</Typography.Paragraph>
      <div className={styles.layout}>
        <IntegrationSourceRail
          sources={controller.state.catalog}
          selected={guide.source}
          t={t}
          onSelect={controller.actions.selectSource}
        />
        <IntegrationGuide
          guide={guide}
          endpoint={controller.contract.endpoint}
          authorizationHeader={controller.contract.authorizationHeader}
          copyState={controller.copyState}
          tokenSettingsPath={controller.tokenSettingsPath}
          t={t}
          onCopyEndpoint={() => void controller.actions.copyEndpoint()}
          onCopyAuthorization={() => void controller.actions.copyAuthorizationHeader()}
          onOpenTokenSettings={controller.actions.openTokenSettings}
        />
      </div>
    </div>
  );
}

function IntegrationState({
  state,
  retry
}: {
  state: Exclude<AlertIntegrationState, { kind: 'ready' }>;
  retry: () => unknown;
}) {
  const { t } = useTranslation();
  if (state.kind === 'loading') {
    return (
      <Spin>
        <span>{t('alertIntegrations.states.loading')}</span>
      </Spin>
    );
  }
  const retryable = state.kind === 'unavailable' || state.kind === 'error';
  return (
    <Result
      status={state.kind === 'permission' ? '403' : state.kind === 'not-found' ? '404' : 'error'}
      title={t(`alertIntegrations.states.${state.kind}`)}
      extra={retryable ? <Button onClick={() => void retry()}>{t('common.retry')}</Button> : undefined}
    />
  );
}
