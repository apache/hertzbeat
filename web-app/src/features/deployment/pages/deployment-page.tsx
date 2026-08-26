/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { Button } from 'antd';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import {
  OperationalPage,
  OperationalPageHeader,
  OperationalResultRegion,
  OperationalStatePanel
} from '@/shared/operational-page';
import { settingsPaths } from '@/shared/settings/settings-routes';

import { DeploymentWorkflow } from '../components/deployment-workflow';
import { DeploymentSummary } from '../components/deployment-summary';
import { DeploymentDangerZone } from '../components/factory-reset-section';
import { useDeploymentController } from '../controller/use-deployment-controller';

export function DeploymentPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const controller = useDeploymentController();
  return (
    <OperationalPage mode="form">
      <OperationalPageHeader title={t('deployment.title')} description={t('deployment.description')} />
      <OperationalResultRegion>
        <DeploymentContent controller={controller}>
          {deployment => (
            <>
              <DeploymentSummary deployment={deployment} />
              <DeploymentDangerZone
                onOpenMigration={() => void navigate(settingsPaths.deploymentMigration)}
                onReset={controller.factoryReset}
              />
            </>
          )}
        </DeploymentContent>
      </OperationalResultRegion>
    </OperationalPage>
  );
}

export function DeploymentMigrationPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const controller = useDeploymentController();
  return (
    <OperationalPage mode="form">
      <OperationalPageHeader
        title={t('deployment.migration.title')}
        description={t('deployment.migration.description')}
        actions={
          <Button disabled={controller.busy} onClick={() => void navigate(settingsPaths.deployment)}>
            {t('deployment.migration.close')}
          </Button>
        }
      />
      <OperationalResultRegion>
        <DeploymentContent controller={controller}>
          {deployment => <DeploymentWorkflow {...controller} deployment={deployment} />}
        </DeploymentContent>
      </OperationalResultRegion>
    </OperationalPage>
  );
}

function DeploymentContent({
  controller,
  children
}: {
  controller: ReturnType<typeof useDeploymentController>;
  children: (deployment: NonNullable<ReturnType<typeof useDeploymentController>['deployment']>) => ReactNode;
}) {
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
  return children(controller.deployment);
}
