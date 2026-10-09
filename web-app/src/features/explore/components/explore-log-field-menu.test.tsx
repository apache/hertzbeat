/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import { beforeAll, afterEach, expect, it, vi } from 'vitest';
import { useEffect } from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { i18n, initializeI18n, loadLocale } from '@/core/i18n/i18n';
import type { LogRow } from '../model/explore-signal-contract';
import { logInspectorFields } from './explore-log-inspector-model';
import { InspectorFields } from './explore-log-inspector-fields';
import { LogFieldMenu } from './explore-log-field-menu';
import { LogFacetVisibilityContext } from './explore-log-facet-visibility-context';
import { useLogCalculatedFromField } from './explore-log-calculated-from-field-context';
import { LogCalculatedFromFieldProvider } from './explore-log-calculated-from-field-provider';

beforeAll(async () => {
  await initializeI18n();
  await loadLocale('en-US');
});
afterEach(cleanup);
function renderFields(
  row: LogRow,
  onAddLogFilter?: Parameters<typeof InspectorFields>[0]['onAddLogFilter'],
  onAnalyzeLogField?: Parameters<typeof InspectorFields>[0]['onAnalyzeLogField']
) {
  return render(
    <I18nextProvider i18n={i18n}>
      <InspectorFields
        row={row}
        fields={logInspectorFields(row)}
        search=""
        setSearch={() => {}}
        matchIndex={0}
        setMatchIndex={() => {}}
        logFilterDraft={{ searchSyntax: 'structured-v1' }}
        onAddLogFilter={onAddLogFilter}
        onAnalyzeLogField={onAnalyzeLogField}
      />
    </I18nextProvider>
  );
}
it('uses the actual dotted attribute path for filtering and copying key:value', async () => {
  const add = vi.fn(() => true);
  const writeText = vi.fn().mockResolvedValue(undefined);
  Object.assign(navigator, { clipboard: { writeText } });
  renderFields({ attributes: { 'http.route': '/checkout' } } as unknown as LogRow, add);
  const trigger = screen.getByRole('button', { name: 'Field actions: attributes.http.route' });
  fireEvent.click(trigger);
  fireEvent.click(await screen.findByRole('menuitem', { name: 'Include @http.route' }));
  expect(add).toHaveBeenCalledWith({ scope: 'attribute', key: 'http.route', value: '/checkout' }, '=');
  fireEvent.click(trigger);
  fireEvent.click(await screen.findByRole('menuitem', { name: 'Copy key and value' }));
  await waitFor(() => expect(writeText).toHaveBeenCalledWith('attributes.http.route:/checkout'));
});

it('uses canonical query field names in filter and analysis action labels', async () => {
  renderFields(
    { attributes: { 'event.name': 'codex.api_request' } } as unknown as LogRow,
    vi.fn(() => true),
    vi.fn(() => true)
  );
  fireEvent.click(screen.getByRole('button', { name: 'Field actions: attributes.event.name' }));
  expect(await screen.findByRole('menuitem', { name: 'Include @event.name' })).toBeInTheDocument();
  expect(screen.getByRole('menuitem', { name: 'Exclude @event.name' })).toBeInTheDocument();
  expect(screen.getByRole('menuitem', { name: 'Graph @event.name' })).toBeInTheDocument();
  expect(screen.getByRole('menuitem', { name: 'Group by @event.name' })).toBeInTheDocument();
});

