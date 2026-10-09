/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { beforeAll, afterEach, it, expect, vi } from 'vitest';
import { i18n, initializeI18n, loadLocale } from '@/core/i18n/i18n';
import { MetricChartSettings } from './metric-chart-settings';
beforeAll(async () => {
  await initializeI18n();
  await loadLocale('en-US');
});
afterEach(cleanup);
it('keeps applied0–10 chart and data unchanged when finite input has an overflowing span', () => {
  const onChange = vi.fn(),
    view = { mode: 'chart' as const, hidden: ['b'], chart: { display: 'bar' as const, min: 0, max: 10 } };
  render(
    <I18nextProvider i18n={i18n}>
      <MetricChartSettings view={view} onChange={onChange} />
    </I18nextProvider>
  );
  fireEvent.click(screen.getByRole('button', { name: 'Display settings' }));
  fireEvent.change(screen.getByRole('textbox', { name: 'Y-axis minimum' }), { target: { value: '-1e308' } });
  fireEvent.change(screen.getByRole('textbox', { name: 'Y-axis maximum' }), { target: { value: '1e308' } });
  fireEvent.click(screen.getByRole('button', { name: 'Apply axis range' }));
  expect(onChange).not.toHaveBeenCalled();
  expect(screen.getByRole('alert')).toBeInTheDocument();
  expect(view.chart).toEqual({ display: 'bar', min: 0, max: 10 });
});

it('keeps the previous view when a max-only bar conflicts with its automatic data minimum', () => {
  const onChange = vi.fn();
  render(
    <I18nextProvider i18n={i18n}>
      <MetricChartSettings
        view={{ mode: 'chart', hidden: [], chart: { display: 'bar', min: 0, max: 25 } }}
        dataExtent={{ min: 10, max: 20 }}
        onChange={onChange}
      />
    </I18nextProvider>
  );
  fireEvent.click(screen.getByRole('button', { name: 'Display settings' }));
  fireEvent.change(screen.getByRole('textbox', { name: 'Y-axis minimum' }), { target: { value: '' } });
  fireEvent.change(screen.getByRole('textbox', { name: 'Y-axis maximum' }), { target: { value: '5' } });
  fireEvent.click(screen.getByRole('button', { name: 'Apply axis range' }));
  expect(onChange).not.toHaveBeenCalled();
  expect(screen.getByRole('alert')).toBeInTheDocument();
});
