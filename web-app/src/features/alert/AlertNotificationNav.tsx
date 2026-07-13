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

import { Segmented } from 'antd';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate } from 'react-router-dom';

const notificationRoutes = [
  { value: '/alerts/notifications/receivers', labelKey: 'alertNavigation.receivers' },
  { value: '/alerts/notifications/templates', labelKey: 'alertNavigation.templates' }
] as const;

function activeNotificationRoute(pathname: string) {
  return notificationRoutes.find(route => pathname.startsWith(route.value))?.value ?? notificationRoutes[0].value;
}

export function AlertNotificationNav() {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  return (
    <Segmented
      value={activeNotificationRoute(location.pathname)}
      options={notificationRoutes.map(route => ({ value: route.value, label: t(route.labelKey) }))}
      onChange={path => void navigate(path)}
    />
  );
}