it('opens calculation from an attribute field with its formula identifier and log context', async () => {
  const row = { attributes: { 'event.name': 'codex.api_request' } } as unknown as LogRow;
  function RequestProbe() {
    const request = useLogCalculatedFromField()?.request;
    return <output data-testid="calculated-request">{request ? JSON.stringify(request) : ''}</output>;
  }
  render(
    <I18nextProvider i18n={i18n}>
      <LogCalculatedFromFieldProvider enabled identity="logs-scope-a">
        <RequestProbe />
        <InspectorFields
          row={row}
          fields={logInspectorFields(row)}
          search=""
          setSearch={() => {}}
          matchIndex={0}
          setMatchIndex={() => {}}
        />
      </LogCalculatedFromFieldProvider>
    </I18nextProvider>
  );
  fireEvent.click(screen.getByRole('button', { name: 'Field actions: attributes.event.name' }));
  fireEvent.click(await screen.findByRole('menuitem', { name: i18n.t('explore.logFieldMenu.calculateField') }));
  expect(JSON.parse(screen.getByTestId('calculated-request').textContent ?? '')).toMatchObject({
    expression: '@event.name',
    row: { attributes: { 'event.name': 'codex.api_request' } }
  });
});

it('opens calculation for scalar resource fields using a typed resource reference', async () => {
  const row = { attributes: { status: 'ready' }, resource: { host: 'node-1' } } as unknown as LogRow;
  function RequestProbe() {
    const request = useLogCalculatedFromField()?.request;
    return <output data-testid="calculated-request">{request ? JSON.stringify(request) : ''}</output>;
  }
  render(
    <I18nextProvider i18n={i18n}>
      <LogCalculatedFromFieldProvider enabled identity="logs-scope-a">
        <RequestProbe />
        <InspectorFields
          row={row}
          fields={logInspectorFields(row)}
          search=""
          setSearch={() => {}}
          matchIndex={0}
          setMatchIndex={() => {}}
        />
      </LogCalculatedFromFieldProvider>
    </I18nextProvider>
  );
  fireEvent.click(screen.getByRole('button', { name: 'Field actions: resource.host' }));
  fireEvent.click(await screen.findByRole('menuitem', { name: i18n.t('explore.logFieldMenu.calculateField') }));
  expect(JSON.parse(screen.getByTestId('calculated-request').textContent ?? '')).toMatchObject({
    expression: 'resource("host")',
    row: { resource: { host: 'node-1' } }
  });
});

it('does not offer calculation while calculated fields are disabled', () => {
  const row = { attributes: { status: 'ready' } } as unknown as LogRow;
  render(
    <I18nextProvider i18n={i18n}>
      <LogCalculatedFromFieldProvider enabled={false} identity="logs-scope-a">
        <InspectorFields
          row={row}
          fields={logInspectorFields(row)}
          search=""
          setSearch={() => {}}
          matchIndex={0}
          setMatchIndex={() => {}}
        />
      </LogCalculatedFromFieldProvider>
    </I18nextProvider>
  );
  fireEvent.click(screen.getByRole('button', { name: 'Field actions: attributes.status' }));
  expect(screen.queryByRole('menuitem', { name: i18n.t('explore.logFieldMenu.calculateField') })).toBeNull();
});

it('clears a field request across scope changes without remounting its children', () => {
  let mounts = 0;
  function Probe() {
    const calculated = useLogCalculatedFromField();
    useEffect(() => {
      mounts++;
    }, []);
    return (
      <>
        <button onClick={() => calculated?.open('@status', { attributes: { status: 'ready' } } as unknown as LogRow)}>
          Open from field
        </button>
        <output data-testid="scope-request">{calculated?.request?.expression ?? ''}</output>
      </>
    );
  }
  const children = (
    <I18nextProvider i18n={i18n}>
      <Probe />
    </I18nextProvider>
  );
  const view = render(
    <LogCalculatedFromFieldProvider enabled identity="scope-a">
      {children}
    </LogCalculatedFromFieldProvider>
  );
  fireEvent.click(screen.getByRole('button', { name: 'Open from field' }));
  expect(screen.getByTestId('scope-request')).toHaveTextContent('@status');
  view.rerender(
    <LogCalculatedFromFieldProvider enabled identity="scope-b">
      {children}
    </LogCalculatedFromFieldProvider>
  );
  expect(screen.getByTestId('scope-request')).toBeEmptyDOMElement();
  view.rerender(
    <LogCalculatedFromFieldProvider enabled identity="scope-a">
      {children}
    </LogCalculatedFromFieldProvider>
  );
  expect(screen.getByTestId('scope-request')).toBeEmptyDOMElement();
  expect(mounts).toBe(1);
});

