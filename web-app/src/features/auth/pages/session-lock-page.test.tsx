/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import { i18n, initializeI18n, loadLocale } from '@/core/i18n/i18n';

const controller = vi.hoisted(() => ({
  canUnlock: true,
  failure: null as string | null,
  failureKey: undefined as string | undefined,
  identity: { username: 'operator', workspaceId: 'workspace-a' },
  loading: false,
  logout: vi.fn(),
  operation: null as 'unlock' | 'logout' | null,
  password: '',
  retrySession: vi.fn(),
  retryableSessionFailure: false,
  setPassword: vi.fn(),
  unlock: vi.fn()
}));
vi.mock('../controller/use-session-lock-controller', () => ({ useSessionLockController: () => controller }));

import { SessionLockPage } from './session-lock-page';

describe('SessionLockPage', () => {
  beforeAll(async () => {
    await initializeI18n();
    await loadLocale('en-US');
  });
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('renders a passport-layout re-auth surface without username or redirect inputs', () => {
    render(
      <I18nextProvider i18n={i18n}>
        <SessionLockPage />
      </I18nextProvider>
    );

    expect(screen.getByRole('heading', { name: 'Session locked' })).toBeInTheDocument();
    expect(screen.getByText('Enter your password to continue this session.')).toBeInTheDocument();
    expect(screen.getByText('operator')).toBeInTheDocument();
    expect(screen.getByText('Workspace: workspace-a')).toBeInTheDocument();
    expect(screen.getByLabelText('Password')).toHaveAttribute('autocomplete', 'current-password');
    expect(screen.queryByLabelText('Username')).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/redirect/i)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Unlock' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sign out' })).toBeInTheDocument();
  });

  it('keeps the password controlled in memory and exposes real unlock/logout actions', async () => {
    render(
      <I18nextProvider i18n={i18n}>
        <SessionLockPage />
      </I18nextProvider>
    );
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'in-memory-only' } });
    fireEvent.click(screen.getByRole('button', { name: 'Unlock' }));
    fireEvent.click(screen.getByRole('button', { name: 'Sign out' }));

    expect(controller.setPassword).toHaveBeenCalledWith('in-memory-only');
    await waitFor(() => expect(controller.unlock).toHaveBeenCalledOnce());
    expect(controller.logout).toHaveBeenCalledOnce();
    expect(document.body.textContent).not.toContain('in-memory-only');
  });
});
