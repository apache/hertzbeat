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

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeAll, expect, it, vi } from 'vitest';
import { I18nextProvider } from 'react-i18next';

import { i18n, initializeI18n, loadLocale } from '@/core/i18n/i18n';
import { loadLogFacetValues } from '../api/explore-log-facets-api';
import type { LogFacetField, LogFacetValuesResult } from '../model/explore-log-facets';
import { ExploreWorkspaceFacetValues } from '../pages/explore-workspace-facet-values';
import { ExploreLogFacets, type ExploreLogFacetsProps } from './explore-log-facets';
import { LogFacetVisibilityContext } from './explore-log-facet-visibility-context';
import { useLogFacetWorkspace } from '../controller/use-log-facet-workspace';
import { LogFieldMenu } from './explore-log-field-menu';
import { FacetValues } from './explore-log-facet-values';

vi.mock('../api/explore-log-facets-api', async original => ({
  ...(await original<typeof import('../api/explore-log-facets-api')>()),
  loadLogFacetValues: vi.fn()
}));

const host: LogFacetField = { id: 'resource:host.name', source: 'resource', key: 'host.name' };
const status: LogFacetField = { id: 'builtin:severityCategory', source: 'builtin', key: 'severityCategory' };
const region: LogFacetField = { id: 'resource:cloud.region', source: 'resource', key: 'cloud.region' };
const unknown: LogFacetField = { id: 'resource:unknown', source: 'resource', key: 'unknown' };
const query = { signal: 'logs' as const, query: '', timeRange: 'last-30m' as const, start: 1, end: 2 };
const fields: ExploreLogFacetsProps['fields'] = {
  state: 'ready',
  data: {
    state: 'ready',
    window: { start: 1, end: 2 },
    coverage: { mode: 'bounded_rows', rowLimit: 1000, scannedRows: 2, hasMore: false },
    fields: [host, status],
    truncated: false
  }
};

function valueResult(field: LogFacetField, search = ''): LogFacetValuesResult {
  const value = field.id === host.id ? 'host-one' : 'ERROR';
  const matches = !search || value.toLowerCase().includes(search.toLowerCase());
  return {
    state: 'ready',
    window: { start: 1, end: 2 },
    field,
    coverage: { mode: 'full_window' },
    matchedCount: 1,
    missingOrNullCount: 0,
    ...(search ? { search: { query: search, matchedCount: matches ? 1 : 0 } } : {}),
    values: matches ? [{ value, count: 1 }] : [],
    truncated: false
  };
}

function providers(children: ReactNode) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return (
    <QueryClientProvider client={client}>
      <I18nextProvider i18n={i18n}>{children}</I18nextProvider>
    </QueryClientProvider>
  );
}

function facetProps(
  override: Partial<ExploreLogFacetsProps> = {},
  scopedQuery: typeof query & { serviceName?: string } = query
): ExploreLogFacetsProps {
  const renderValues: ExploreLogFacetsProps['renderValues'] = (fieldId, fieldLabel) => (
    <ExploreWorkspaceFacetValues
      query={scopedQuery}
      result={{ kind: 'loading' }}
      fieldId={fieldId}
      fieldLabel={fieldLabel}
      available
      source="a"
      actionForValue={(_field, _value, operator) => ({
        disabled: operator === '!=',
        selected: false,
        onClick: vi.fn(),
        reason: operator === '!=' ? 'legacy-value' : undefined
      })}
    />
  );
  return {
    fields,
    onCatalogRetry: vi.fn(),
    renderValues,
    ...override
  };
}

beforeAll(async () => {
  await initializeI18n();
  await loadLocale('en-US');
});
afterEach(() => {
  cleanup();
  vi.resetAllMocks();
});

it('keeps facet actions without the redundant count and core heading', () => {
  render(providers(<ExploreLogFacets {...facetProps()} />));
  expect(screen.queryByText(i18n.t('explore.logFacets.fieldCount', { count: 2 }))).not.toBeInTheDocument();
  expect(screen.queryByRole('heading', { name: i18n.t('explore.logFacets.core.title') })).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: i18n.t('explore.logFacets.core.add') })).toBeVisible();
  expect(screen.getByRole('region', { name: 'Host' })).toBeVisible();
});

