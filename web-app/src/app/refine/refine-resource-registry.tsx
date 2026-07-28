/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import {
  AlertOutlined,
  ApiOutlined,
  AppstoreOutlined,
  ApartmentOutlined,
  BellOutlined,
  DashboardOutlined,
  DatabaseOutlined,
  DeploymentUnitOutlined,
  FundProjectionScreenOutlined,
  MonitorOutlined,
  ReadOutlined,
  SettingOutlined,
  TagsOutlined,
  TeamOutlined,
  ToolOutlined
} from '@ant-design/icons';
import type { AccessControlProvider, ResourceProps } from '@refinedev/core';
import type { ReactNode } from 'react';

import { getAppRoute, type AppResourceRouteId } from '@/app/route-registry';
import { monitorNavigationApps, type MonitorApp } from '@/features/monitor/navigation';
import { noticeReceiverResourceName } from '@/features/alert/notice-receiver/refine';
import { noticeRuleResourceName } from '@/features/alert/notice-rule/refine';
import { noticeTemplateResourceName } from '@/features/alert/notice-template';
import { labelResourceName } from '@/features/settings/label/refine';
import { systemConfigResourceName } from '@/features/settings/system-config/refine';
import {
  hasShellRoleAccess,
  readShellResourceMeta,
  type ShellCapability,
  type ShellResourceMeta,
  type ShellTimePolicy
} from '@/layout/shell/shell-navigation-model';
import { buildMonitorListPath } from '@/shared/navigation/app-paths';

import { alertSilenceResourceName } from './resources/alert-silence-data-provider';

type NavigationResource = {
  name: string;
  list?: string;
  create?: string;
  edit?: string;
  show?: string;
  labelKey: string;
  label?: string;
  icon: ReactNode;
  parent?: string;
  order: number;
  capability?: ShellCapability;
  dataProviderName?: string;
  timePolicy?: ShellTimePolicy;
  actionTimePolicies?: ShellResourceMeta['actionTimePolicies'];
  requiredRoles?: string[];
};

type RoutedNavigationResource = Omit<NavigationResource, 'name' | 'list' | 'labelKey'> & {
  name?: string;
};

const groupResources = [
  navigationResource({
    name: 'shell-workspace',
    labelKey: 'shell.navigation.workspace',
    icon: <AppstoreOutlined />,
    order: 10
  }),
  navigationResource({
    name: 'shell-operations',
    labelKey: 'shell.navigation.operations',
    icon: <ToolOutlined />,
    order: 20
  }),
  navigationResource({
    name: 'shell-administration',
    labelKey: 'shell.navigation.administration',
    icon: <SettingOutlined />,
    order: 30
  })
];

const translatedMonitorCategories = new Set([
  'bigdata',
  'cache',
  'cn',
  'custom',
  'db',
  'llm',
  'mid',
  'network',
  'os',
  'program',
  'server',
  'service',
  'webserver'
]);
const monitorCategoryOrderStart = 100;
const monitorApplicationOrderStart = 1_000;

