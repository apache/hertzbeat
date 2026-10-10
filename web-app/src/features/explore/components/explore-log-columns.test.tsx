/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License.  You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { beforeAll, afterEach, it, expect, vi } from 'vitest';
import { I18nextProvider } from 'react-i18next';
import { initializeI18n, loadLocale, i18n } from '@/core/i18n/i18n';
import { ExploreLogColumns } from './explore-log-columns';
import { InspectorFields } from './explore-log-inspector-fields';
import { logInspectorFields } from './explore-log-inspector-model';
import { DEFAULT_LOG_COLUMNS, type LogColumn } from '../model/explore-log-columns';
import type { LogRow } from '../model/explore-signal-contract';
beforeAll(async () => {
  await initializeI18n();
  await loadLocale('en-US');
});
afterEach(cleanup);
it('adds an exact field and leaves column order actions to the header menu', async () => {
  const onColumnsChange = vi.fn();
  const field = { kind: 'field', scope: 'resource', path: ['service.name'] } as const;
  render(
    <I18nextProvider i18n={i18n}>
      <ExploreLogColumns
        controls={{ columns: [{ kind: 'time' }, { kind: 'message' }], onColumnsChange }}
        availableColumns={[{ ...field, path: [...field.path] }]}
      />
    </I18nextProvider>
  );
  expect(screen.getByRole('group', { name: 'Columns' })).toBeInTheDocument();
  expect(screen.getByRole('status')).toHaveTextContent('No optional columns selected.');
  const addColumn = screen.getByRole('combobox', { name: 'Add a column' });
  fireEvent.mouseDown(addColumn);
  await screen.findByRole('option', { name: 'resource["service.name"]' });
  fireEvent.click(screen.getByText('resource["service.name"]'));
  expect(onColumnsChange).toHaveBeenLastCalledWith([
    { kind: 'time' },
    { kind: 'message' },
    { ...field, path: [...field.path] }
  ]);
  expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /Move .+ earlier/ })).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /Move .+ later/ })).not.toBeInTheDocument();
});
it('removes selected optional columns while retaining date and message descriptors', () => {
  const onColumnsChange = vi.fn();
  render(
    <I18nextProvider i18n={i18n}>
      <ExploreLogColumns controls={{ columns: DEFAULT_LOG_COLUMNS, onColumnsChange }} />
    </I18nextProvider>
  );
  fireEvent.click(screen.getByRole('button', { name: 'Remove Service' }));
  expect(onColumnsChange).toHaveBeenCalledWith([{ kind: 'time' }, { kind: 'severity' }, { kind: 'message' }]);
});
it('disables adding at the column cap and hides Date/Content from optional columns', () => {
  const onColumnsChange = vi.fn();
  const columns: LogColumn[] = [
    ...DEFAULT_LOG_COLUMNS,
    { kind: 'traceId' },
    { kind: 'spanId' },
    { kind: 'field', scope: 'resource', path: ['host.name'] },
    { kind: 'field', scope: 'attributes', path: ['env'] }
  ];
  render(
    <I18nextProvider i18n={i18n}>
      <ExploreLogColumns
        controls={{ columns, onColumnsChange }}
        availableColumns={[{ kind: 'field', scope: 'attributes', path: ['region'] }]}
      />
    </I18nextProvider>
  );
  expect(screen.getByRole('combobox', { name: 'Add a column' })).toBeDisabled();
  expect(screen.queryByText('Time')).not.toBeInTheDocument();
  expect(screen.queryByText('Message')).not.toBeInTheDocument();
  expect(onColumnsChange).not.toHaveBeenCalled();
});
it('attaches distinct field column actions to literal dotted and nested paths', async () => {
  const row = {
    body: 'message',
    resource: { 'service.name': 'literal', service: { name: 'nested' } }
  } as unknown as LogRow;
  const onColumnsChange = vi.fn();
  render(
    <I18nextProvider i18n={i18n}>
      <InspectorFields
        row={row}
        search=""
        setSearch={() => {}}
        matchIndex={0}
        setMatchIndex={() => {}}
        fields={logInspectorFields(row)}
        logColumns={{ columns: DEFAULT_LOG_COLUMNS, onColumnsChange }}
      />
    </I18nextProvider>
  );
  fireEvent.click(screen.getByRole('button', { name: 'Field actions: resource["service.name"]' }));
  fireEvent.click(
    within(await screen.findByRole('menu', { name: 'Field actions: resource["service.name"]' })).getByRole('menuitem', {
      name: 'Add as column'
    })
  );
  expect(onColumnsChange).toHaveBeenLastCalledWith([
    ...DEFAULT_LOG_COLUMNS,
    { kind: 'field', scope: 'resource', path: ['service.name'] }
  ]);
  fireEvent.click(screen.getByRole('button', { name: 'Field actions: resource["service"]["name"]' }));
  fireEvent.click(
    within(await screen.findByRole('menu', { name: 'Field actions: resource["service"]["name"]' })).getByRole(
      'menuitem',
      { name: 'Add as column' }
    )
  );
  expect(onColumnsChange).toHaveBeenLastCalledWith([
    ...DEFAULT_LOG_COLUMNS,
    { kind: 'field', scope: 'resource', path: ['service', 'name'] }
  ]);
});
it('keeps column and filter controls in one semantic action cell beside their field value', () => {
  const row = { resource: { 'service.name': 'checkout' } } as unknown as LogRow;
  const { container } = render(
    <I18nextProvider i18n={i18n}>
      <InspectorFields
        row={row}
        search=""
        setSearch={() => {}}
        matchIndex={0}
        setMatchIndex={() => {}}
        fields={logInspectorFields(row)}
        logColumns={{ columns: DEFAULT_LOG_COLUMNS, onColumnsChange: vi.fn() }}
        onAddLogFilter={vi.fn()}
      />
    </I18nextProvider>
  );
  const field = container.querySelector('[data-field="resource.service.name"]');
  expect(field).not.toBeNull();
  expect(field).toHaveTextContent('checkout');
  expect(field!.querySelectorAll('button')).toHaveLength(1);
});
