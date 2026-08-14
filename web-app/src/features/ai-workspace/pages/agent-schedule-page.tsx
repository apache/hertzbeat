/* Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
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
