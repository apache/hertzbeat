/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { afterEach, beforeAll, it, expect, vi } from 'vitest';
import { I18nextProvider } from 'react-i18next';
import { i18n, initializeI18n, loadLocale } from '@/core/i18n/i18n';
import { DEFAULT_TRACE_COLUMNS } from '@/platform/perses';
import { ExploreTraceColumns } from './explore-trace-columns';
beforeAll(async () => {
  await initializeI18n();
  await loadLocale('en-US');
});
afterEach(cleanup);
it('keeps trace identity required and emits only deliberate column changes', () => {
  const onChange = vi.fn();
  render(
    <I18nextProvider i18n={i18n}>
      <ExploreTraceColumns display={{ columns: DEFAULT_TRACE_COLUMNS, density: 'compact' }} onChange={onChange} />
    </I18nextProvider>
  );
  fireEvent.click(screen.getByRole('button', { name: i18n.t('explore.logColumns.title') }));
  expect(screen.getByRole('checkbox', { name: i18n.t('explore.traceColumns.fields.traceName') })).toBeDisabled();
  expect(onChange).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('checkbox', { name: i18n.t('explore.traceColumns.fields.service') }));
  expect(onChange).toHaveBeenCalledWith({ columns: [...DEFAULT_TRACE_COLUMNS, 'service'], density: 'compact' });
});

it('uses span table labels for choices and reordering, and resets to span defaults', () => {
  const onChange = vi.fn();
  render(
    <I18nextProvider i18n={i18n}>
      <ExploreTraceColumns
        population="matched_spans"
        display={{ columns: DEFAULT_TRACE_COLUMNS, density: 'compact' }}
        onChange={onChange}
      />
    </I18nextProvider>
  );
  fireEvent.click(screen.getByRole('button', { name: i18n.t('explore.logColumns.title') }));
  expect(screen.getByRole('checkbox', { name: i18n.t('exploreTrace.analytics.fields.operationName') })).toBeDisabled();
  expect(
    screen.getByRole('checkbox', { name: i18n.t('exploreTrace.analytics.fields.serviceName') })
  ).toBeInTheDocument();
  expect(screen.getByRole('checkbox', { name: i18n.t('exploreTrace.analytics.spanDuration') })).toBeChecked();
  fireEvent.click(
    screen.getByRole('button', {
      name: i18n.t('explore.logColumns.earlier', { field: i18n.t('exploreTrace.analytics.spanDuration') })
    })
  );
  expect(onChange).toHaveBeenLastCalledWith({
    columns: ['traceName', 'duration', 'spanCount', 'startTime'],
    density: 'compact'
  });
  fireEvent.click(screen.getByRole('button', { name: i18n.t('explore.logColumns.reset') }));
  expect(onChange).toHaveBeenLastCalledWith({
    columns: ['traceName', 'service', 'errorCount', 'duration', 'startTime'],
    density: 'compact'
  });
});
