/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { afterEach, beforeAll, expect, it, vi } from 'vitest';
import { I18nextProvider } from 'react-i18next';
import { i18n, initializeI18n, loadLocale } from '@/core/i18n/i18n';
import type { SavedQueriesViewModel } from '../model/explore-saved-query-view-model';
import { ExploreSavedQueryDrawer } from './explore-saved-query-drawer';
beforeAll(async () => {
  await initializeI18n();
  await loadLocale('en-US');
});
afterEach(cleanup);
it('searches literal names and descriptions without writes, and clears a no-match search', () => {
  const model = {
    open: true,
    groups: [
      { signal: 'metrics', state: 'ready', records: [] },
      {
        signal: 'logs',
        state: 'ready',
        records: [
          {
            signal: 'logs',
            viewKey: 'one',
            label: 'Checkout [ERROR]',
            description: 'Payment failures',
            route: 'invalid',
            updateTime: '2026-09-08T01:02:03Z'
          },
          { signal: 'logs', viewKey: 'two', label: 'Database', description: 'Slow calls', route: 'invalid' }
        ]
      }
    ],
    canWrite: false,
    query: { signal: 'logs', timeRange: 'last-30m' },
    refresh: vi.fn(),
    setOpen: vi.fn(),
    reopen: vi.fn(),
    remove: vi.fn()
  } as unknown as SavedQueriesViewModel;
  render(
    <I18nextProvider i18n={i18n}>
      <ExploreSavedQueryDrawer model={model} />
    </I18nextProvider>
  );
  expect(screen.getByText(i18n.t('exploreSaved.empty'))).toBeInTheDocument();
  fireEvent.change(screen.getByRole('textbox', { name: 'Search saved queries' }), { target: { value: '[error]' } });
  expect(screen.getByText('Checkout [ERROR]')).toBeInTheDocument();
  expect(screen.queryByText('Database')).not.toBeInTheDocument();
  fireEvent.change(screen.getByRole('textbox', { name: 'Search saved queries' }), { target: { value: 'PAYMENT' } });
  expect(screen.getByText('Checkout [ERROR]')).toBeInTheDocument();
  fireEvent.change(screen.getByRole('textbox', { name: 'Search saved queries' }), { target: { value: 'absent' } });
  expect(screen.getByText('No saved queries match these filters.')).toBeInTheDocument();
  expect(screen.queryByText(i18n.t('exploreSaved.empty'))).not.toBeInTheDocument();
  expect(screen.queryByRole('region', { name: i18n.t('explore.signals.logs') })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Clear filters' }));
  expect(screen.getByText('Database')).toBeInTheDocument();
  expect(model.refresh).not.toHaveBeenCalled();
  expect(model.remove).not.toHaveBeenCalled();
});
