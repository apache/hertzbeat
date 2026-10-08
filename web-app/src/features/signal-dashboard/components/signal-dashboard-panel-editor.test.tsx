/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import { useState } from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeAll, expect, it } from 'vitest';
import { I18nextProvider } from 'react-i18next';
import { initializeI18n, loadLocale, i18n } from '@/core/i18n/i18n';
import { parseHertzBeatDashboardDocument, type HertzBeatDashboardDocument } from '@/platform/perses';
import fixture from '@/platform/perses/model/fixtures/supported-dashboard.json';
import { updateDashboardLayout } from '../model/signal-dashboard-authoring';
import { resolveDashboardPanelQuery } from '../model/dashboard-panel-query';
import type { DashboardPanelKind } from '../model/signal-dashboard-panels';
import { SignalDashboardPanelEditor } from './signal-dashboard-panel-editor';

const context = {
  serviceName: '${serviceName}',
  serviceNamespace: '${serviceNamespace}',
  environment: '${environment}',
  entityId: '42',
  entityType: 'service',
  collectorId: 'collector-1',
  instance: 'instance-1',
  endpoint: '/checkout'
};
const timeWindow = { from: 1788632760000, to: 1788632820000 };

beforeAll(async () => {
  await initializeI18n();
  await loadLocale('en-US');
});
afterEach(cleanup);

function editor(panelId: string) {
  const original = parseHertzBeatDashboardDocument(fixture);
  if (panelId !== 'trace') original.spec.panels[panelId]!.spec.queries[0].spec.plugin.spec.query.context = context;
  let current = original;
  function Harness() {
    const [document, setDocument] = useState(original);
    const update = (next: HertzBeatDashboardDocument) => {
      current = next;
      setDocument(next);
    };
    return <SignalDashboardPanelEditor document={document} panelId={panelId} update={update} disabled={false} />;
  }
  render(
    <I18nextProvider i18n={i18n}>
      <Harness />
    </I18nextProvider>
  );
  return { original, current: () => current };
}

async function selectKind(kind: DashboardPanelKind) {
  fireEvent.mouseDown(screen.getAllByRole('combobox')[0]!);
  fireEvent.click(
    await screen.findByText(i18n.t('signalDashboard.kinds.' + kind), { selector: '.ant-select-item-option-content' })
  );
}

it.each([
  ['logs', 'TraceTable'],
  ['logs', 'TimeSeriesChart'],
  ['traces', 'LogsTable'],
  ['traces', 'TimeSeriesChart'],
  ['jvm', 'LogsTable'],
  ['jvm', 'TraceTable']
] as const)(
  'preserves compatible scope through the actual %s → %s editor and variable resolution',
  async (id, kind) => {
    const view = editor(id);
    await selectKind(kind);
    if (kind === 'TimeSeriesChart') {
      fireEvent.change(screen.getByRole('textbox', { name: i18n.t('signalDashboard.fields.name') }), {
        target: { value: 'jvm_memory_used_bytes' }
      });
    }
    const panel = view.current().spec.panels[id]!;
    const query = panel.spec.queries[0].spec.plugin.spec.query;
    const fields =
      kind === 'TimeSeriesChart'
        ? { signal: 'metrics', queryKind: 'time-series', metric: { name: 'jvm_memory_used_bytes' } }
        : { signal: kind === 'LogsTable' ? 'logs' : 'traces', queryKind: 'table', limit: 100 };
    expect(query).toEqual({ ...fields, context });
    expect(query.context).not.toBe(context);
    expect(view.original.spec.panels[id]!.spec.queries[0].spec.plugin.spec.query.context).toEqual(context);
    if (kind === 'TraceTable') {
      fireEvent.click(screen.getByRole('checkbox', { name: i18n.t('signalDashboard.fields.errorOnly') }));
      expect(view.current().spec.panels[id]!.spec.queries[0].spec.plugin.spec.query).toEqual({
        ...fields,
        context,
        errorOnly: true
      });
    }
    expect(parseHertzBeatDashboardDocument(view.current())).toEqual(view.current());
    expect(
      resolveDashboardPanelQuery({
        panel: view.current().spec.panels[id]!,
        variables: view.current().spec.variables,
        variableValues: { environment: 'staging' },
        timeWindow
      })
    ).toMatchObject({
      state: 'ready',
      query: {
        context: { ...context, serviceName: 'alpha-java-m2', serviceNamespace: 'alpha-proof', environment: 'staging' }
      }
    });
  }
);

it.each(['jvm', 'logs', 'traces'])('omits unsupported scope when switching %s to a fixed trace', async id => {
  const view = editor(id);
  await selectKind('TracingGanttChart');
  fireEvent.change(screen.getByRole('textbox', { name: i18n.t('signalDashboard.fields.traceId') }), {
    target: { value: '0123456789abcdef0123456789abcdef' }
  });
  const panel = view.current().spec.panels[id]!;
  expect(panel.spec.queries[0].spec.plugin.spec.query).toEqual({
    signal: 'traces',
    queryKind: 'gantt',
    traceId: '0123456789abcdef0123456789abcdef'
  });
  expect(
    resolveDashboardPanelQuery({ panel, variables: view.current().spec.variables, variableValues: {}, timeWindow })
      .state
  ).toBe('ready');
});

