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

import { Button, Space } from 'antd';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import { applicationRoutePaths } from '@/shared/navigation/app-paths';
import { OperationalPage, OperationalPageHeader, OperationalResultRegion } from '@/shared/operational-page';

import { AgentScheduleView } from '../components/agent-schedule-view';
import { useAgentScheduleController } from '../controller/use-agent-schedule-controller';

export function AgentSchedulePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const controller = useAgentScheduleController();
  return (
    <OperationalPage>
      <OperationalPageHeader
        title={t('aiSchedules.title')}
        description={t('aiSchedules.description')}
        actions={
          <Space>
            <Button onClick={() => void navigate(applicationRoutePaths.aiWorkspace)}>{t('common.back')}</Button>
            <Button disabled={controller.busy !== null} onClick={() => void controller.actions.reload()}>
              {t('common.refresh')}
            </Button>
            <Button type="primary" disabled={controller.busy !== null} onClick={controller.actions.openCreate}>
              {t('aiSchedules.create')}
            </Button>
          </Space>
        }
      />
      <OperationalResultRegion>
        <AgentScheduleView controller={controller} />
      </OperationalResultRegion>
    </OperationalPage>
  );
}
