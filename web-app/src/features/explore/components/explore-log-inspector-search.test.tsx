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

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { afterEach, beforeAll, expect, it, vi } from 'vitest';
import { i18n, initializeI18n, loadLocale } from '@/core/i18n/i18n';
import { ExploreLogInspector } from './explore-log-inspector';
import { logInspectorFields } from './explore-log-inspector-model';
import type { LogRow } from '../model/explore-signal-contract';

const row: LogRow = {
  logRecordUid: null,
  observedTimeUnixNano: null,
  severityNumber: null,
  severityText: null,
  droppedAttributesCount: null,
  traceId: null,
  spanId: null,
  traceFlags: null,
  resourceSchemaUrl: null,
  scopeSchemaUrl: null,
  body: 'Failed request',
  timeUnixNano: '1788788721229000000',
  resource: { 'service.name': 'checkout', host: 'node-a' },
  attributes: { 'http.status': 500 },
  instrumentationScope: { name: 'otel', version: null, attributes: null, droppedAttributesCount: 0 }
};
beforeAll(async () => {
  await initializeI18n();
  await loadLocale('en-US');
});
afterEach(cleanup);
it('searches literal field names and values while preserving full JSON and clearing empty matches', () => {
  render(
    <I18nextProvider i18n={i18n}>
      <ExploreLogInspector
        id="search"
        row={row}
        selectedIndex={0}
        rowCount={1}
        evidenceCurrent
        onSelectIndex={() => {}}
        onClose={() => {}}
      />
    </I18nextProvider>
  );
  const search = screen.getByRole('textbox', { name: 'Search fields in this log' });
  fireEvent.change(search, { target: { value: 'CHECKOUT' } });
  expect(screen.getByText('checkout')).toBeInTheDocument();
  expect(screen.getByText('node-a')).toBeInTheDocument();
  fireEvent.change(search, { target: { value: '[nomatch]' } });
  expect(screen.getByText('No fields match your search.')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Clear field search' }));
  expect(screen.getByText('node-a')).toBeInTheDocument();
  fireEvent.change(search, { target: { value: 'checkout' } });
  fireEvent.click(screen.getByRole('tab', { name: 'JSON' }));
  expect(screen.getByText(/http.status/)).toHaveTextContent('500');
  fireEvent.click(screen.getByRole('tab', { name: 'Fields' }));
  expect(screen.getByRole('textbox', { name: 'Search fields in this log' })).toHaveValue('checkout');
  expect(screen.getByText('node-a')).toBeInTheDocument();
});
it('maps raw paths to only the actions that the backend supports', () => {
  const fields = logInspectorFields(row);
  expect(fields.find(field => field.key === 'message')).toMatchObject({ path: ['body'], column: { kind: 'message' } });
  expect(fields.find(field => field.key === 'time')).toMatchObject({
    path: ['timeUnixNano'],
    column: { kind: 'time' }
  });
  expect(fields.find(field => field.key === 'severity')).toMatchObject({
    path: ['severityText'],
    column: { kind: 'severity' }
  });
  expect(fields.find(field => field.key === 'attributes.http.status')).toMatchObject({
    path: ['attributes', 'http.status']
  });
  expect(fields.find(field => field.key === 'timeUnixNano')).toBeUndefined();
});

it('uses controlled pending state and query callback while respecting bound service filters', async () => {
  const apply = vi.fn();
  const add = vi.fn().mockReturnValue(true);
  render(
    <I18nextProvider i18n={i18n}>
      <ExploreLogInspector
        id="pending"
        row={row}
        selectedIndex={0}
        rowCount={1}
        evidenceCurrent
        onSelectIndex={() => {}}
        onClose={() => {}}
        logFilterPending
        logFilterScope={{ serviceName: 'checkout' }}
        onAddLogFilter={add}
        onApplyLogFilters={apply}
      />
    </I18nextProvider>
  );
  expect(screen.getByText('Query applies current changes.')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Field actions: resource.service.name' }));
  const locked = await screen.findByRole('menuitem', { name: /Include resource.service.name/ });
  expect(locked).toHaveAttribute('aria-disabled', 'true');
  fireEvent.click(locked);
  expect(add).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Field actions: attributes.http.status' }));
  fireEvent.click(await screen.findByRole('menuitem', { name: 'Include @http.status' }));
  expect(add).toHaveBeenCalledTimes(1);
  expect(add).toHaveBeenCalledWith({ scope: 'attribute', key: 'http.status', value: '500' }, '=');
  expect(screen.getByRole('dialog')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: i18n.t('common.query') }));
  expect(apply).toHaveBeenCalledTimes(1);
  fireEvent.click(screen.getByRole('tab', { name: 'JSON' }));
  expect(screen.getByText('Query applies current changes.')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: i18n.t('common.query') })).toBeInTheDocument();
  expect(screen.getByRole('dialog')).toBeInTheDocument();
});

