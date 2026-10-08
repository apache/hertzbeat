/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeAll, expect, it, vi } from 'vitest';
import { I18nextProvider } from 'react-i18next';
import { initializeI18n, loadLocale, i18n } from '@/core/i18n/i18n';
import { DashboardPanelActions } from './dashboard-panel-actions';
beforeAll(async () => {
  await initializeI18n();
  await loadLocale('en-US');
});
afterEach(cleanup);
it.each([
  ['ready', false, false, false, 'common.refresh'],
  ['loading', true, false, false, 'common.cancel'],
  ['failed', false, true, false, 'signalDashboard.retryPanel'],
  ['cancelled', false, false, true, 'signalDashboard.retryPanel']
] as const)('shows only the meaningful %s action', (_name, loading, failed, cancelled, label) => {
  render(
    <I18nextProvider i18n={i18n}>
      <DashboardPanelActions
        loading={loading}
        failed={failed}
        actions={{ retry: vi.fn(), cancel: vi.fn(), cancelled }}
      />
    </I18nextProvider>
  );
  expect(screen.getAllByRole('button')).toHaveLength(1);
  expect(screen.getByRole('button', { name: i18n.t(label) })).toBeInTheDocument();
});
