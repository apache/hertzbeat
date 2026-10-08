/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { beforeAll, afterEach, expect, it, vi } from 'vitest';
import { i18n, initializeI18n, loadLocale } from '@/core/i18n/i18n';
import { MetricChartSettings } from './metric-chart-settings';
beforeAll(async () => {
  await initializeI18n();
  await loadLocale('en-US');
});
afterEach(cleanup);
it('validates axis drafts before applying and preserves hidden outputs', () => {
  const onChange = vi.fn();
  render(
    <I18nextProvider i18n={i18n}>
      <MetricChartSettings view={{ mode: 'chart', hidden: ['b'] }} onChange={onChange} />
    </I18nextProvider>
  );
  fireEvent.click(screen.getByRole('button', { name: 'Display settings' }));
  fireEvent.change(screen.getByRole('textbox', { name: 'Y-axis minimum' }), { target: { value: '0' } });
  fireEvent.change(screen.getByRole('textbox', { name: 'Y-axis maximum' }), { target: { value: 'NaN' } });
  fireEvent.click(screen.getByRole('button', { name: 'Apply axis range' }));
  expect(onChange).not.toHaveBeenCalled();
  expect(screen.getByRole('alert')).toBeInTheDocument();
  fireEvent.change(screen.getByRole('textbox', { name: 'Y-axis maximum' }), { target: { value: '0' } });
  fireEvent.click(screen.getByRole('button', { name: 'Apply axis range' }));
  expect(onChange).not.toHaveBeenCalled();
  fireEvent.change(screen.getByRole('textbox', { name: 'Y-axis maximum' }), { target: { value: '' } });
  fireEvent.click(screen.getByRole('button', { name: 'Apply axis range' }));
  expect(onChange).toHaveBeenLastCalledWith({ mode: 'chart', hidden: ['b'], chart: { min: 0 } });
});
