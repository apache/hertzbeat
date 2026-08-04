/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { describe, expect, it } from 'vitest';

import { settingsPaths } from '@/shared/settings/settings-routes';

import { visibleSettingsNavigationGroups } from './settings-navigation-model';

describe('settings navigation model', () => {
  it('groups settings by operator task instead of exposing one undifferentiated list', () => {
    const groups = visibleSettingsNavigationGroups(['ADMIN']);

    expect(groups.map(group => group.id)).toEqual(['notifications', 'collection', 'platform']);
    expect(groups.map(group => group.items.map(item => item.path))).toEqual([
      [settingsPaths.receivers, settingsPaths.rules, settingsPaths.templates, settingsPaths.channels],
      [settingsPaths.collectors, settingsPaths.monitorDefinitions, settingsPaths.plugins],
      [
        settingsPaths.system,
        settingsPaths.tokens,
        settingsPaths.labels,
        settingsPaths.objectStore,
        settingsPaths.statusPage
      ]
    ]);
  });

  it('hides administrative destinations without removing ordinary settings', () => {
    const paths = visibleSettingsNavigationGroups(['USER']).flatMap(group => group.items.map(item => item.path));

    expect(paths).not.toContain(settingsPaths.tokens);
    expect(paths).not.toContain(settingsPaths.plugins);
    expect(paths).toEqual(
      expect.arrayContaining([
        settingsPaths.receivers,
        settingsPaths.collectors,
        settingsPaths.monitorDefinitions,
        settingsPaths.system,
        settingsPaths.labels
      ])
    );
  });
});
