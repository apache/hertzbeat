/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */
import { Segmented } from 'antd';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate } from 'react-router-dom';

import { settingsPaths } from './settings-routes';

const settingsRoutes = [
  { value: settingsPaths.receivers, labelKey: 'settingsNavigation.receivers' },
  { value: settingsPaths.rules, labelKey: 'settingsNavigation.rules' },
  { value: settingsPaths.templates, labelKey: 'settingsNavigation.templates' },
  { value: settingsPaths.channels, labelKey: 'settingsNavigation.channels' },
  { value: settingsPaths.tokens, labelKey: 'settingsNavigation.tokens' },
] as const;

function activeSettingsRoute(pathname: string) {
  return settingsRoutes.find(route => pathname.startsWith(route.value))?.value
    ?? settingsRoutes[0].value;
}

export function SettingsNav() {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  return (
    <Segmented
      value={activeSettingsRoute(location.pathname)}
      options={settingsRoutes.map(route => ({ value: route.value, label: t(route.labelKey) }))}
      onChange={path => void navigate(path)}
    />
  );
}
