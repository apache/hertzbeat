/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { settingsPaths } from '@/shared/settings/settings-routes';

export type SettingsNavigationItem = {
  id: string;
  labelKey: string;
  path: string;
  requiredRoles?: readonly string[];
};

export type SettingsNavigationGroup = {
  id: string;
  labelKey: string;
  items: readonly SettingsNavigationItem[];
};

const adminOnly = ['ADMIN'] as const;

export const settingsNavigationGroups: readonly SettingsNavigationGroup[] = [
  {
    id: 'notifications',
    labelKey: 'settingsNavigation.groups.notifications',
    items: [
      item('receivers', settingsPaths.receivers),
      item('rules', settingsPaths.rules),
      item('templates', settingsPaths.templates),
      item('channels', settingsPaths.channels)
    ]
  },
  {
    id: 'collection',
    labelKey: 'settingsNavigation.groups.collection',
    items: [
      item('collectors', settingsPaths.collectors),
      item('monitorDefinitions', settingsPaths.monitorDefinitions),
      item('plugins', settingsPaths.plugins, adminOnly)
    ]
  },
  {
    id: 'platform',
    labelKey: 'settingsNavigation.groups.platform',
    items: [
      item('system', settingsPaths.system),
      item('tokens', settingsPaths.tokens, adminOnly),
      item('labels', settingsPaths.labels),
      item('objectStore', settingsPaths.objectStore),
      item('statusPage', settingsPaths.statusPage)
    ]
  }
];

/** Keeps role filtering at the navigation boundary so route components stay presentation-only. */
export function visibleSettingsNavigationGroups(roles: readonly string[]) {
  const normalizedRoles = new Set(roles.map(role => role.trim().toUpperCase()));
  return settingsNavigationGroups
    .map(group => ({
      ...group,
      items: group.items.filter(item => item.requiredRoles?.some(role => normalizedRoles.has(role)) ?? true)
    }))
    .filter(group => group.items.length > 0);
}

function item(id: string, path: string, requiredRoles?: readonly string[]): SettingsNavigationItem {
  return {
    id,
    path,
    labelKey: `settingsNavigation.${id}`,
    ...(requiredRoles ? { requiredRoles } : {})
  };
}
