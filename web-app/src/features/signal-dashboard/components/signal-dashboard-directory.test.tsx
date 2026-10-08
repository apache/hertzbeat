/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { vi, describe, it, expect, afterEach } from 'vitest';
import { SignalDashboardDirectory } from './signal-dashboard-directory';
import type { DashboardViewProps } from '../model/signal-dashboard-view-model';
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, args?: { count: number; total: number }) => (args ? `${key}: ${args.count}/${args.total}` : key),
    i18n: { language: 'en-US' }
  })
}));
afterEach(cleanup);
const records = Array.from({ length: 9 }, (_, i) => ({
  dashboardKey: `dashboard-${i}`,
  title: `Audit-${i}`,
  updateTime: '2026-10-03T09:22:10.123456',
  layout: '[]',
  widgets: '[]',
  version: 'v1'
}));
function setup() {
  const open = vi.fn();
  render(
    <SignalDashboardDirectory
      state={{ listState: 'ready', records, timeZone: 'Asia/Shanghai', canWrite: false } as DashboardViewProps['state']}
      actions={{ open } as unknown as DashboardViewProps['actions']}
    />
  );
  return { open };
}
describe('dashboard directory discovery', () => {
  it('searches the complete loaded catalog, retains zero-match query and clears back to all records', () => {
    setup();
    const search = screen.getByRole('textbox', { name: 'signalDashboard.search' });
    fireEvent.change(search, { target: { value: 'audit-3' } });
    expect(screen.getByRole('status')).toHaveTextContent('1/9');
    expect(screen.getByText('Audit-3')).toBeVisible();
    expect(screen.queryByText('Audit-4')).not.toBeInTheDocument();
    fireEvent.change(search, { target: { value: 'impossible' } });
    expect(search).toHaveValue('impossible');
    expect(screen.getByRole('status')).toHaveTextContent('0/9');
    expect(screen.getByText('signalDashboard.noMatches')).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'signalDashboard.clearSearch' }));
    expect(search).toHaveValue('');
    expect(screen.getByRole('status')).toHaveTextContent('9/9');
  });
  it('opens the intended matching dashboard using the existing action', () => {
    const { open } = setup();
    fireEvent.change(screen.getByRole('textbox', { name: 'signalDashboard.search' }), { target: { value: 'Audit-7' } });
    fireEvent.click(screen.getByRole('button', { name: 'signalDashboard.open' }));
    expect(open).toHaveBeenCalledWith('dashboard-7');
  });
  it('labels timezone-less backend dates and keeps exact source values accessible', () => {
    setup();
    expect(screen.getAllByText(/signalDashboard.timeZoneUnspecified/)).toHaveLength(9);
    expect(screen.getAllByText('2026-10-03T09:22:10.123456')).toHaveLength(9);
  });
});
