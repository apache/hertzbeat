/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { afterEach, beforeAll, expect, it, vi } from 'vitest';
import { i18n, initializeI18n, loadLocale } from '@/core/i18n/i18n';
import { ExploreMetricPlanEditor } from './explore-metric-plan-editor';
beforeAll(async () => {
  await initializeI18n();
  await loadLocale('en-US');
});
afterEach(cleanup);
it('retires a composing same-field input when active query ownership changes', async () => {
  const onChange = vi.fn();
  const plan = {
    version: 1 as const,
    queries: [
      { refId: 'a', metric: 'cpu', metricFilter: 'host="first"' },
      { refId: 'b', metric: 'memory', metricFilter: 'host="second"' }
    ],
    formulas: []
  };
  const ui = (activeRef: string) => (
    <I18nextProvider i18n={i18n}>
      <ExploreMetricPlanEditor
        plan={plan}
        activeRef={activeRef}
        discoveryIdentity={activeRef}
        onChange={onChange}
        onActiveRefChange={vi.fn()}
        labelKeys={{ state: 'ready', items: ['host'], truncated: false }}
      />
    </I18nextProvider>
  );
  const view = render(ui('a'));
  fireEvent.click(screen.getByRole('button', { name: 'Labels for query a' }));
  const oldInput = await screen.findByRole('textbox', { name: 'Value for host' });
  fireEvent.compositionStart(oldInput);
  view.rerender(ui('b'));
  fireEvent.click(screen.getByRole('button', { name: 'Labels for query b' }));
  const nextInput = await screen.findByRole('textbox', { name: 'Value for host' });
  expect(nextInput).not.toBe(oldInput);
  expect(nextInput).toHaveValue('second');
  fireEvent.compositionEnd(oldInput, { data: 'old-owner' });
  fireEvent.change(oldInput, { target: { value: 'old-owner' } });
  expect(onChange).not.toHaveBeenCalled();
  fireEvent.change(nextInput, { target: { value: 'new-owner' } });
  expect(onChange).toHaveBeenLastCalledWith(
    expect.objectContaining({
      queries: [plan.queries[0], expect.objectContaining({ refId: 'b', metricFilter: 'host = "new-owner"' })]
    })
  );
});
