/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import type { FormEvent } from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { afterEach, beforeAll, expect, it, vi } from 'vitest';
import { i18n, initializeI18n, loadLocale } from '@/core/i18n/i18n';
import { MetricLabelDiscovery } from './metric-label-discovery';
beforeAll(async () => {
  await initializeI18n();
  await loadLocale('en-US');
});
afterEach(cleanup);
it('appends a second literal condition without overwriting the first', () => {
  const onFilter = vi.fn();
  const props = {
    labelKeys: { state: 'ready', items: ['host'] as string[], truncated: false },
    selectedLabel: 'host',
    labelValues: { state: 'ready', items: ['a,b'] as string[], truncated: false },
    onFilter
  } as const;
  const view = render(
    <I18nextProvider i18n={i18n}>
      <MetricLabelDiscovery {...props} filter="" />
    </I18nextProvider>
  );
  fireEvent.mouseDown(screen.getByRole('combobox', { name: 'Label value' }));
  fireEvent.click(screen.getByText('a,b', { selector: '.ant-select-item-option-content' }));
  fireEvent.click(screen.getByRole('button', { name: 'Add filter' }));
  expect(onFilter).toHaveBeenCalledWith('host = "a,b"');
  expect(screen.getByRole('combobox', { name: 'Label value' })).toHaveFocus();
  view.rerender(
    <I18nextProvider i18n={i18n}>
      <MetricLabelDiscovery {...props} filter={'zone="east"'} />
    </I18nextProvider>
  );
  fireEvent.click(screen.getByRole('button', { name: 'Add filter' }));
  expect(onFilter).toHaveBeenLastCalledWith('zone = "east" AND host = "a,b"');
  expect(onFilter).toHaveBeenCalledTimes(2);
});

it('preserves advanced raw text and explains its boundary', () => {
  const onFilter = vi.fn();
  const raw = 'host=~"a.*"';
  render(
    <I18nextProvider i18n={i18n}>
      <MetricLabelDiscovery
        filter={raw}
        onFilter={onFilter}
        labelKeys={{ state: 'ready', items: ['host'], truncated: false }}
      />
    </I18nextProvider>
  );
  expect(screen.getByText(i18n.t('explore.metricComposition.matcherRaw'))).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Add filter' })).toBeDisabled();
  expect(onFilter).not.toHaveBeenCalled();
});

it('edits one literal without replacing its sibling, then removes one and the last', () => {
  const onFilter = vi.fn();
  const keys = { state: 'ready' as const, items: ['host', 'zone'], truncated: false };
  const ui = (filter: string) => (
    <I18nextProvider i18n={i18n}>
      <MetricLabelDiscovery labelKeys={keys} filter={filter} onFilter={onFilter} />
    </I18nextProvider>
  );
  const view = render(ui('host="a",zone="east"'));
  fireEvent.change(screen.getByRole('textbox', { name: 'Value for host' }), { target: { value: 'new"\\' } });
  expect(onFilter).toHaveBeenLastCalledWith(`host = ${JSON.stringify('new"\\')} AND zone = "east"`);
  view.rerender(ui(String(onFilter.mock.calls.at(-1)?.[0])));
  fireEvent.click(screen.getByRole('button', { name: 'Remove host' }));
  expect(onFilter).toHaveBeenLastCalledWith('zone = "east"');
  view.rerender(ui('zone = "east"'));
  fireEvent.click(screen.getByRole('button', { name: 'Remove zone' }));
  expect(onFilter).toHaveBeenLastCalledWith('');
});

it('blocks duplicate fields and fixed scope, and clears selection when the row owner changes', () => {
  const onFilter = vi.fn();
  const props = {
    labelKeys: { state: 'ready' as const, items: ['host', 'service_name'], truncated: false },
    labelValues: { state: 'ready' as const, items: ['other'], truncated: false },
    selectedLabel: 'service_name',
    lockedLabels: ['service_name'],
    filter: 'host="a"',
    onFilter
  };
  const view = render(
    <I18nextProvider i18n={i18n}>
      <MetricLabelDiscovery {...props} discoveryIdentity="a" />
    </I18nextProvider>
  );
  fireEvent.mouseDown(screen.getByRole('combobox', { name: 'Label value' }));
  fireEvent.click(screen.getByText('other', { selector: '.ant-select-item-option-content' }));
  expect(screen.getByRole('button', { name: 'Add filter' })).toBeDisabled();
  expect(screen.getByText(i18n.t('explore.metricComposition.matcherLocked'))).toBeInTheDocument();
  view.rerender(
    <I18nextProvider i18n={i18n}>
      <MetricLabelDiscovery {...props} selectedLabel="host" discoveryIdentity="b" />
    </I18nextProvider>
  );
  expect(screen.getByText(i18n.t('explore.metricComposition.matcherDuplicate'))).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Add filter' })).toBeDisabled();
  expect(onFilter).not.toHaveBeenCalled();
});

it('keeps Enter and composing Enter in a matcher value from submitting its host form', () => {
  const onSubmit = vi.fn((event: FormEvent) => {
    event.preventDefault();
  });
  render(
    <I18nextProvider i18n={i18n}>
      <form onSubmit={onSubmit}>
        <MetricLabelDiscovery
          labelKeys={{ state: 'ready', items: ['host'], truncated: false }}
          filter={'host="a"'}
          onFilter={vi.fn()}
        />
      </form>
    </I18nextProvider>
  );
  const input = screen.getByRole('textbox', { name: 'Value for host' });
  expect(fireEvent.keyDown(input, { key: 'Enter', code: 'Enter', cancelable: true })).toBe(false);
  fireEvent.compositionStart(input);
  expect(fireEvent.keyDown(input, { key: 'Enter', code: 'Enter', isComposing: true, cancelable: true })).toBe(false);
  fireEvent.compositionEnd(input);
  expect(onSubmit).not.toHaveBeenCalled();
});
