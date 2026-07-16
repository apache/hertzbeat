/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */
export const settingsPaths = {
  root: '/settings',
  receivers: '/settings/notifications/receivers',
  rules: '/settings/notifications/rules',
  templates: '/settings/notifications/templates',
  channels: '/settings/notifications/channels',
  tokens: '/settings/tokens',
  system: '/settings/system',
} as const;

export const legacySettingsPaths = {
  receivers: '/alerts/notifications/receivers',
  rules: '/alerts/notifications/rules',
  templates: '/alerts/notifications/templates',
  channels: '/setting/settings/server',
  system: '/setting/settings/config',
} as const;
