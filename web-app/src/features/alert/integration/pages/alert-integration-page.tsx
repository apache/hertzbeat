/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { Result, Typography } from 'antd';
import { useTranslation } from 'react-i18next';

import { IntegrationGuide } from '../components/integration-guide';
import { IntegrationSourceRail } from '../components/integration-source-rail';
import styles from '../components/integration.module.css';
import { useAlertIntegrationController } from '../controller/use-alert-integration-controller';

export function AlertIntegrationPage() {
  const { t } = useTranslation();
  const controller = useAlertIntegrationController();
  if (!controller.source || !controller.contract) return <IntegrationNotFound />;
  const sourceName = t(controller.source.nameKey);
  return (
    <div>
      <Typography.Title level={2}>{t('alertIntegrations.title', { source: sourceName })}</Typography.Title>
      <Typography.Paragraph type="secondary">{t('alertIntegrations.description')}</Typography.Paragraph>
      <div className={styles.layout}>
        <IntegrationSourceRail
          sources={controller.sources}
          selected={controller.source.id}
          t={t}
          onSelect={source => void controller.actions.selectSource(source)}
        />
        <IntegrationGuide
          source={controller.source}
          endpoint={controller.contract.endpoint}
          authorizationHeader={controller.contract.authorizationHeader}
          copyState={controller.copyState}
          tokenSettingsPath={controller.tokenSettingsPath}
          t={t}
          onCopyEndpoint={() => void controller.actions.copyEndpoint()}
          onCopyAuthorization={() => void controller.actions.copyAuthorizationHeader()}
          onOpenTokenSettings={() => void controller.actions.openTokenSettings()}
        />
      </div>
    </div>
  );
}

function IntegrationNotFound() {
  const { t } = useTranslation();
  return (
    <Result
      status="404"
      title={
        <span role="heading" aria-level={1}>
          {t('common.notFound.title')}
        </span>
      }
      subTitle={t('common.notFound.description')}
    />
  );
}
