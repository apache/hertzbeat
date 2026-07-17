/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import {
  AlertOutlined, ApiOutlined, AppstoreOutlined, BellOutlined, DashboardOutlined,
  DatabaseOutlined, FundProjectionScreenOutlined, MonitorOutlined, ReadOutlined,
  SettingOutlined, TagsOutlined, TeamOutlined, ToolOutlined
} from '@ant-design/icons';
import type { AccessControlProvider, ResourceProps } from '@refinedev/core';
import type { ReactNode } from 'react';

import { settingsPaths } from '@/shared/settings/settings-routes';

import type {
  ShellCapability, ShellResourceMeta, ShellTimePolicy
} from '@/layout/shell/shell-navigation-model';

type NavigationResource = {
  name: string;
  list?: string;
  labelKey: string;
  icon: ReactNode;
  parent?: string;
  order: number;
  capability?: ShellCapability;
  dataProviderName?: string;
  timePolicy?: ShellTimePolicy;
};

const groupResources = [
  navigationResource({ name: 'shell-workspace', labelKey: 'shell.navigation.workspace', icon: <AppstoreOutlined />, order: 10 }),
  navigationResource({ name: 'shell-operations', labelKey: 'shell.navigation.operations', icon: <ToolOutlined />, order: 20 }),
  navigationResource({ name: 'shell-administration', labelKey: 'shell.navigation.administration', icon: <SettingOutlined />, order: 30 })
];

export const refineResources: ResourceProps[] = [
  ...groupResources,
  navigationResource({ name: 'dashboard', list: '/dashboard', parent: 'shell-workspace', labelKey: 'menu.dashboard', icon: <DashboardOutlined />, order: 10, timePolicy: 'global' }),
  navigationResource({ name: 'monitors', list: '/monitors', parent: 'shell-workspace', labelKey: 'menu.monitors', icon: <MonitorOutlined />, order: 20, timePolicy: 'global' }),
  navigationResource({ name: 'explore', list: '/explore', parent: 'shell-workspace', labelKey: 'menu.explore', icon: <FundProjectionScreenOutlined />, order: 30, timePolicy: 'route_owned' }),
  navigationResource({
    name: 'instrumentation', list: '/observability/integration', parent: 'shell-workspace',
    labelKey: 'instrumentation.menu', icon: <ApiOutlined />, order: 40, timePolicy: 'route_owned'
  }),
  navigationResource({ name: 'alerts', list: '/alerts', parent: 'shell-operations', labelKey: 'menu.alerts', icon: <AlertOutlined />, order: 10, timePolicy: 'global' }),
  navigationResource({ name: 'alert-rules', list: '/alerts/rules', parent: 'alerts', labelKey: 'alertRules.title', icon: <ToolOutlined />, order: 10, timePolicy: 'none' }),
  navigationResource({ name: 'alert-groups', list: '/alerts/groups', parent: 'alerts', labelKey: 'alertGroups.title', icon: <TeamOutlined />, order: 20, timePolicy: 'none' }),
  navigationResource({ name: 'alert-inhibits', list: '/alerts/inhibits', parent: 'alerts', labelKey: 'alertInhibits.title', icon: <ToolOutlined />, order: 30, timePolicy: 'none' }),
  navigationResource({
    name: 'alert-silences', list: '/alerts/silences', parent: 'alerts', labelKey: 'alertSilences.title',
    icon: <ToolOutlined />, order: 40, dataProviderName: 'alert-silences', timePolicy: 'none'
  }),
  navigationResource({ name: 'bulletin', list: '/bulletin', parent: 'shell-operations', labelKey: 'menu.bulletin', icon: <ReadOutlined />, order: 20, timePolicy: 'global' }),
  navigationResource({ name: 'settings', list: settingsPaths.root, parent: 'shell-administration', labelKey: 'menu.settings', icon: <SettingOutlined />, order: 10, timePolicy: 'none' }),
  navigationResource({
    name: 'notice-receivers', list: settingsPaths.receivers, parent: 'settings',
    labelKey: 'settingsNavigation.receivers', icon: <BellOutlined />, order: 10,
    dataProviderName: 'notice-receivers'
  }),
  navigationResource({
    name: 'notice-rules', list: settingsPaths.rules, parent: 'settings',
    labelKey: 'settingsNavigation.rules', icon: <ToolOutlined />, order: 20,
    dataProviderName: 'notice-rules'
  }),
  navigationResource({
    name: 'notice-templates', list: settingsPaths.templates, parent: 'settings',
    labelKey: 'settingsNavigation.templates', icon: <ReadOutlined />, order: 30,
    dataProviderName: 'notice-templates'
  }),
  navigationResource({ name: 'message-server', list: settingsPaths.channels, parent: 'settings', labelKey: 'settingsNavigation.channels', icon: <ApiOutlined />, order: 40 }),
  navigationResource({ name: 'tokens', list: settingsPaths.tokens, parent: 'settings', labelKey: 'settingsNavigation.tokens', icon: <ApiOutlined />, order: 50, dataProviderName: 'tokens' }),
  navigationResource({
    name: 'system-config', list: settingsPaths.system, parent: 'settings',
    labelKey: 'settingsNavigation.system', icon: <SettingOutlined />, order: 60,
    dataProviderName: 'system-config'
  }),
  navigationResource({ name: 'labels', list: settingsPaths.labels, parent: 'settings', labelKey: 'settingsNavigation.labels', icon: <TagsOutlined />, order: 70, dataProviderName: 'labels' }),
  navigationResource({
    name: 'object-store', list: settingsPaths.objectStore, parent: 'settings',
    labelKey: 'settingsNavigation.objectStore', icon: <DatabaseOutlined />, order: 80,
    dataProviderName: 'object-store'
  }),
  navigationResource({ name: 'status-management', list: settingsPaths.statusPage, parent: 'settings', labelKey: 'settingsNavigation.statusPage', icon: <FundProjectionScreenOutlined />, order: 90 })
];

