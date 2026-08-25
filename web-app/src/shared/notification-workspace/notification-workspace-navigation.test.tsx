/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

// @vitest-environment jsdom

import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

import en from '@/assets/i18n/en-us.json';
import ja from '@/assets/i18n/ja-jp.json';
import pt from '@/assets/i18n/pt-br.json';
import zhCn from '@/assets/i18n/zh-cn.json';
import zhTw from '@/assets/i18n/zh-tw.json';
import { settingsPaths } from '@/shared/settings/settings-routes';

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));

import { NotificationWorkspaceNavigation } from './notification-workspace-navigation';

describe('NotificationWorkspaceNavigation', () => {
  it('renders canonical ordered links, one authoritative current status, and quiet unloaded peers', () => {
    render(
      <MemoryRouter>
        <NotificationWorkspaceNavigation activeStep="receivers" status="configured" />
      </MemoryRouter>
    );

    const navigation = screen.getByRole('navigation', { name: 'notificationWorkspace.label' });
    expect(navigation).toHaveAttribute('data-active-step', 'receivers');
    expect(screen.getAllByRole('link').map(link => link.getAttribute('href'))).toEqual([
      settingsPaths.channels,
      settingsPaths.receivers,
      settingsPaths.templates,
      settingsPaths.rules
    ]);
    expect(screen.getByText('notificationWorkspace.status.configured')).toHaveAttribute(
      'data-notification-status',
      'configured'
    );
    expect(screen.getAllByText('notificationWorkspace.status.notLoaded')).toHaveLength(3);
  });

  it('uses the same channel-service term in the guide and the primary navigation for every locale', () => {
    for (const locale of [en, ja, pt, zhCn, zhTw]) {
      expect(locale.notificationWorkspace.steps.channels.label).toBe(locale.settingsNavigation.channels);
    }
  });
});