it('does not offer field calculation when inspector evidence is stale', () => {
  const row = { attributes: { status: 'ready' } } as unknown as LogRow;
  render(
    <I18nextProvider i18n={i18n}>
      <LogCalculatedFromFieldProvider enabled identity="logs-scope-a">
        <InspectorFields
          row={row}
          fields={logInspectorFields(row)}
          search=""
          setSearch={() => {}}
          matchIndex={0}
          setMatchIndex={() => {}}
          allowCalculatedField={false}
        />
      </LogCalculatedFromFieldProvider>
    </I18nextProvider>
  );
  fireEvent.click(screen.getByRole('button', { name: 'Field actions: attributes.status' }));
  expect(screen.queryByRole('menuitem', { name: i18n.t('explore.logFieldMenu.calculateField') })).toBeNull();
});
it('shows empty string and null distinctly, with copy on both rows', async () => {
  const writeText = vi.fn().mockResolvedValue(undefined);
  Object.assign(navigator, { clipboard: { writeText } });
  renderFields({ attributes: { empty: '', absent: null } } as unknown as LogRow);
  expect(screen.getByText('""')).toBeInTheDocument();
  expect(screen.getByText('null', { exact: true })).toBeInTheDocument();
  const trigger = screen.getByRole('button', { name: 'Field actions: attributes.absent' });
  fireEvent.click(trigger);
  fireEvent.click(await screen.findByRole('menuitem', { name: i18n.t('explore.logFieldMenu.copy') }));
  await waitFor(() => expect(writeText).toHaveBeenCalledWith('null'));
  cleanup();
  writeText.mockClear();
  renderFields({ body: null } as LogRow);
  fireEvent.click(screen.getByRole('button', { name: 'Field actions: body' }));
  fireEvent.click(await screen.findByRole('menuitem', { name: i18n.t('explore.logFieldMenu.copy') }));
  await waitFor(() => expect(writeText).toHaveBeenCalledWith('null'));
});
it('opens long values without stretching the tree row', async () => {
  const value = `--command=${'argument '.repeat(45)}`;
  renderFields({ resource: { 'process.command_args': value } } as unknown as LogRow);
  fireEvent.click(screen.getByRole('button', { name: i18n.t('explore.logFieldMenu.viewFull') }));
  expect(await screen.findByRole('dialog', { name: 'resource.process.command_args' })).toHaveTextContent(value);
});

it('opens actions from the field row and places copy first', async () => {
  renderFields(
    { attributes: { status: 'ready' } } as unknown as LogRow,
    vi.fn(() => true)
  );
  fireEvent.click(screen.getByText('status'));
  const menu = await screen.findByRole('menu');
  expect(screen.getAllByRole('menuitem')[0]).toHaveTextContent(i18n.t('explore.logFieldMenu.copy'));
  expect(menu).toHaveTextContent(i18n.t('explore.logFieldMenu.replaceFilter'));
});

it('offers a nested collection filter from the exact tree path', async () => {
  const add = vi.fn(() => true);
  renderFields({ attributes: { users: { 'codes.v': 4 } } } as unknown as LogRow, add);
  fireEvent.click(screen.getByRole('button', { name: 'Field actions: attributes.users.codes.v' }));
  fireEvent.click(await screen.findByRole('menuitem', { name: /Include users/ }));
  expect(add).toHaveBeenCalledWith(
    { scope: 'attribute', key: 'users', children: ['codes.v'], collection: true, value: '4', valueKind: 'number' },
    '='
  );
});

