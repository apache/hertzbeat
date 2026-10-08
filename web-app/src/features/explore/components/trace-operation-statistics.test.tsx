/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeAll, expect, it } from 'vitest';
import { I18nextProvider } from 'react-i18next';
import { i18n, initializeI18n, loadLocale } from '@/core/i18n/i18n';
import en from '@/assets/i18n/explore/en-us.json';
import type { OperationSpan } from '../model/trace-operation-statistics';
import { TraceOperationStatistics } from './trace-operation-statistics';
const copy = en.exploreInvestigation.trace.operationStatistics;
const span = (id: string, operation: string | null, service: string | null = 'api'): OperationSpan => ({
  spanId: id,
  parentSpanId: null,
  spanName: operation,
  serviceName: service,
  startTimeUnixNano: '9007199254740993',
  durationNanos: '10'
});
beforeAll(async () => {
  await initializeI18n();
  await loadLocale('en-US');
});
afterEach(cleanup);
function show(spans: OperationSpan[], partial = false) {
  return render(
    <I18nextProvider i18n={i18n}>
      <TraceOperationStatistics spans={spans} partial={partial} evidenceCurrent />
    </I18nextProvider>
  );
}

it('shows the null/null group and preserves empty/whitespace identities before filtering', () => {
  show([span('a', null, null), span('b', ''), span('c', ' ')]);
  const table = screen.getByRole('table', { name: copy.groups });
  expect(within(table).getAllByRole('row')).toHaveLength(4);
  expect(within(table).getByRole('button', { name: copy.missing })).toBeVisible();
  expect(within(table).getByRole('button', { name: copy.empty })).toBeVisible();
  expect(within(table).getByRole('button', { name: '" "' })).toBeVisible();
});
it('14: keeps a long operation fully readable and keyboard-activatable in local drilldown', () => {
  const operation = 'POST /' + 'long-operation/'.repeat(80);
  show([span('a', operation)]);
  const button = screen.getByRole('button', { name: operation });
  button.focus();
  expect(button).toHaveFocus();
  expect(button).toHaveTextContent(operation);
  fireEvent.click(button);
  expect(screen.getByRole('region', { name: copy.loadedSpans })).toHaveTextContent('a');
});
it('describes missing-child uncertainty, invalid timing and unavailable statistics honestly', () => {
  show([{ ...span('a', 'GET'), durationNanos: '-1' }], true);
  expect(screen.getByText(copy.noUsable)).toBeVisible();
  const explanation = screen.getByText(copy.selfExplanation);
  expect(explanation.closest('details')).not.toHaveAttribute('open');
  expect(explanation).not.toBeVisible();
  expect(screen.getByText(copy.sample.replace('{{count}}', '0').replace('{{loaded}}', '1'))).toBeVisible();
  expect(screen.getByText(copy.partial)).toBeVisible();
  expect(screen.getByRole('table', { name: copy.groups })).toHaveTextContent(copy.average);
  expect(screen.queryByText('0 ns')).toBeNull();
});
it.each(['en-US', 'zh-CN', 'zh-TW', 'ja-JP', 'pt-BR'] as const)('resolves every statistics key in %s', async locale => {
  await loadLocale(locale);
  for (const key of Object.keys(copy))
    expect(i18n.getResource(locale, 'translation', `exploreInvestigation.trace.operationStatistics.${key}`)).toEqual(
      expect.any(String)
    );
  await loadLocale('en-US');
});

it('resets local pagination after filtering or sorting and restores filter focus when the drilldown trigger leaves', () => {
  const operation = 'POST /' + 'long-operation/'.repeat(12);
  const service = 'service-' + 'long-service-'.repeat(12);
  show(
    Array.from({ length: 31 }, (_, i) =>
      span(String(i), i === 30 ? operation : `operation-${i}`, i === 30 ? service : 'api')
    )
  );
  const nav = () => within(screen.getByRole('navigation', { name: copy.groups }));
  expect(screen.getByRole('table', { name: copy.groups }).querySelectorAll('tbody tr')).toHaveLength(25);
  fireEvent.click(nav().getByRole('button', { name: copy.next }));
  const button = screen.getByRole('button', { name: operation });
  button.focus();
  expect(button).toHaveTextContent(operation);
  expect(screen.getByText(service)).toHaveAttribute('title', JSON.stringify(service));
  fireEvent.click(button);
  const filter = screen.getByRole('textbox', { name: copy.filter });
  fireEvent.change(filter, { target: { value: 'operation-0' } });
  expect(screen.queryByRole('navigation', { name: copy.groups })).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: copy.close }));
  expect(filter).toHaveFocus();
  fireEvent.change(filter, { target: { value: '' } });
  expect(nav().getByRole('button', { name: copy.previous })).toBeDisabled();
  fireEvent.click(nav().getByRole('button', { name: copy.next }));
  fireEvent.change(screen.getByRole('combobox', { name: copy.sort }), { target: { value: 'self' } });
  expect(nav().getByRole('button', { name: copy.previous })).toBeDisabled();
});
