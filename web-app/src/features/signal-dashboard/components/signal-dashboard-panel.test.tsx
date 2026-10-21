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

import { cleanup, fireEvent, render as renderView, screen, within } from '@testing-library/react';
import { afterEach, beforeAll, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { I18nextProvider } from 'react-i18next';
import { initializeI18n, loadLocale, i18n } from '@/core/i18n/i18n';
import fixture from '@/platform/perses/model/fixtures/supported-dashboard.json';
import { parseHertzBeatDashboardDocument } from '@/platform/perses';
import type { DashboardViewProps } from '../model/signal-dashboard-view-model';
import { DashboardPanelActions } from '../runtime/dashboard-panel-actions';
import type { DashboardPanelRuntimeProps } from '../model/dashboard-panel-runtime-model';
import { SignalDashboardPanel } from './signal-dashboard-panel';
import { SignalDashboardQueryControls } from './signal-dashboard-query-controls';
import { formatShortLocalTimeRange } from '@/shared/time';

vi.mock('../runtime/dashboard-panel-runtime', () => ({
  DashboardPanelRuntime: (props: DashboardPanelRuntimeProps) => (
    <>
      {props.actions && <DashboardPanelActions actions={props.actions} loading={props.enabled} failed={false} />}
      <output data-testid={props.panelId}>{JSON.stringify(props)}</output>
    </>
  )
}));
function render(ui: ReactNode) {
  return renderView(ui, { wrapper: MemoryRouter });
}
const document = parseHertzBeatDashboardDocument(fixture);
function props(): DashboardViewProps {
  return {
    state: {
      runtimeIdentity: 'operator',
      records: [],
      listState: 'ready',
      active: undefined,
      selectedKey: document.metadata.name,
      document,
      preview: document,
      editor: undefined,
      incoming: undefined,
      busy: false,
      canWrite: true,
      error: undefined,
      validationError: false,
      controls: { duration: '30m', variables: {} },
      variables: {},
      timeWindow: { from: 1788632760000, to: 1788632820000 },
      timeZone: 'UTC',
      fixedTime: true,
      validView: true,
      refreshRevision: 0,
      returnPath: undefined
    },
    actions: {} as DashboardViewProps['actions']
  };
}
const runtime = (id: string): { refreshRevision: number; enabled: boolean } =>
  JSON.parse(screen.getByTestId(id).textContent) as { refreshRevision: number; enabled: boolean };
beforeAll(async () => {
  await initializeI18n();
  await loadLocale('en-US');
});
afterEach(() => {
  cleanup();
  vi.unstubAllEnvs();
});
it('retries a single panel directly, re-enables it and leaves sibling revisions unchanged', () => {
  const input = props();
  render(
    <I18nextProvider i18n={i18n}>
      <section aria-label="Logs">
        <SignalDashboardPanel {...input} panelId="logs" select={vi.fn()} selected={undefined} />
      </section>
      <section aria-label="Traces">
        <SignalDashboardPanel {...input} panelId="traces" select={vi.fn()} selected={undefined} />
      </section>
    </I18nextProvider>
  );
  const logs = within(screen.getByRole('region', { name: 'Logs' }));
  const before = runtime('traces');
  fireEvent.click(logs.getByRole('button', { name: i18n.t('common.cancel') }));
  fireEvent.click(logs.getByRole('button', { name: i18n.t('signalDashboard.retryPanel') }));
  expect(runtime('logs').refreshRevision).toBe(1);
  expect(runtime('logs').enabled).toBe(true);
  expect(runtime('traces')).toEqual(before);
  fireEvent.click(logs.getByRole('button', { name: i18n.t('common.cancel') }));
  expect(runtime('logs').enabled).toBe(false);
  fireEvent.click(logs.getByRole('button', { name: i18n.t('signalDashboard.retryPanel') }));
  expect(runtime('logs').enabled).toBe(true);
  expect(runtime('logs').refreshRevision).toBe(2);
});
it('does not render an applied query under a changed draft definition until Query', () => {
  const input = props();
  input.state.document = structuredClone(document);
  input.state.document.spec.panels.logs!.spec.queries[0].spec.plugin.spec.query = {
    signal: 'logs',
    queryKind: 'table',
    search: 'Changed'
  };
  render(
    <I18nextProvider i18n={i18n}>
      <SignalDashboardPanel {...input} panelId="logs" select={vi.fn()} selected={undefined} />
    </I18nextProvider>
  );
  expect(screen.queryByTestId('logs')).not.toBeInTheDocument();
  expect(screen.getByRole('status')).toHaveTextContent(i18n.t('signalDashboard.applyFirst'));
  expect(screen.queryByRole('link')).not.toBeInTheDocument();
});

it('does not reuse the previous runtime revision when global refresh follows a panel retry', () => {
  const input = props();
  const view = () => (
    <I18nextProvider i18n={i18n}>
      <SignalDashboardPanel {...input} panelId="logs" select={vi.fn()} selected={undefined} />
    </I18nextProvider>
  );
  const { rerender } = render(view());
  fireEvent.click(screen.getByRole('button', { name: i18n.t('common.cancel') }));
  fireEvent.click(screen.getByRole('button', { name: i18n.t('signalDashboard.retryPanel') }));
  const before = runtime('logs').refreshRevision;
  fireEvent.click(screen.getByRole('button', { name: i18n.t('common.cancel') }));
  input.state.refreshRevision = 1;
  rerender(view());
  expect(runtime('logs').refreshRevision).not.toBe(before);
  expect(runtime('logs').enabled).toBe(true);
});

it('formats the committed window in its displayed dashboard timezone', () => {
  vi.stubEnv('TZ', 'UTC');
  const input = props();
  input.state.timeZone = 'Pacific/Honolulu';
  render(
    <I18nextProvider i18n={i18n}>
      <SignalDashboardQueryControls {...input} />
    </I18nextProvider>
  );
  const window = input.state.timeWindow!;
  const expected =
    formatShortLocalTimeRange(window.from, window.to, { timeZone: input.state.timeZone }) +
    ' · ' +
    input.state.timeZone;
  expect(screen.getByText(expected, { normalizer: value => value })).toBeVisible();
  vi.unstubAllEnvs();
});
