/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import { I18nextProvider } from 'react-i18next';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeAll, expect, it, vi } from 'vitest';
import { initializeI18n, loadLocale, i18n } from '@/core/i18n/i18n';
import { DashboardMetricViewEditor } from './dashboard-metric-view-editor';
beforeAll(async () => {
  await initializeI18n();
  await loadLocale('en-US');
});
afterEach(cleanup);
it('updates only display draft and retains hidden rank output for split ranking', () => {
  const plan = {
    version: 1 as const,
    queries: [{ refId: 'a', metric: 'cpu' }],
    formulas: [{ id: 'f1', expression: 'a*2' }]
  };
  const view = {
    mode: 'split' as const,
    hidden: [],
    splitBy: 'host',
    splitRankBy: 'a',
    splitOrder: 'bottom' as const,
    splitScale: 'independent' as const,
    splitLimit: 3
  };
  const change = vi.fn();
  render(
    <I18nextProvider i18n={i18n}>
      <DashboardMetricViewEditor plan={plan} view={view} onChange={change} disabled={false} />
    </I18nextProvider>
  );
  fireEvent.click(screen.getByRole('checkbox', { name: 'a' }));
  expect(change).toHaveBeenCalledWith({ ...view, hidden: ['a'] });
  fireEvent.change(screen.getByLabelText(i18n.t('explore.metricComposition.splitBy')), { target: { value: 'zone' } });
  expect(change).toHaveBeenLastCalledWith({ ...view, splitBy: 'zone' });
  expect(view.splitBy).toBe('host');
});
