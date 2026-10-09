/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { useState } from 'react';
import { afterEach, beforeAll, expect, it, vi } from 'vitest';
import { I18nextProvider } from 'react-i18next';
import { i18n, initializeI18n, loadLocale } from '@/core/i18n/i18n';
import type { MetricPlan } from '@/platform/perses';
import { ExploreMetricPlanEditor } from './explore-metric-plan-editor';
beforeAll(async () => {
  await initializeI18n();
  await loadLocale('en-US');
});
afterEach(cleanup);
function Harness({ initial }: { initial: MetricPlan }) {
  const [plan, onChange] = useState(initial);
  const [activeRef, onActiveRefChange] = useState('a');
  return (
    <I18nextProvider i18n={i18n}>
      <ExploreMetricPlanEditor {...{ plan, onChange, activeRef, onActiveRefChange }} />
    </I18nextProvider>
  );
}
it('keeps source references stable and exposes unresolved formula after deleting its source', () => {
  render(
    <Harness
      initial={{
        version: 1,
        queries: [
          { refId: 'a', metric: 'cpu' },
          { refId: 'b', metric: 'memory' }
        ],
        formulas: [{ id: 'f1', expression: 'a / b' }]
      }}
    />
  );
  fireEvent.click(screen.getByRole('button', { name: 'Remove query a' }));
  expect(screen.getByLabelText('Metric b')).toHaveValue('memory');
  expect(screen.getByRole('alert')).toHaveTextContent('Unknown query reference: a');
  fireEvent.click(screen.getByRole('button', { name: 'Add query' }));
  expect(screen.getByLabelText('Metric c')).toHaveValue('');
  expect(screen.getByLabelText('Formula f1')).toHaveValue('a / b');
});
it('preserves final source, adds a formula, and caps authoring without submitting', () => {
  render(<Harness initial={{ version: 1, queries: [{ refId: 'a', metric: 'cpu' }], formulas: [] }} />);
  expect(screen.getByRole('button', { name: 'Remove query a' })).toBeDisabled();
  for (let index = 0; index < 4; index++) fireEvent.click(screen.getByRole('button', { name: 'Add formula' }));
  expect(screen.getByRole('button', { name: 'Add formula' })).toBeDisabled();
  expect(screen.getByLabelText('Formula f1')).toHaveValue('a');
  expect(screen.queryByRole('alert')).not.toBeInTheDocument();
});
it('reports URL size overflow without throwing or committing the oversized plan', () => {
  const initial: MetricPlan = {
    version: 1,
    queries: [
      { refId: 'a', metric: 'cpu', metricFilter: '%'.repeat(1024) },
      { refId: 'b', metric: 'memory', metricFilter: '%'.repeat(900) }
    ],
    formulas: []
  };
  render(<Harness initial={initial} />);
  fireEvent.change(screen.getByLabelText('Metric a'), { target: { value: '%'.repeat(256) } });
  expect(screen.getByRole('alert')).toHaveTextContent('too large');
});
it('opens label discovery beside the inline filter without opening advanced options', async () => {
  render(
    <I18nextProvider i18n={i18n}>
      <ExploreMetricPlanEditor
        plan={{ version: 1, queries: [{ refId: 'a', metric: 'cpu' }], formulas: [] }}
        onChange={() => {}}
        activeRef="a"
        onActiveRefChange={() => {}}
        labelKeys={{ state: 'ready', items: ['host'], truncated: false }}
      />
    </I18nextProvider>
  );
  expect(screen.queryByRole('combobox', { name: 'Label key' })).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Labels for query a' }));
  expect(await screen.findByRole('combobox', { name: 'Label key' })).toBeInTheDocument();
  expect(screen.getByLabelText(i18n.t('explore.metricComposition.options', { ref: 'a' }))).toHaveAttribute(
    'aria-expanded',
    'false'
  );
});
it('shows both persisted aggregation stages and the outer output step', () => {
  render(
    <Harness
      initial={{
        version: 1,
        queries: [
          {
            refId: 'a',
            metric: 'cpu',
            step: '1800',
            rollup: { aggregation: 'avg', intervalSeconds: 300 },
            nestedRollup: { aggregation: 'max', intervalSeconds: 1800 }
          }
        ],
        formulas: []
      }}
    />
  );
  fireEvent.click(screen.getByLabelText(i18n.t('explore.metricComposition.options', { ref: 'a' })));
  expect(screen.getByRole('combobox', { name: 'a Second time aggregation' })).toBeInTheDocument();
  expect(screen.getByRole('combobox', { name: 'a Second interval' })).toBeInTheDocument();
  expect(screen.getByRole('textbox', { name: 'a Step (seconds)' })).toHaveValue('1800');
});
it('keeps source controls stable when label discovery ownership changes before removal', async () => {
  const plan: MetricPlan = {
    version: 1,
    queries: [
      { refId: 'a', metric: 'cpu' },
      { refId: 'b', metric: 'memory' }
    ],
    formulas: []
  };
  const change = vi.fn();
  const active = vi.fn();
  const props = {
    plan,
    onChange: change,
    onActiveRefChange: active,
    labelKeys: { state: 'ready' as const, items: ['host'], truncated: false }
  };
  const view = render(
    <I18nextProvider i18n={i18n}>
      <ExploreMetricPlanEditor {...props} activeRef="a" />
    </I18nextProvider>
  );
  const remove = screen.getByRole('button', { name: 'Remove query b' });
  fireEvent.focus(remove);
  expect(active).toHaveBeenCalledWith('b');
  view.rerender(
    <I18nextProvider i18n={i18n}>
      <ExploreMetricPlanEditor {...props} activeRef="b" />
    </I18nextProvider>
  );
  expect(screen.getByRole('button', { name: 'Remove query b' })).toBe(remove);
  fireEvent.click(screen.getByRole('button', { name: 'Labels for query b' }));
  await screen.findByRole('combobox', { name: 'Label key' });
  expect(screen.getAllByRole('combobox', { name: 'Label key' })).toHaveLength(1);
  fireEvent.click(remove);
  expect(change).toHaveBeenCalledWith({ ...plan, queries: [plan.queries[0]] });
});
it('keeps the untouched virtual empty source neutral but shows errors after submission or structural edits', () => {
  const plan: MetricPlan = { version: 1, queries: [{ refId: 'a', metric: '' }], formulas: [] };
  const props = { plan, onChange: vi.fn(), activeRef: 'a', onActiveRefChange: vi.fn() };
  const view = render(
    <I18nextProvider i18n={i18n}>
      <ExploreMetricPlanEditor {...props} pristine />
    </I18nextProvider>
  );
  expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  view.rerender(
    <I18nextProvider i18n={i18n}>
      <ExploreMetricPlanEditor {...props} pristine={false} />
    </I18nextProvider>
  );
  expect(screen.getByRole('alert')).toHaveTextContent('Select a metric.');
  view.rerender(
    <I18nextProvider i18n={i18n}>
      <ExploreMetricPlanEditor
        {...props}
        pristine
        plan={{ ...plan, queries: [...plan.queries, { refId: 'b', metric: '' }] }}
      />
    </I18nextProvider>
  );
  expect(screen.getAllByRole('alert')).toHaveLength(2);
});

