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
          }
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
        state={{ count: { kind: 'unavailable' }, list: { kind: 'unavailable' } }}
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
        state={{ count: { kind: 'ready', total: 0 }, list: { kind: 'empty' } }}
        t={t}
        onOpenAlerts={vi.fn()}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'shell.actions.alerts' }));
    expect(await screen.findByText('shell.alerts.empty')).toBeInTheDocument();
  });
});