it('shows the applied invalid-pattern reason instead of stale field counts or generic facet failure', () => {
  render(
    <ExploreLogFacets
      {...facetProps({
        fields: { state: 'calculated_invalid_pattern' },
        extraFields: [{ id: 'calculated:token', label: '#token' }]
      })}
    />,
    { wrapper: ({ children }) => providers(children) }
  );
  expect(screen.getByRole('alert')).toHaveTextContent(i18n.t('explore.logCalculatedV2.queryInvalidPattern'));
  expect(screen.queryByText(i18n.t('explore.logFacets.states.error'))).not.toBeInTheDocument();
  expect(screen.queryByText(i18n.t('explore.logFacets.fieldCount', { count: 1 }))).not.toBeInTheDocument();
  expect(screen.queryByText('#token')).not.toBeInTheDocument();
});

it('toggles facet membership with a checkbox and selects one value by its label', () => {
  const toggle = vi.fn();
  const single = vi.fn();
  const actionForValue = vi.fn(
    (_field: LogFacetField, _value: string, operator: '=' | '!=', intent?: 'single' | 'toggle') => ({
      disabled: false,
      selected: operator === '=' && intent === 'toggle',
      onClick: intent === 'single' ? single : toggle
    })
  );
  render(
    providers(
      <FacetValues
        fieldId={host.id}
        fieldLabel="Host"
        values={{ state: 'ready', data: valueResult(host) }}
        valueSearch=""
        onValueSearchChange={vi.fn()}
        onRetry={vi.fn()}
        actionForValue={actionForValue}
      />
    )
  );
  const checkbox = screen.getByRole('checkbox', { name: i18n.t('explore.logFacets.include', { value: 'host-one' }) });
  expect(checkbox).toBeChecked();
  fireEvent.click(checkbox);
  expect(toggle).toHaveBeenCalledOnce();
  fireEvent.click(
    screen.getByRole('button', {
      name: i18n.t('explore.logFacets.onlyOrAll', { field: 'Host', value: 'host-one' })
    })
  );
  expect(single).toHaveBeenCalledOnce();
  expect(
    screen.queryByRole('button', { name: i18n.t('explore.logFacets.exclude', { value: 'host-one' }) })
  ).not.toBeInTheDocument();
  expect(actionForValue).toHaveBeenCalledWith(host, 'host-one', '=', 'toggle');
  expect(actionForValue).toHaveBeenCalledWith(host, 'host-one', '=', 'single');
});

it('keeps Status and Host expanded with independent values and searches; closed sections stop value reads', async () => {
  vi.mocked(loadLogFacetValues).mockImplementation((_path, _window, id, _signal, search) =>
    Promise.resolve(valueResult(id === host.id ? host : status, search))
  );
  const view = render(providers(<ExploreLogFacets {...facetProps()} />));
  const statusSection = screen.getByRole('region', { name: 'Status' });
  const hostSection = screen.getByRole('region', { name: 'Host' });
  expect(within(statusSection).getByRole('button', { name: 'Status' })).toHaveAttribute('aria-expanded', 'true');
  expect(within(hostSection).getByRole('button', { name: 'Host' })).toHaveAttribute('aria-expanded', 'false');
  await waitFor(() => expect(within(statusSection).getByText('ERROR')).toBeVisible());
  expect(loadLogFacetValues).toHaveBeenCalledTimes(1);
  fireEvent.click(within(hostSection).getByRole('button', { name: 'Host' }));
  await waitFor(() => expect(within(hostSection).getByText('host-one')).toBeVisible());
  expect(within(statusSection).getByRole('button', { name: 'Status' })).toHaveAttribute('aria-expanded', 'true');
  expect(loadLogFacetValues).toHaveBeenCalledTimes(2);
  fireEvent.change(within(hostSection).getByRole('textbox', { name: /Host Search all values/u }), {
    target: { value: 'host' }
  });
  expect(within(statusSection).getByRole('textbox', { name: /Status Search all values/u })).toHaveValue('');
  await waitFor(() => expect(vi.mocked(loadLogFacetValues).mock.calls.at(-1)?.[4]).toBe('host'));
  expect(within(statusSection).getByText('ERROR')).toBeVisible();
  view.rerender(providers(<ExploreLogFacets {...facetProps({}, { ...query, serviceName: 'checkout' })} />));
  expect(within(hostSection).getByRole('button', { name: 'Host' })).toHaveAttribute('aria-expanded', 'true');
  expect(within(statusSection).getByRole('button', { name: 'Status' })).toHaveAttribute('aria-expanded', 'true');
  expect(within(hostSection).getByRole('textbox', { name: /Host Search all values/u })).toHaveValue('');
  fireEvent.click(within(hostSection).getByRole('button', { name: 'Host' }));
  expect(within(hostSection).getByRole('button', { name: 'Host' })).toHaveAttribute('aria-expanded', 'false');
  const calls = vi.mocked(loadLogFacetValues).mock.calls.length;
  fireEvent.change(screen.getByRole('textbox', { name: i18n.t('explore.logFacets.searchFields') }), {
    target: { value: 'host' }
  });
  expect(loadLogFacetValues).toHaveBeenCalledTimes(calls);
});

