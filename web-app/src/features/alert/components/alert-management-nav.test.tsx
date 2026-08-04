/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { buildAlertIntegrationPath } from '@/shared/navigation/app-paths';

import { AlertManagementNav } from './alert-management-nav';

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));

describe('AlertManagementNav', () => {
  afterEach(cleanup);

  it('owns the alert integration deep link alongside the other alert tasks', () => {
    render(
      <MemoryRouter initialEntries={[buildAlertIntegrationPath('webhook')]}>
        <AlertManagementNav />
      </MemoryRouter>
    );

    expect(screen.getByRole('tab', { name: 'alertIntegrations.menu' })).toHaveAttribute('aria-selected', 'true');
  });
});
