/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import { useState } from 'react';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeAll, expect, it, vi } from 'vitest';
import { i18n, initializeI18n, loadLocale } from '@/core/i18n/i18n';
import type { LogSearchSuggestion } from '../model/explore-log-search-authoring';
import { ExploreLogSearchInput } from './explore-log-search-input';
import { logSearchText, logSearchView } from './test-log-search-editor';

beforeAll(async () => {
  await initializeI18n();
  await loadLocale('en-US');
});
afterEach(cleanup);
const options: LogSearchSuggestion[] = [
  { value: 'service', label: 'service', fieldValue: false },
  { value: 'resource.service.name', label: 'resource.service.name', fieldValue: false },
  {
    value: 'HertzBeat',
    label: 'service:"HertzBeat"',
    condition: 'service:"HertzBeat"',
    insertion: 'service:"HertzBeat"',
    count: 598,
    fieldValue: true
  }
];
function Subject({
  initial = 'serv',
  field,
  items = options
}: {
  initial?: string;
  field?: string;
  items?: LogSearchSuggestion[];
}) {
  const [value, setValue] = useState(initial);
  return (
    <ExploreLogSearchInput
      value={value}
      syntax="structured-v1"
      onChange={setValue}
      t={i18n.t}
      suggestions={{ state: 'ready', field, options: items, requestField: vi.fn() }}
    />
  );
}
async function open() {
  const input = screen.getByRole<HTMLElement>('combobox', { name: i18n.t('explore.queryLabels.logs') });
  act(() => logSearchView(input).focus());
  await waitFor(() => expect(screen.getAllByRole('option')).toHaveLength(3));
  return input;
}
it('distinguishes field names from complete field-value suggestions without changing counts or sampling copy', async () => {
  render(<Subject />);
  await open();
  const entries = screen.getAllByRole('option');
  expect(within(entries[0]!).getByText(i18n.t('explore.logAuthoring.fieldName'))).toBeInTheDocument();
  expect(within(entries[1]!).getByText(i18n.t('explore.logAuthoring.fieldName'))).toBeInTheDocument();
  expect(within(entries[2]!).getByText(i18n.t('explore.logAuthoring.fieldValue'))).toBeInTheDocument();
  expect(within(entries[2]!).getByText('598')).toBeInTheDocument();
  expect(entries[0]).toHaveAccessibleName('service');
  expect(entries[0]).toHaveAccessibleDescription(i18n.t('explore.logAuthoring.fieldName'));
  expect(entries[2]).toHaveAccessibleName('service:"HertzBeat" 598');
  expect(entries[2]).toHaveAccessibleDescription(i18n.t('explore.logAuthoring.fieldValue'));
  expect(screen.getByText(i18n.t('explore.logAuthoring.scope'))).toBeInTheDocument();
});
it('emphasizes the case-insensitive caret prefix while preserving complete label text and insertion', async () => {
  render(<Subject initial="SERV" />);
  const input = await open();
  const entries = screen.getAllByRole('option');
  for (const entry of entries) expect(entry.querySelector('mark')).toHaveTextContent('serv');
  expect(entries[1]).toHaveTextContent('resource.service.name');
  fireEvent.click(entries[2]!);
  expect(logSearchText(input)).toBe('service:"HertzBeat"');
});
it('uses the value prefix for value completions and renders markup-like values as text', async () => {
  const value = '<serv & "value">';
  render(
    <Subject
      initial="service:serv"
      field="service"
      items={[{ value, label: value, condition: 'service:"<serv & \\"value\\">"', fieldValue: true }]}
    />
  );
  const input = screen.getByRole<HTMLElement>('combobox', { name: i18n.t('explore.queryLabels.logs') });
  act(() => logSearchView(input).focus());
  const option = await screen.findByRole('option');
  expect(option.querySelector('mark')).toHaveTextContent('serv');
  expect(option.querySelector('value')).toBeNull();
  fireEvent.click(option);
  expect(logSearchText(input)).toBe('service:"<serv & \\"value\\">"');
});
it.each(['en-US', 'zh-CN', 'zh-TW', 'ja-JP', 'pt-BR'] as const)(
  'resolves suggestion-kind labels in %s',
  async locale => {
    await loadLocale(locale);
    for (const key of ['fieldName', 'fieldValue'])
      expect(i18n.getResource(locale, 'translation', `explore.logAuthoring.${key}`)).toEqual(expect.any(String));
    await loadLocale('en-US');
  }
);
