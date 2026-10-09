/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import { cleanup, render, screen } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { afterEach, beforeAll, expect, it, vi } from 'vitest';
import { initializeI18n, loadLocale, i18n } from '@/core/i18n/i18n';
import { ExploreWorkbench } from './explore-workbench';
import { ExploreTimeControl } from './explore-time-control';

beforeAll(async () => {
  await initializeI18n();
  await loadLocale('en-US');
});
afterEach(cleanup);
it.each(['logs', 'metrics', 'traces'] as const)('uses one header and inline timezone contract for %s', signal => {
  const query = {
    signal,
    timeRange: 'last-30m' as const,
    start: 1788786000120,
    end: 1788787800340,
    timeZone: 'Asia/Shanghai'
  };
  const updateQuery = vi.fn();
  render(
    <I18nextProvider i18n={i18n}>
      <ExploreWorkbench
        query={query}
        t={i18n.t}
        updateQuery={updateQuery}
        actions={<button>Views</button>}
        timeToolbar={<ExploreTimeControl query={query} t={i18n.t} updateScope={updateQuery} />}
      />
    </I18nextProvider>
  );
  const header = screen.getByRole('banner');
  expect(header).toHaveAttribute('data-signal-workbench-header');
  expect(screen.getByRole('button', { name: 'Views' }).closest('[data-signal-view-slot]')).not.toBeNull();
  expect(screen.getByText('GMT+8')).toHaveAttribute('tabindex', '0');
  expect(screen.getAllByRole('textbox', { name: i18n.t('explore.timeRange') })).toHaveLength(2);
  expect(updateQuery).not.toHaveBeenCalled();
});
