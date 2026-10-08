/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { useState } from 'react';
import { I18nextProvider } from 'react-i18next';
import { afterEach, beforeAll, expect, it, vi } from 'vitest';

import { i18n, initializeI18n, loadLocale } from '@/core/i18n/i18n';
import { defaultEntityQuery } from '../model/entity-view-model';
import { EntityListView, type EntityListViewProps } from './entity-list-view';

beforeAll(initializeI18n);
afterEach(cleanup);

it.each(['en-US', 'zh-CN'] as const)('selects a translated type as the same canonical value in %s', async locale => {
  await loadLocale(locale);
  await i18n.changeLanguage(locale);
  const changeFilter = renderFilters();
  const input = screen.getByRole<HTMLInputElement>('combobox', { name: i18n.t('entity.filters.type') });
  act(() => input.focus());
  fireEvent.mouseDown(input);
  fireEvent.change(input, { target: { value: i18n.t('entity.values.type.service') } });
  fireEvent.mouseDown(
    await screen.findByText(i18n.t('entity.values.type.service'), { selector: '.ant-select-item-option-content' })
  );
  fireEvent.click(
    screen.getByText(i18n.t('entity.values.type.service'), { selector: '.ant-select-item-option-content' })
  );
  await waitFor(() => expect(changeFilter).toHaveBeenLastCalledWith('type', 'service'));
  expect(input).toHaveValue('service');
  fireEvent.blur(input);
  expect(input).toHaveValue(i18n.t('entity.values.type.service'));
  expect(screen.getByText(i18n.t('entity.filters.type'), { selector: 'label' })).toBeVisible();
});

it('keeps unknown values editable and preserves the existing clear action', async () => {
  await loadLocale('en-US');
  await i18n.changeLanguage('en-US');
  const changeFilter = renderFilters({ query: { ...defaultEntityQuery, type: 'vendor_resource' } });
  const input = screen.getByRole<HTMLInputElement>('combobox', { name: 'Type' });
  expect(input).toHaveValue('vendor_resource');
  fireEvent.change(input, { target: { value: 'custom_type/v2' } });
  expect(changeFilter).toHaveBeenLastCalledWith('type', 'custom_type/v2');
  expect(input).toHaveValue('custom_type/v2');
  const clear = input.closest('.ant-select')?.querySelector('.ant-select-clear');
  expect(clear).toBeInTheDocument();
  const callsBeforeClear = changeFilter.mock.calls.length;
  fireEvent.mouseDown(clear!);
  fireEvent.click(clear!);
  expect(changeFilter).toHaveBeenCalledTimes(callsBeforeClear + 1);
  expect(changeFilter).toHaveBeenLastCalledWith('type', '');
  expect(input).toHaveValue('');
});

it('retains visible labels on filled primary and advanced filters', async () => {
  await loadLocale('en-US');
  await i18n.changeLanguage('en-US');
  renderFilters({ query: { ...defaultEntityQuery, status: 'healthy', owner: 'sre' } });
  fireEvent.click(screen.getByRole('button', { name: i18n.t('entity.filters.showAdvanced') }));
  for (const key of ['type', 'status', 'environment', 'owner', 'source', 'lifecycle', 'tier', 'system']) {
    const label = i18n.t(`entity.filters.${key}`);
    expect(screen.getByText(label, { selector: 'label' })).toBeVisible();
    expect(screen.getByLabelText(label)).toBeInTheDocument();
  }
});

it('offers canonical text search without translating a typed custom value automatically', async () => {
  await loadLocale('zh-CN');
  await i18n.changeLanguage('zh-CN');
  const changeFilter = renderFilters();
  const input = screen.getByRole<HTMLInputElement>('combobox', { name: i18n.t('entity.filters.type') });
  act(() => input.focus());
  fireEvent.mouseDown(input);
  fireEvent.change(input, { target: { value: 'serv' } });
  fireEvent.keyDown(input, { key: 'ArrowDown', keyCode: 40 });
  fireEvent.keyDown(input, { key: 'Enter', keyCode: 13 });
  await waitFor(() => expect(changeFilter).toHaveBeenLastCalledWith('type', 'service'));
  fireEvent.change(input, { target: { value: 'custom_type' } });
  fireEvent.change(input, { target: { value: i18n.t('entity.values.type.service') } });
  expect(changeFilter).toHaveBeenLastCalledWith('type', i18n.t('entity.values.type.service'));
});