it('uses wildcard collection targets for array values and explains unsupported nested booleans', async () => {
  const add = vi.fn(() => true);
  renderFields({ attributes: { tags: ['ready'], flags: { active: true } } } as unknown as LogRow, add);
  fireEvent.click(screen.getByRole('button', { name: 'Field actions: attributes.tags.0' }));
  fireEvent.click(await screen.findByRole('menuitem', { name: /Include tags/ }));
  expect(add).toHaveBeenCalledWith(
    { scope: 'attribute', key: 'tags', children: [], collection: true, value: 'ready', valueKind: 'string' },
    '='
  );
  fireEvent.click(screen.getByRole('button', { name: 'Field actions: attributes.flags.active' }));
  const include = await screen.findByRole('menuitem', { name: /Include flags/ });
  expect(include).toHaveAttribute('aria-disabled', 'true');
  expect(include).toHaveTextContent(i18n.t('explore.logFieldMenu.filterUnsupported'));
});

it('adds only catalog-backed scalar fields to the filter rail', async () => {
  const add = vi.fn(() => true);
  const context = {
    visible: true,
    toggle: vi.fn(),
    availableFacetIds: ['attribute:status'],
    displayedFacetIds: [],
    addedFacetIds: [],
    expandedFacetIds: [],
    setAvailableFacetIds: vi.fn(),
    onAddFacet: add,
    removeFacet: vi.fn(() => true),
    toggleFacet: vi.fn()
  };
  const row = { attributes: { status: 'ready' } } as unknown as LogRow;
  const view = render(
    <I18nextProvider i18n={i18n}>
      <LogFacetVisibilityContext.Provider value={context}>
        <InspectorFields
          row={row}
          fields={logInspectorFields(row)}
          search=""
          setSearch={() => {}}
          matchIndex={0}
          setMatchIndex={() => {}}
        />
      </LogFacetVisibilityContext.Provider>
    </I18nextProvider>
  );
  fireEvent.click(screen.getByRole('button', { name: 'Field actions: attributes.status' }));
  fireEvent.click(await screen.findByRole('menuitem', { name: i18n.t('explore.logFieldMenu.addToFilterRail') }));
  expect(add).toHaveBeenCalledWith({ source: 'attribute', key: 'status', id: 'attribute:status' });
  view.rerender(
    <I18nextProvider i18n={i18n}>
      <LogFacetVisibilityContext.Provider value={{ ...context, availableFacetIds: [] }}>
        <InspectorFields
          row={row}
          fields={logInspectorFields(row)}
          search=""
          setSearch={() => {}}
          matchIndex={0}
          setMatchIndex={() => {}}
        />
      </LogFacetVisibilityContext.Provider>
    </I18nextProvider>
  );
  fireEvent.click(screen.getByRole('button', { name: 'Field actions: attributes.status' }));
  expect(await screen.findByRole('menuitem', { name: /Add to filter rail/ })).toHaveAttribute('aria-disabled', 'true');
});

it.each([
  ['trace_id', 'traceId'],
  ['span_id', 'spanId']
] as const)('labels built-in %s filter actions as %s', async (key, labelKey) => {
  const onAddLogFilter = vi.fn(() => true);
  const value = 'a'.repeat(labelKey === 'traceId' ? 32 : 16);
  render(
    <I18nextProvider i18n={i18n}>
      <LogFieldMenu
        field={{ key: labelKey, value, filter: { scope: 'builtin', key, value } }}
        logFilterDraft={{ searchSyntax: 'structured-v1' }}
        onAddLogFilter={onAddLogFilter}
      />
    </I18nextProvider>
  );
  fireEvent.click(screen.getByRole('button'));
  fireEvent.click(
    await screen.findByRole('menuitem', {
      name: i18n.t('explore.perses.includeField', { field: i18n.t(`explore.logColumns.fields.${labelKey}`) })
    })
  );
  expect(onAddLogFilter).toHaveBeenCalledWith({ scope: 'builtin', key, value }, '=');
});
