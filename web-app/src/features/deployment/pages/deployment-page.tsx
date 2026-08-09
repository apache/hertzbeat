/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { Button } from 'antd';
import { useTranslation } from 'react-i18next';

import {
  OperationalPage,
  OperationalPageHeader,
  OperationalResultRegion,
  OperationalStatePanel
} from '@/shared/operational-page';

import { DeploymentWorkflow } from '../components/deployment-workflow';
import { useDeploymentController } from '../controller/use-deployment-controller';

export function DeploymentPage() {
  const { t } = useTranslation();
  const controller = useDeploymentController();
  return (
    <OperationalPage mode="form">
      <OperationalPageHeader title={t('deployment.title')} description={t('deployment.description')} />
      <OperationalResultRegion>
        <DeploymentContent controller={controller} />
      </OperationalResultRegion>
    </OperationalPage>
  );
}

function DeploymentContent({ controller }: { controller: ReturnType<typeof useDeploymentController> }) {
  const { t } = useTranslation();
  if (controller.state === 'loading') return <OperationalStatePanel kind="loading" title={t('deployment.loading')} />;
  if (controller.state === 'error' || !controller.deployment) {
    return (
      <OperationalStatePanel
        kind="unavailable"
        title={t('deployment.unavailable')}
        action={
          <Button size="small" onClick={() => void controller.retry()}>
            {t('common.retry')}
          </Button>
        }
      />
    );
  }
  return <DeploymentWorkflow {...controller} deployment={controller.deployment} />;
}