it('shows the server total rather than the visible page length', async () => {
  await loadLocale('en-US');
  await i18n.changeLanguage('en-US');
  renderFilters({
    evidence: {
      kind: 'ready',
      total: 37,
      records: Array.from({ length: 10 }, (_, index) => ({
        id: index + 1,
        type: 'service',
        name: `resource-${index}`,
        identityCount: 0,
        monitorCount: 0,
        relationCount: 0,
        activeAlertCount: 0
      }))
    }
  });
  expect(screen.getByText(i18n.t('entity.results.total', { count: 37 }))).toBeVisible();
});

it.each(['service_custom', 'host_custom'])(
  'preserves each typed character of %s in the localized field',
  async value => {
    await loadLocale('zh-CN');
    await i18n.changeLanguage('zh-CN');
    const changeFilter = renderFilters();
    const input = screen.getByRole<HTMLInputElement>('combobox', { name: i18n.t('entity.filters.type') });
    act(() => input.focus());
    for (let index = 0; index < value.length; index += 1) {
      fireEvent.change(input, { target: { value: input.value + value[index] } });
      expect(input).toHaveValue(value.slice(0, index + 1));
      expect(changeFilter).toHaveBeenLastCalledWith('type', value.slice(0, index + 1));
    }
  }
);

it.each(['service', 'host'])('edits a displayed %s code as canonical text on focus', async value => {
  await loadLocale('zh-CN');
  await i18n.changeLanguage('zh-CN');
  const changeFilter = renderFilters({ query: { ...defaultEntityQuery, type: value } });
  const input = screen.getByRole<HTMLInputElement>('combobox', { name: i18n.t('entity.filters.type') });
  expect(input).toHaveValue(i18n.t(`entity.values.type.${value}`));
  act(() => input.focus());
  expect(input).toHaveValue(value);
  fireEvent.change(input, { target: { value: input.value.slice(0, -1) } });
  expect(changeFilter).toHaveBeenLastCalledWith('type', value.slice(0, -1));
  fireEvent.change(input, { target: { value: input.value + '_custom' } });
  expect(input).toHaveValue(value.slice(0, -1) + '_custom');
});

it('retains canonical preedit text through composition events', async () => {
  await loadLocale('zh-CN');
  await i18n.changeLanguage('zh-CN');
  const changeFilter = renderFilters();
  const input = screen.getByRole<HTMLInputElement>('combobox', { name: i18n.t('entity.filters.type') });
  act(() => input.focus());
  fireEvent.compositionStart(input);
  fireEvent.change(input, { target: { value: 'service' } });
  expect(input).toHaveValue('service');
  fireEvent.compositionUpdate(input, { data: '_custom' });
  fireEvent.change(input, { target: { value: 'service_custom' } });
  fireEvent.compositionEnd(input, { data: '_custom' });
  expect(input).toHaveValue('service_custom');
  expect(changeFilter).toHaveBeenLastCalledWith('type', 'service_custom');
});

function renderFilters(patch: Partial<EntityListViewProps['state']> = {}) {
  const changeFilter = vi.fn();
  function Probe() {
    const [query, setQuery] = useState(patch.query ?? defaultEntityQuery);
    const actions: EntityListViewProps['actions'] = {
      changeFilter: (key, value) => {
        changeFilter(key, value);
        setQuery(current => ({ ...current, [key]: value }));
      },
      updateDraft: vi.fn(),
      submit: vi.fn(),
      changeSort: vi.fn(),
      changePage: vi.fn(),
      refresh: vi.fn(),
      discover: vi.fn(),
      importDefinitions: vi.fn(),
      create: vi.fn(),
      open: vi.fn()
    };
    return (
      <EntityListView
        state={{ draft: '', evidence: { kind: 'empty' }, refreshing: false, canWrite: false, ...patch, query }}
        actions={actions}
      />
    );
  }
  render(
    <I18nextProvider i18n={i18n}>
      <Probe />
    </I18nextProvider>
  );
  return changeFilter;
}
