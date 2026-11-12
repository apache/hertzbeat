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
import { PlusOutlined, LinkOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';

type Props = { canCreateMonitor: boolean; createMonitorTarget: string; telemetryTarget: string };
export function DashboardSetupActions({ canCreateMonitor, createMonitorTarget, telemetryTarget }: Props) {
  const { t } = useTranslation();
  return (
    <>
      {canCreateMonitor && (
        <Button icon={<PlusOutlined aria-hidden="true" />} href={createMonitorTarget}>
          {t('dashboard.start.active.action')}
        </Button>
      )}
      <Button icon={<LinkOutlined aria-hidden="true" />} href={telemetryTarget}>
        {t('dashboard.start.telemetry.action')}
      </Button>
    </>
  );
}
