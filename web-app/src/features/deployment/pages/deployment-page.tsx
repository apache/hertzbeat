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
