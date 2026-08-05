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
});