it.each(['LogsTable', 'TraceTable', 'TimeSeriesChart'] as const)(
  'does not invent scope or preserve a pinned trace when switching to %s',
  async kind => {
    const view = editor('trace');
    await selectKind(kind);
    const query = view.current().spec.panels.trace!.spec.queries[0].spec.plugin.spec.query;
    expect(query).not.toHaveProperty('context');
    expect(query).not.toHaveProperty('traceId');
    expect(query).not.toHaveProperty('spanId');
  }
);

it.each(['StatChart', 'GaugeChart', 'Table'] as const)(
  'retains the applied metric query and variable context when switching to %s',
  async kind => {
    const view = editor('jvm');
    const originalQuery = structuredClone(view.original.spec.panels.jvm!.spec.queries[0].spec.plugin.spec.query);
    await selectKind(kind);
    const panel = view.current().spec.panels.jvm!;
    expect(panel.spec.queries[0].spec.plugin.spec.query).toEqual(originalQuery);
    expect(parseHertzBeatDashboardDocument(view.current())).toEqual(view.current());
  }
);

it('lets a composition gauge set its explicit maximum before saving', async () => {
  const document = parseHertzBeatDashboardDocument(fixture);
  document.spec.panels.jvm!.spec.queries[0].spec.plugin.spec.query = {
    signal: 'metrics',
    queryKind: 'composition',
    plan: { version: 1, queries: [{ refId: 'a', metric: 'jvm_memory_used_bytes' }], formulas: [] },
    context
  };
  let changed = document;
  function Harness() {
    const [current, setCurrent] = useState(document);
    return (
      <SignalDashboardPanelEditor
        document={current}
        panelId="jvm"
        update={next => {
          changed = next;
          setCurrent(next);
        }}
        disabled={false}
      />
    );
  }
  render(
    <I18nextProvider i18n={i18n}>
      <Harness />
    </I18nextProvider>
  );
  await selectKind('GaugeChart');
  expect(screen.getByRole('spinbutton', { name: i18n.t('signalDashboard.gaugeMaximum') })).toBeVisible();
  fireEvent.change(screen.getByRole('spinbutton', { name: i18n.t('signalDashboard.gaugeMaximum') }), {
    target: { value: '200' }
  });
  expect(changed.spec.panels.jvm!.spec.plugin).toMatchObject({ kind: 'GaugeChart', spec: { max: 200 } });
  expect(parseHertzBeatDashboardDocument(changed)).toEqual(changed);
});

it('preserves analytical query and return display on title changes without raw-query or type-reset controls', () => {
  const original = parseHertzBeatDashboardDocument(fixture);
  const query = {
    signal: 'logs',
    queryKind: 'analysis',
    analysis: { version: 1, representation: 'table', limit: 20, order: 'count-desc', minCount: 1 },
    returnView: { version: 1, columns: [{ kind: 'time' }, { kind: 'message' }], density: 'compact', wrap: false },
    search: ' @literal.key:4 ',
    searchSyntax: 'structured-v1'
  };
  Object.assign(original.spec.panels.logs!.spec.queries[0].spec.plugin.spec, { query });
  original.spec.panels.logs!.spec.plugin.spec = {};
  let changed = original;
  render(
    <I18nextProvider i18n={i18n}>
      <SignalDashboardPanelEditor
        document={original}
        panelId="logs"
        update={next => {
          changed = next;
        }}
        disabled={false}
      />
    </I18nextProvider>
  );
  expect(screen.getAllByRole('combobox')[0]).toBeDisabled();
  expect(screen.queryByRole('textbox', { name: i18n.t('signalDashboard.fields.search') })).not.toBeInTheDocument();
  expect(screen.queryByRole('spinbutton', { name: i18n.t('signalDashboard.fields.limit') })).not.toBeInTheDocument();
  fireEvent.change(screen.getByRole('textbox', { name: i18n.t('signalDashboard.panelTitle') }), {
    target: { value: 'Renamed analysis' }
  });
  expect(changed.spec.panels.logs!.spec.queries[0].spec.plugin.spec.query).toEqual(query);
  expect(changed.spec.panels.logs!.spec.display.name).toBe('Renamed analysis');
  expect(parseHertzBeatDashboardDocument(changed).spec.panels.logs!.spec.queries[0].spec.plugin.spec.query).toEqual(
    query
  );
  const items = structuredClone(changed.spec.layouts[0].spec.items);
  items[0]!.height -= 1;
  const resized = updateDashboardLayout(changed, items);
  expect(resized.spec.panels.logs!.spec.queries[0].spec.plugin.spec.query).toEqual(query);
  expect(resized.spec.panels.logs!.spec.display.name).toBe('Renamed analysis');
});

it('labels a log analytical time series by its representation rather than as metrics', () => {
  const document = parseHertzBeatDashboardDocument(fixture);
  Object.assign(document.spec.panels.jvm!.spec.queries[0].spec.plugin.spec, {
    query: {
      signal: 'logs',
      queryKind: 'analysis',
      analysis: { version: 1, representation: 'timeseries', limit: 20, order: 'count-desc', minCount: 1 }
    }
  });
  render(
    <I18nextProvider i18n={i18n}>
      <SignalDashboardPanelEditor document={document} panelId="jvm" update={() => {}} disabled={false} />
    </I18nextProvider>
  );
  expect(screen.getAllByRole('combobox')[0]).toBeDisabled();
  expect(screen.queryByText(i18n.t('signalDashboard.kinds.TimeSeriesChart'))).not.toBeInTheDocument();
  expect(screen.getByTitle(i18n.t('explore.logAnalysis.timeseries'))).toBeVisible();
});
