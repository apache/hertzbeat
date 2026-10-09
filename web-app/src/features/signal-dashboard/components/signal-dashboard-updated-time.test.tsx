/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { HertzBeatTimeZoneProvider } from '@/platform/perses';
import { SignalDashboardUpdatedTime } from './signal-dashboard-updated-time';
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key, i18n: { language: 'en-US' } }) }));
afterEach(cleanup);
describe('dashboard source timestamps', () => {
  it('converts an explicit UTC timestamp to the selected timezone and preserves exact source', () => {
    render(<SignalDashboardUpdatedTime value="2026-10-03T09:22:10.123456Z" timeZone="Asia/Shanghai" />);
    expect(screen.getByText(/5:22:10 PM/)).toHaveTextContent('Asia/Shanghai');
    expect(screen.getByText('2026-10-03T09:22:10.123456Z')).toBeInTheDocument();
  });
  it.each(['2026-02-31T09:22:10', 'invalid', '2026-13-03T09:22:10'])(
    'retains malformed source without inventing a date: %s',
    value => {
      render(<SignalDashboardUpdatedTime value={value} timeZone="Asia/Shanghai" />);
      expect(screen.getByText(value)).toBeVisible();
      expect(document.querySelector('summary')).toBeNull();
    }
  );
  it('shows unknown for missing metadata', () => {
    render(<SignalDashboardUpdatedTime value={null} timeZone="Asia/Shanghai" />);
    expect(screen.getByText('common.unknown')).toBeVisible();
  });
});

it('retains offset source exactly when an invalid provider timezone reaches the formatter', () => {
  render(
    <HertzBeatTimeZoneProvider timeZone="Not/AZone">
      <SignalDashboardUpdatedTime value="2026-10-03T09:22:10.123456+08:00" timeZone="Not/AZone" />
    </HertzBeatTimeZoneProvider>
  );
  expect(screen.getByText('2026-10-03T09:22:10.123456+08:00')).toBeVisible();
  expect(document.querySelector('summary')).toBeNull();
});
it.each(['Asia/Shanghai', 'America/Los_Angeles', 'Not/AZone'])(
  'preserves civil time without an inferred source zone with selected zone %s',
  timeZone => {
    render(<SignalDashboardUpdatedTime value="2026-10-03T09:22:10.123456" timeZone={timeZone} />);
    expect(screen.getByText(/9:22:10 AM/)).toHaveTextContent('signalDashboard.timeZoneUnspecified');
    expect(screen.getByText('2026-10-03T09:22:10.123456')).toBeInTheDocument();
  }
);