const staticRefineResources: ResourceProps[] = [
  ...groupResources,
  routedNavigationResource('dashboard', {
    parent: 'shell-workspace',
    icon: <DashboardOutlined />,
    order: 10,
    timePolicy: 'none'
  }),
  routedNavigationResource('monitors', {
    parent: 'shell-workspace',
    icon: <MonitorOutlined />,
    order: 20,
    create: getAppRoute('monitor-new').path,
    edit: getAppRoute('monitor-edit').path,
    show: getAppRoute('monitor-detail').path,
    timePolicy: 'none'
  }),
  routedNavigationResource('entities', {
    parent: 'shell-workspace',
    icon: <DeploymentUnitOutlined />,
    order: 25,
    show: getAppRoute('entity-detail').path,
    timePolicy: 'none'
  }),
  routedNavigationResource('topology', {
    parent: 'shell-workspace',
    icon: <ApartmentOutlined />,
    order: 27,
    timePolicy: 'global'
  }),
  routedNavigationResource('explore', {
    parent: 'shell-workspace',
    icon: <FundProjectionScreenOutlined />,
    order: 30,
    timePolicy: 'route_owned'
  }),
  routedNavigationResource('instrumentation', {
    parent: 'shell-workspace',
    icon: <ApiOutlined />,
    order: 40,
    timePolicy: 'none'
  }),
  routedNavigationResource('alerts', {
    parent: 'shell-operations',
    icon: <AlertOutlined />,
    order: 10,
    timePolicy: 'none'
  }),
  routedNavigationResource('alert-rules', {
    parent: 'alerts',
    icon: <ToolOutlined />,
    order: 10,
    timePolicy: 'none'
  }),
  routedNavigationResource('alert-groups', {
    parent: 'alerts',
    icon: <TeamOutlined />,
    order: 20,
    timePolicy: 'none'
  }),
  routedNavigationResource('alert-inhibits', {
    parent: 'alerts',
    icon: <ToolOutlined />,
    order: 30,
    timePolicy: 'none'
  }),
  routedNavigationResource('alert-silences', {
    name: alertSilenceResourceName,
    parent: 'alerts',
    icon: <ToolOutlined />,
    order: 40,
    dataProviderName: alertSilenceResourceName,
    timePolicy: 'none'
  }),
  routedNavigationResource('alert-integrations', {
    parent: 'alerts',
    icon: <ApiOutlined />,
    order: 50,
    timePolicy: 'none'
  }),
  routedNavigationResource('bulletin', {
    parent: 'shell-operations',
    icon: <ReadOutlined />,
    order: 20,
    timePolicy: 'none'
  }),
  routedNavigationResource('settings', {
    parent: 'shell-administration',
    icon: <SettingOutlined />,
    order: 10,
    timePolicy: 'none'
  }),
  routedNavigationResource('notice-receivers', {
    name: noticeReceiverResourceName,
    parent: 'settings',
    icon: <BellOutlined />,
    order: 10,
    dataProviderName: noticeReceiverResourceName
  }),
  routedNavigationResource(noticeRuleResourceName, {
    parent: 'settings',
    icon: <ToolOutlined />,
    order: 20,
    dataProviderName: noticeRuleResourceName
  }),
  routedNavigationResource(noticeTemplateResourceName, {
    parent: 'settings',
    icon: <ReadOutlined />,
    order: 30,
    dataProviderName: noticeTemplateResourceName
  }),
  routedNavigationResource('message-server', {
    parent: 'settings',
    icon: <ApiOutlined />,
    order: 40
  }),
  routedNavigationResource('tokens', {
    parent: 'settings',
    icon: <ApiOutlined />,
    order: 50,
    dataProviderName: 'tokens'
  }),
  routedNavigationResource('collectors', {
    parent: 'settings',
    icon: <ApiOutlined />,
    order: 55
  }),
  routedNavigationResource('plugins', {
    parent: 'settings',
    icon: <AppstoreOutlined />,
    order: 57
  }),
  routedNavigationResource('monitor-definitions', {
    parent: 'settings',
    icon: <ReadOutlined />,
    order: 58
  }),
  routedNavigationResource('system-settings', {
    name: systemConfigResourceName,
    parent: 'settings',
    icon: <SettingOutlined />,
    order: 60,
    dataProviderName: systemConfigResourceName
  }),
  routedNavigationResource('labels', {
    name: labelResourceName,
    parent: 'settings',
    icon: <TagsOutlined />,
    order: 70,
    dataProviderName: labelResourceName
  }),
  routedNavigationResource('object-store', {
    parent: 'settings',
    icon: <DatabaseOutlined />,
    order: 80,
    dataProviderName: 'object-store'
  }),
  routedNavigationResource('status-management', {
    parent: 'settings',
    icon: <FundProjectionScreenOutlined />,
    order: 90
  })
];

export function buildRefineResources(apps: readonly MonitorApp[] = []): ResourceProps[] {
  return [...staticRefineResources, ...buildMonitorNavigationResources(apps)];
}

export const refineResources = buildRefineResources();

export const shellAccessControlProvider: AccessControlProvider = {
  can: ({ params }) => Promise.resolve(resolveShellAccess(params))
};

