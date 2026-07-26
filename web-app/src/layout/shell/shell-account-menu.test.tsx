/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import { i18n, initializeI18n, loadLocale } from '@/core/i18n/i18n';

import { ShellAccountMenu } from './shell-account-menu';

describe('ShellAccountMenu', () => {
  beforeAll(async () => {
    await initializeI18n();
    await loadLocale('en-US');
  });
  afterEach(cleanup);

  it('restores the established settings, lock, about, and logout actions', async () => {
    const openSettings = vi.fn();
    const lock = vi.fn();
    const logout = vi.fn();
    render(
      <ShellAccountMenu
        accountName="operator"
        loggingOut={false}
        t={i18n.t}
        onOpenSettings={openSettings}
        onLock={lock}
        onLogout={logout}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: i18n.t('shell.actions.user') }));
    fireEvent.click(await screen.findByText(i18n.t('shell.account.settings')));
    expect(openSettings).toHaveBeenCalledOnce();

    fireEvent.click(screen.getByRole('button', { name: i18n.t('shell.actions.user') }));
    fireEvent.click(await screen.findByText(i18n.t('shell.account.lock')));
    expect(lock).toHaveBeenCalledOnce();

    fireEvent.click(screen.getByRole('button', { name: i18n.t('shell.actions.user') }));
    fireEvent.click(await screen.findByText(i18n.t('shell.account.logout')));
    expect(logout).toHaveBeenCalledOnce();
  });

  it('shows About only on explicit request and exposes maintained project destinations', async () => {
    render(
      <ShellAccountMenu
        accountName="operator"
        loggingOut={false}
        t={i18n.t}
        onOpenSettings={vi.fn()}
        onLock={vi.fn()}
        onLogout={vi.fn()}
      />
    );

    expect(screen.queryByRole('dialog', { name: i18n.t('shell.about.title') })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: i18n.t('shell.actions.user') }));
    fireEvent.click(await screen.findByText(i18n.t('shell.account.about')));

    const dialog = screen.getByRole('dialog', { name: i18n.t('shell.about.title') });
    expect(within(dialog).getByText(i18n.t('shell.about.version', { version: '2.0.0' }))).toBeInTheDocument();
    expect(within(dialog).getByRole('link', { name: i18n.t('shell.about.website') })).toHaveAttribute(
      'href',
      'https://hertzbeat.apache.org/'
    );
    expect(within(dialog).getByRole('link', { name: i18n.t('shell.about.documentation') })).toHaveAttribute(
      'href',
      'https://hertzbeat.apache.org/docs/'
    );
    expect(within(dialog).getByRole('link', { name: i18n.t('shell.about.repository') })).toHaveAttribute(
      'href',
      'https://github.com/apache/hertzbeat'
    );
    expect(within(dialog).getByRole('link', { name: i18n.t('shell.about.issues') })).toHaveAttribute(
      'href',
      'https://github.com/apache/hertzbeat/issues'
    );

    fireEvent.click(within(dialog).getByRole('button', { name: i18n.t('common.cancel') }));
  });
});