export const shellAccessControlProvider: AccessControlProvider = {
  can: ({ params }) => Promise.resolve(resolveShellAccess(params))
};

function navigationResource(resource: NavigationResource): ResourceProps {
  const shell: ShellResourceMeta = {
    capability: resource.capability ?? 'supported',
    labelKey: resource.labelKey,
    navigation: true,
    order: resource.order,
    timePolicy: resource.timePolicy
      ?? (resource.parent === 'settings' || !resource.list ? 'none' : 'unknown')
  };
  const meta = {
    icon: resource.icon,
    shell,
    ...(resource.dataProviderName ? { dataProviderName: resource.dataProviderName } : {}),
    ...(resource.parent ? { parent: resource.parent } : {})
  };
  return {
    name: resource.name,
    meta,
    ...(resource.list ? { list: resource.list } : {})
  };
}

function resolveShellAccess(params: Parameters<AccessControlProvider['can']>[0]['params']) {
  const shell = params?.resource?.meta?.shell as ShellResourceMeta | undefined;
  if (!shell || shell.capability !== 'supported') return capabilityDenied(shell);
  const permitted = hasRequiredRole(shell.requiredRoles ?? [], stringRoles(params?.roles));
  return permitted ? { can: true } : { can: false, reason: 'ROLE_REQUIRED' };
}

function capabilityDenied(shell?: ShellResourceMeta) {
  const capability = shell ? shell.capability.toUpperCase() : 'UNKNOWN';
  return { can: false, reason: `CAPABILITY_${capability}` };
}

function stringRoles(value: unknown) {
  return Array.isArray(value) ? value.filter(role => typeof role === 'string') : [];
}

function hasRequiredRole(requiredRoles: string[], roles: string[]) {
  return requiredRoles.length === 0 || requiredRoles.some(role => roles.includes(role));
}