it.each([
  [
    'scope',
    { logFilterScope: { serviceName: 'checkout' } },
    'Include resource.service.name',
    'explore.perses.scopeLockedFilter'
  ],
  [
    'duplicate',
    { logFilterDraft: { attributeFilter: 'http.status = "400"' } },
    'Include @http.status',
    'explore.perses.editExistingFilter'
  ]
] as const)('makes the %s disabled reason keyboard accessible', async (_kind, controls, action, reasonKey) => {
  const add = vi.fn(() => true);
  render(
    <I18nextProvider i18n={i18n}>
      <ExploreLogInspector
        id="reason"
        row={row}
        selectedIndex={0}
        rowCount={1}
        evidenceCurrent
        onSelectIndex={() => {}}
        onClose={() => {}}
        onAddLogFilter={add}
        {...controls}
      />
    </I18nextProvider>
  );
  const field = action === 'Include resource.service.name' ? 'resource.service.name' : 'attributes.http.status';
  const trigger = screen.getByRole('button', { name: `Field actions: ${field}` });
  trigger.focus();
  expect(trigger).toHaveFocus();
  fireEvent.click(trigger);
  const item = await screen.findByRole('menuitem', { name: new RegExp(action) });
  expect(item).toHaveAttribute('aria-disabled', 'true');
  expect(item).toHaveTextContent(i18n.t(reasonKey));
  fireEvent.click(item);
  expect(add).not.toHaveBeenCalled();
});

it('mounts optional nearby context only while its tab is selected', () => {
  const mounted = vi.fn();
  function Context() {
    mounted();
    return <p>Nearby records</p>;
  }
  render(
    <I18nextProvider i18n={i18n}>
      <ExploreLogInspector
        id="nearby"
        row={row}
        selectedIndex={0}
        rowCount={1}
        evidenceCurrent
        onSelectIndex={() => {}}
        onClose={() => {}}
        context={<Context />}
      />
    </I18nextProvider>
  );
  expect(mounted).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('tab', { name: 'Context' }));
  expect(screen.getByRole('tab', { name: 'Context' })).toHaveAttribute('aria-selected', 'true');
  expect(screen.getByText('Nearby records')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('tab', { name: 'Fields' }));
  expect(screen.getByRole('tab', { name: 'Fields' })).toHaveAttribute('aria-selected', 'true');
  expect(screen.queryByText('Nearby records')).not.toBeInTheDocument();
});

it('keeps the typed JSON tree visible while navigating field search hits', () => {
  render(
    <I18nextProvider i18n={i18n}>
      <ExploreLogInspector
        id="tree"
        row={{ ...row, attributes: { auth: { enabled: false, retries: 0, tags: ['blue', null] }, message: 'blue' } }}
        selectedIndex={0}
        rowCount={1}
        evidenceCurrent
        onSelectIndex={() => {}}
        onClose={() => {}}
      />
    </I18nextProvider>
  );
  expect(screen.getAllByText('object', { exact: true }).length).toBeGreaterThan(0);
  expect(screen.getByText('array[2]')).toBeInTheDocument();
  expect(screen.getByText('false')).toBeInTheDocument();
  const search = screen.getByRole('textbox', { name: 'Search fields in this log' });
  fireEvent.change(search, { target: { value: 'blue' } });
  expect(screen.getByRole('status', { name: 'Field search matches' })).toHaveTextContent('1 / 2');
  expect(screen.getByText('false')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Next field match' }));
  expect(screen.getByRole('status', { name: 'Field search matches' })).toHaveTextContent('2 / 2');
  fireEvent.click(screen.getByRole('button', { name: 'Previous field match' }));
  expect(screen.getByRole('status', { name: 'Field search matches' })).toHaveTextContent('1 / 2');
});