it('adds only source-backed catalog fields and keeps unavailable catalog values hidden', () => {
  vi.mocked(loadLogFacetValues).mockResolvedValue(valueResult(status));
  const view = render(providers(<ExploreLogFacets {...facetProps()} />));
  const fieldLookup = screen.getByRole('textbox', { name: i18n.t('explore.logFacets.searchFields') });
  fireEvent.change(fieldLookup, { target: { value: 'host' } });
  fireEvent.click(
    within(screen.getByRole('list', { name: i18n.t('explore.logFacets.searchFields') })).getByRole('button', {
      name: 'resource.host.name'
    })
  );
  expect(screen.getByRole('button', { name: 'Host' })).toHaveAttribute('aria-expanded', 'true');
  view.rerender(providers(<ExploreLogFacets {...facetProps({ fields: { state: 'permission' } })} />));
  expect(screen.queryByRole('region', { name: 'Host' })).not.toBeInTheDocument();
  expect(screen.queryByText('host-one')).not.toBeInTheDocument();
});

it('shows query field names in the picker and removes added fields from the displayed facet list', () => {
  const catalog = { ...fields, data: { ...fields.data!, fields: [host, status, region] } };
  function Workspace() {
    const workspace = useLogFacetWorkspace();
    return (
      <LogFacetVisibilityContext.Provider value={workspace}>
        <output data-testid="displayed-facets">{workspace.displayedFacetIds.join(',')}</output>
        <ExploreLogFacets {...facetProps({ fields: catalog })} />
      </LogFacetVisibilityContext.Provider>
    );
  }
  render(providers(<Workspace />));
  const fieldLookup = screen.getByRole('textbox', { name: i18n.t('explore.logFacets.searchFields') });
  fireEvent.change(fieldLookup, { target: { value: 'cloud.region' } });
  fireEvent.click(
    within(screen.getByRole('list', { name: i18n.t('explore.logFacets.searchFields') })).getByRole('button', {
      name: 'resource.cloud.region'
    })
  );
  expect(screen.getByTestId('displayed-facets')).toHaveTextContent(region.id);
  const remove = screen.getByRole('button', {
    name: i18n.t('explore.logFacets.removeDisplayed', { field: 'resource.cloud.region' })
  });
  expect(remove).toBeVisible();
  fireEvent.click(remove);
  expect(screen.getByTestId('displayed-facets')).not.toHaveTextContent(region.id);
  expect(screen.queryByRole('region', { name: 'resource.cloud.region' })).not.toBeInTheDocument();
});