it('wraps the formula with a discoverable function without submitting and returns input focus', async () => {
  render(
    <Harness
      initial={{ version: 1, queries: [{ refId: 'a', metric: 'cpu' }], formulas: [{ id: 'f1', expression: 'a / 2' }] }}
    />
  );
  fireEvent.click(screen.getByRole('button', { name: 'Add function to formula f1' }));
  const item = await screen.findByRole('menuitem', { name: /abs/ });
  await waitFor(() => expect(item).toHaveFocus());
  fireEvent.click(item);
  expect(screen.getByLabelText('Formula f1')).toHaveValue('abs(a / 2)');
  expect(screen.getByLabelText('Formula f1')).toHaveFocus();
});

it('keeps metric, from filters and aggregation/grouping together without opening advanced options', () => {
  render(
    <Harness
      initial={{ version: 1, queries: [{ refId: 'a', metric: 'cpu', metricFilter: 'host="one"' }], formulas: [] }}
    />
  );
  const filter = screen.getByRole('textbox', { name: `a ${i18n.t('exploreMetric.filter')}` });
  expect(filter.closest('details')).toBeNull();
  const row = screen.getByRole('group', { name: 'Query a' });
  expect(within(row).getByLabelText('Metric a')).toHaveValue('cpu');
  expect(within(row).getByRole('combobox', { name: `a ${i18n.t('exploreMetric.aggregation')}` })).toBeInTheDocument();
  expect(within(row).getByRole('combobox', { name: `a ${i18n.t('exploreMetric.groupBy')}` })).toBeInTheDocument();
  expect(within(row).getByRole('button', { name: 'Query a options' })).toHaveAttribute('aria-expanded', 'false');
  fireEvent.change(filter, { target: { value: 'host="two"' } });
  expect(filter).toHaveValue('host="two"');
});
it('summarizes enabled advanced values while retaining exact editable values and formulas', () => {
  render(
    <Harness
      initial={{
        version: 1,
        queries: [
          {
            refId: 'a',
            metric: 'cpu',
            step: '300',
            timeShiftSeconds: 3600,
            rollup: { aggregation: 'avg', intervalSeconds: 300 }
          }
        ],
        formulas: [{ id: 'f1', expression: 'a / 2' }]
      }}
    />
  );
  const advanced = screen.getByRole('button', { name: 'Query a options' });
  expect(advanced).toHaveAttribute('aria-expanded', 'false');
  const summary = screen.getByText(/avg\(300 s\)/);
  expect(summary).toHaveTextContent('3600');
  expect(summary.closest('button')).toBeNull();
  fireEvent.click(screen.getByText('Modify'));
  expect(screen.getByRole('textbox', { name: 'a Step (seconds)' })).toHaveValue('300');
  expect(screen.getByLabelText('Formula f1')).toHaveValue('a / 2');
});

it('labels grouping clearly and gives the empty grouping input a discoverable placeholder', () => {
  render(<Harness initial={{ version: 1, queries: [{ refId: 'a', metric: 'cpu' }], formulas: [] }} />);
  const group = screen.getByRole('combobox', { name: `a ${i18n.t('exploreMetric.groupBy')}` });
  expect(within(group.closest('label')!).getByText(i18n.t('explore.metricComposition.groupPlaceholder'))).toBeVisible();
  expect(group.closest('label')).toHaveTextContent(i18n.t('explore.metricComposition.byLabel'));
});
it('focuses the first label control when discovery opens', async () => {
  render(
    <I18nextProvider i18n={i18n}>
      <ExploreMetricPlanEditor
        plan={{ version: 1, queries: [{ refId: 'a', metric: 'cpu' }], formulas: [] }}
        activeRef="a"
        onChange={vi.fn()}
        onActiveRefChange={vi.fn()}
        labelKeys={{ state: 'ready', items: ['host'], truncated: false }}
      />
    </I18nextProvider>
  );
  const trigger = screen.getByRole('button', { name: 'Labels for query a' });
  trigger.focus();
  fireEvent.click(trigger);
  await waitFor(() => expect(screen.getByRole('combobox', { name: 'Label key' })).toHaveFocus());
});
