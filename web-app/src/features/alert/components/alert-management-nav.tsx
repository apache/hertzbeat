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

import { Tabs } from 'antd';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate } from 'react-router-dom';

import { alertRoutePaths } from '@/shared/navigation/app-paths';

const alertManagementRoutes = [
  { key: alertRoutePaths.center, labelKey: 'alertNavigation.events' },
  { key: alertRoutePaths.rules, labelKey: 'alertNavigation.rules' },
  { key: alertRoutePaths.groups, labelKey: 'alertNavigation.noiseControl' }
] as const;

function activeAlertRoute(pathname: string) {
  if (pathname.startsWith(alertRoutePaths.rules)) return alertRoutePaths.rules;
  if (
    pathname.startsWith(alertRoutePaths.groups) ||
    pathname.startsWith(alertRoutePaths.inhibits) ||
    pathname.startsWith(alertRoutePaths.silences)
  ) {
    return alertRoutePaths.groups;
  }
  return alertRoutePaths.center;
}

export function AlertManagementNav() {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  return (
    <Tabs
      activeKey={activeAlertRoute(location.pathname)}
      items={alertManagementRoutes.map(item => ({ key: item.key, label: t(item.labelKey) }))}
      onChange={path => void navigate(path)}
    />
  );
}