it('reveals and expands a catalog field from its details menu, including when the rail is hidden', async () => {
  const catalog = { ...fields, data: { ...fields.data!, fields: [host, status, region] } };
  function Workspace() {
    const workspace = useLogFacetWorkspace();
    return (
      <LogFacetVisibilityContext.Provider value={workspace}>
        <LogFieldMenu
          field={{ key: 'resource.cloud.region', value: 'east', analysis: { field: region, numeric: false } }}
        />
        <button onClick={() => workspace.onAddFacet(unknown)}>Add unavailable field</button>
        <button onClick={workspace.toggle}>Toggle facet rail</button>
        <output>{workspace.visible ? 'visible' : 'hidden'}</output>
        <output data-testid="displayed-facets">{workspace.displayedFacetIds.join(',')}</output>
        <ExploreLogFacets {...facetProps({ fields: catalog })} />
      </LogFacetVisibilityContext.Provider>
    );
  }
  render(providers(<Workspace />));
  expect(screen.queryByRole('region', { name: region.id })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Toggle facet rail' }));
  expect(screen.getByText('hidden')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Add unavailable field' }));
  expect(screen.getByText('hidden')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Field actions: resource.cloud.region' }));
  fireEvent.click(await screen.findByRole('menuitem', { name: i18n.t('explore.logFieldMenu.addToFilterRail') }));
  expect(screen.getByText('visible')).toBeInTheDocument();
  expect(screen.getByTestId('displayed-facets')).toHaveTextContent(region.id);
  expect(
    within(screen.getByRole('region', { name: 'resource.cloud.region' })).getByRole('button', {
      name: 'resource.cloud.region'
    })
  ).toHaveAttribute('aria-expanded', 'true');
});

it('expands Add field below its toolbar and closes it with Escape or selection', async () => {
  vi.mocked(loadLogFacetValues).mockResolvedValue(valueResult(status));
  render(providers(<ExploreLogFacets {...facetProps()} />));
  const add = screen.getByRole('button', { name: i18n.t('explore.logFacets.core.add') });
  expect(add).toHaveAttribute('aria-expanded', 'false');
  fireEvent.click(add);
  expect(add).toHaveAttribute('aria-expanded', 'true');
  const selector = screen.getByRole('combobox', { name: i18n.t('explore.logFacets.field') });
  expect(selector).toBeVisible();
  fireEvent.keyDown(selector, { key: 'Escape' });
  expect(add).toHaveAttribute('aria-expanded', 'false');
  expect(selector).not.toBeInTheDocument();
  expect(add).toHaveFocus();
  fireEvent.click(add);
  fireEvent.mouseDown(screen.getByRole('combobox', { name: i18n.t('explore.logFacets.field') }));
  fireEvent.click(screen.getByText('resource.host.name', { selector: '.ant-select-item-option-content' }));
  await waitFor(() => expect(add).toHaveAttribute('aria-expanded', 'false'));
  expect(add).toHaveFocus();
});

it('retries only the failed expanded section and keeps truncation visible in another', async () => {
  let hostAttempts = 0;
  vi.mocked(loadLogFacetValues).mockImplementation((_path, _window, id) => {
    if (id === host.id) {
      hostAttempts += 1;
      return hostAttempts === 1 ? Promise.reject(new Error('offline')) : Promise.resolve(valueResult(host));
    }
    return Promise.resolve({ ...valueResult(status), truncated: true });
  });
  render(providers(<ExploreLogFacets {...facetProps()} />));
  const statusSection = screen.getByRole('region', { name: 'Status' });
  const hostSection = screen.getByRole('region', { name: 'Host' });
  await waitFor(() => expect(within(statusSection).getByText(i18n.t('explore.logFacets.limited'))).toBeVisible());
  fireEvent.click(within(hostSection).getByRole('button', { name: 'Host' }));
  await waitFor(() => expect(within(hostSection).getByRole('alert')).toBeVisible());
  fireEvent.click(within(hostSection).getByRole('button', { name: i18n.t('common.retry') }));
  await waitFor(() => expect(within(hostSection).getByText('host-one')).toBeVisible());
  expect(vi.mocked(loadLogFacetValues).mock.calls.filter(call => call[2] === status.id)).toHaveLength(1);
  expect(vi.mocked(loadLogFacetValues).mock.calls.filter(call => call[2] === host.id)).toHaveLength(2);
});
