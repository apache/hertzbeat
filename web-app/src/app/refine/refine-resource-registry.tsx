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
  BellOutlined,
  DashboardOutlined,
  DatabaseOutlined,
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
import { noticeReceiverResourceName } from '@/features/alert/notice-receiver';
import { noticeRuleResourceName } from '@/features/alert/notice-rule';
import { noticeTemplateResourceName } from '@/features/alert/notice-template';
import { labelResourceName } from '@/features/settings/label/refine';
import { systemConfigResourceName } from '@/features/settings/system-config/refine';
import type { ShellCapability, ShellResourceMeta, ShellTimePolicy } from '@/layout/shell/shell-navigation-model';

import { alertSilenceResourceName } from './resources/alert-silence-data-provider';

type NavigationResource = {
  name: string;
  list?: string;
  create?: string;
  edit?: string;
  show?: string;
  labelKey: string;
  icon: ReactNode;
  parent?: string;
  order: number;
  capability?: ShellCapability;
  dataProviderName?: string;
  timePolicy?: ShellTimePolicy;
  actionTimePolicies?: ShellResourceMeta['actionTimePolicies'];
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

export const refineResources: ResourceProps[] = [
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

export const shellAccessControlProvider: AccessControlProvider = {
  can: ({ params }) => Promise.resolve(resolveShellAccess(params))
};

function navigationResource(resource: NavigationResource): ResourceProps {
  const shell: ShellResourceMeta = {
    capability: resource.capability ?? 'supported',
    labelKey: resource.labelKey,
    navigation: true,
    order: resource.order,
    timePolicy: resource.timePolicy ?? (resource.parent === 'settings' || !resource.list ? 'none' : 'unknown'),
    ...(resource.actionTimePolicies ? { actionTimePolicies: resource.actionTimePolicies } : {})
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
    ...(resource.list ? { list: resource.list } : {}),
    ...(resource.create ? { create: resource.create } : {}),
    ...(resource.edit ? { edit: resource.edit } : {}),
    ...(resource.show ? { show: resource.show } : {})
  };
}

function routedNavigationResource(routeId: AppResourceRouteId, resource: RoutedNavigationResource) {
  const routeDefinition = getAppRoute(routeId);
  if (!routeDefinition.resource) throw new Error(`Route ${routeId} is not a Refine resource.`);
  return navigationResource({
    ...resource,
    name: resource.name ?? routeDefinition.id,
    list: routeDefinition.path,
    labelKey: routeDefinition.resource.labelKey
  });
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