function navigationResource(resource: NavigationResource): ResourceProps {
  const shell: ShellResourceMeta = {
    capability: resource.capability ?? 'supported',
    ...optionalResourceLabel(resource.label),
    labelKey: resource.labelKey,
    navigation: true,
    order: resource.order,
    timePolicy: resource.timePolicy ?? (resource.parent === 'settings' || !resource.list ? 'none' : 'unknown'),
    ...(resource.requiredRoles ? { requiredRoles: resource.requiredRoles } : {}),
    ...(resource.actionTimePolicies ? { actionTimePolicies: resource.actionTimePolicies } : {})
  };
  return {
    name: resource.name,
    meta: navigationResourceMeta(resource, shell),
    ...navigationResourceRoutes(resource)
  };
}

function navigationResourceMeta(resource: NavigationResource, shell: ShellResourceMeta) {
  return {
    icon: resource.icon,
    shell,
    ...(resource.dataProviderName ? { dataProviderName: resource.dataProviderName } : {}),
    ...(resource.parent ? { parent: resource.parent } : {})
  };
}

function navigationResourceRoutes(resource: NavigationResource) {
  return {
    ...(resource.list ? { list: resource.list } : {}),
    ...(resource.create ? { create: resource.create } : {}),
    ...(resource.edit ? { edit: resource.edit } : {}),
    ...(resource.show ? { show: resource.show } : {})
  };
}

function optionalResourceLabel(label: string | undefined) {
  return label ? { label } : {};
}

function buildMonitorNavigationResources(apps: readonly MonitorApp[]) {
  const visibleApps = monitorNavigationApps(apps);
  const categories = [...new Set(visibleApps.flatMap(app => (app.category ? [app.category] : [])))].sort();
  const categoryResources = categories.map((category, index) =>
    navigationResource({
      name: monitorCategoryResourceName(category),
      ...(translatedMonitorCategories.has(category) ? {} : { label: category }),
      labelKey: `monitor.categories.${category}`,
      icon: <AppstoreOutlined />,
      parent: 'monitors',
      order: monitorCategoryOrderStart + index
    })
  );
  const applicationResources = visibleApps.map((app, index) =>
    navigationResource({
      name: monitorAppResourceName(app.value),
      label: app.label ?? app.value,
      labelKey: `monitor.apps.${app.value}`,
      list: buildMonitorListPath({ app: app.value }),
      icon: <MonitorOutlined />,
      parent: app.category ? monitorCategoryResourceName(app.category) : 'monitors',
      order: monitorApplicationOrderStart + index,
      timePolicy: 'none'
    })
  );
  return [...categoryResources, ...applicationResources];
}

function monitorCategoryResourceName(category: string) {
  return `monitor-category:${encodeURIComponent(category)}`;
}

function monitorAppResourceName(app: string) {
  return `monitor-app:${encodeURIComponent(app)}`;
}

function routedNavigationResource(routeId: AppResourceRouteId, resource: RoutedNavigationResource) {
  const routeDefinition = getAppRoute(routeId);
  if (!routeDefinition.resource) throw new Error(`Route ${routeId} is not a Refine resource.`);
  return navigationResource({
    ...resource,
    name: resource.name ?? routeDefinition.id,
    list: routeDefinition.resource.listPath ?? routeDefinition.path,
    labelKey: routeDefinition.resource.labelKey,
    ...(routeDefinition.resource.requiredRoles ? { requiredRoles: [...routeDefinition.resource.requiredRoles] } : {})
  });
}

export function resolveShellAccess(params: Parameters<AccessControlProvider['can']>[0]['params']) {
  const shell = readShellResourceMeta(params?.resource?.meta?.shell);
  if (!shell || shell.capability !== 'supported') return capabilityDenied(shell);
  const permitted = hasShellRoleAccess(shell, stringRoles(params?.roles));
  return permitted ? { can: true } : { can: false, reason: 'ROLE_REQUIRED' };
}

function capabilityDenied(shell?: ShellResourceMeta) {
  const capability = shell ? shell.capability.toUpperCase() : 'UNKNOWN';
  return { can: false, reason: `CAPABILITY_${capability}` };
}

function stringRoles(value: unknown) {
  return Array.isArray(value) ? value.filter(role => typeof role === 'string') : [];
}
