/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { TFunction } from 'i18next';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ShellAlertNotifications } from './shell-alert-notifications';

const t = ((key: string, options?: Record<string, unknown>) =>
  options ? `${key}:${Object.values(options).join('|')}` : key) as TFunction;

describe('ShellAlertNotifications', () => {
  afterEach(cleanup);

  it('shows an authoritative count, recent evidence, and one Alert Center action', async () => {
    const open = vi.fn();
    render(
      <ShellAlertNotifications
        state={{
          count: { kind: 'ready', total: 3 },
          list: {
            kind: 'ready',
            items: [
              {
                id: 7,
                title: 'Checkout latency',
                detail: 'p95 exceeded',
                severity: 'critical',
                updatedAt: '2026-07-25 10:20:00'
              }
            ]
          },
          sound: { kind: 'ready', muted: true, saving: false, permission: 'default', failure: null },
          toggleSound: vi.fn()
        }}
        t={t}
        onOpenAlerts={open}
      />
    );

    expect(screen.getByText('3')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'shell.actions.alertsWithCount:3' }));
    expect(await screen.findByText('Checkout latency')).toBeInTheDocument();
    expect(screen.getByText('p95 exceeded')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'shell.alerts.openCenter' }));
    expect(open).toHaveBeenCalledOnce();
  });

  it('does not turn unavailable summary evidence into a fake zero badge', async () => {
    render(
      <ShellAlertNotifications
        state={{
          count: { kind: 'unavailable' },
          list: { kind: 'unavailable' },
          sound: { kind: 'unavailable' },
          toggleSound: vi.fn()
        }}
        t={t}
        onOpenAlerts={vi.fn()}
      />
    );

    expect(screen.queryByText('0')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'shell.actions.alerts' }));
    expect(await screen.findByText('shell.alerts.unavailable')).toBeInTheDocument();
  });

  it('renders an explicit empty state only after a successful read', async () => {
    render(
      <ShellAlertNotifications
        state={{
          count: { kind: 'ready', total: 0 },
          list: { kind: 'empty' },
          sound: { kind: 'ready', muted: true, saving: false, permission: 'default', failure: null },
          toggleSound: vi.fn()
        }}
        t={t}
        onOpenAlerts={vi.fn()}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'shell.actions.alerts' }));
    expect(await screen.findByText('shell.alerts.empty')).toBeInTheDocument();
  });

  it('keeps shell list and sound permission rejection distinct', async () => {
    render(
      <ShellAlertNotifications
        state={{
          count: { kind: 'permission' },
          list: { kind: 'permission' },
          sound: { kind: 'permission' },
          toggleSound: vi.fn()
        }}
        t={t}
        onOpenAlerts={vi.fn()}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'shell.actions.alerts' }));
    expect(await screen.findByText('common.permission.roleRequiredDescription')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'common.permission.roleRequiredDescription' })).toBeDisabled();
  });

  it('exposes one compact server-backed sound action with honest disabled evidence', () => {
    const toggleSound = vi.fn();
    const { rerender } = render(
      <ShellAlertNotifications
        state={{
          count: { kind: 'ready', total: 0 },
          list: { kind: 'empty' },
          sound: { kind: 'ready', muted: true, saving: false, permission: 'default', failure: null },
          toggleSound
        }}
        t={t}
        onOpenAlerts={vi.fn()}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'shell.alerts.soundMuted' }));
    expect(toggleSound).toHaveBeenCalledOnce();

    rerender(
      <ShellAlertNotifications
        state={{
          count: { kind: 'ready', total: 0 },
          list: { kind: 'empty' },
          sound: { kind: 'unavailable' },
          toggleSound
        }}
        t={t}
        onOpenAlerts={vi.fn()}
      />
    );
    expect(screen.getByRole('button', { name: 'shell.alerts.soundUnavailable' })).toBeDisabled();
  });
});
