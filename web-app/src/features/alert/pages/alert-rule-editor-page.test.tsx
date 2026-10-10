/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { act, cleanup, fireEvent, render as renderView, screen, waitFor } from '@testing-library/react';
import { App, ConfigProvider } from 'antd';
import type { ReactElement } from 'react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createAlertRuleDraft } from '../model/alert-rule-model';
import editorStyles from '../shared/alert-rule-editor.module.css?raw';
import { AlertRuleEditorPage } from './alert-rule-editor-page';

const controller = vi.hoisted(() => ({
  cancel: vi.fn(),
  changeDataType: vi.fn(),
  changeKind: vi.fn(),
  changeMetricAuthoringMode: vi.fn(),
  changeMetricBindingIds: vi.fn(),
  changeMetricBindingLabels: vi.fn(),
  changeMetricExpertCondition: vi.fn(),
  changeMetricStructuredCondition: vi.fn(),
  changeMetricTarget: vi.fn(),
  openMetricBindings: vi.fn(),
  cancelMetricBindings: vi.fn(),
  confirmMetricBindings: vi.fn(),
  preview: vi.fn(),
  retryDetail: vi.fn(),
  retryDatasource: vi.fn(),
  retryMetricTargetApps: vi.fn(),
  retryMetricTargetHierarchy: vi.fn(),
  retryMetricBindings: vi.fn(),
  retrySave: vi.fn(),
  save: vi.fn(),
  state: {},
  updateDraft: vi.fn()
}));
const actionCapabilities = vi.hoisted(() => ({ canWrite: true, canDelete: true }));
const useAlertRuleEditorController = vi.hoisted(() => vi.fn(() => controller));

vi.mock('../controller/use-alert-rule-action-capabilities', () => ({
  useAlertRuleActionCapabilities: () => actionCapabilities
}));
vi.mock('../controller/use-alert-rule-editor-controller', () => ({ useAlertRuleEditorController }));
vi.mock('./alert-rule-list-page', () => ({
  AlertRuleListPage: () => <div data-testid="alert-rule-list-background" />
}));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));

const routers: ReturnType<typeof createMemoryRouter>[] = [];
function render(ui: ReactElement, entries = ['/rules', '/rules/new?kind=realtime'], initialIndex = 1) {
  const router = createMemoryRouter(
    [
      { path: '/rules/new', element: ui },
      { path: '*', element: <div>History destination</div> }
    ],
    { initialEntries: entries, initialIndex }
  );
  routers.push(router);
  const view = renderView(
    <ConfigProvider theme={{ token: { motion: false } }}>
      <App>
        <RouterProvider router={router} />
      </App>
    </ConfigProvider>
  );
  return { ...view, router };
}

describe('AlertRuleEditorPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    actionCapabilities.canWrite = true;
    actionCapabilities.canDelete = true;
    controller.state = buildState();
  });
  afterEach(() => {
    cleanup();
    routers.splice(0).forEach(router => router.dispose());
  });

  it.each(['realtime', 'periodic'] as const)(
    'protects dirty %s Back and retains fields and URL on Cancel',
    async kind => {
      controller.state = buildState({
        dirty: true,
        requestedKind: kind,
        draft: { ...createAlertRuleDraft(), kind, name: 'History draft' }
      });
      const { router } = render(<AlertRuleEditorPage mode="new" />, ['/rules', `/rules/new?kind=${kind}&scope=keep`]);
      const original = router.state.location;
      await act(() => router.navigate(-1));
      await screen.findByRole('button', { name: 'common.discardChanges' });
      fireEvent.click(
        screen
          .getByRole('button', { name: 'common.discardChanges' })
          .closest('.ant-modal-confirm')!
          .querySelector('.ant-btn-default')!
      );
      await waitFor(() => expect([...router.state.blockers.values()][0]?.state).toBe('unblocked'));
      expect(router.state.location).toEqual(original);
      expect(screen.getByLabelText('alertRules.name')).toHaveValue('History draft');
      expect(controller.cancel).not.toHaveBeenCalled();
      await waitFor(() =>
        expect(screen.queryByRole('button', { name: 'common.discardChanges' })).not.toBeInTheDocument()
      );
      await act(() => router.navigate(-1));
      await screen.findByRole('button', { name: 'common.discardChanges' });
      fireEvent.click(screen.getByRole('button', { name: 'common.discardChanges' }));
      await waitFor(() => expect(router.state.location.pathname).toBe('/rules'));
      expect(controller.cancel).not.toHaveBeenCalled();
    }
  );

  it('protects dirty Forward and executes only the requested history step', async () => {
    controller.state = buildState({ dirty: true });
    const { router } = render(<AlertRuleEditorPage mode="new" />, [
      '/before',
      '/rules/new?kind=realtime',
      '/after',
      '/last'
    ]);
    await act(() => router.navigate(1));
    await screen.findByRole('button', { name: 'common.discardChanges' });
    fireEvent.click(screen.getByRole('button', { name: 'common.discardChanges' }));
    await waitFor(() => expect(router.state.location.pathname).toBe('/after'));
    expect(controller.cancel).not.toHaveBeenCalled();
  });

  it('guards same-path history and shares an existing close confirmation', async () => {
    controller.state = buildState({ dirty: true });
    const { router } = render(<AlertRuleEditorPage mode="new" />, [
      '/rules/new?kind=realtime&previous=1',
      '/rules/new?kind=realtime'
    ]);
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    await screen.findByRole('button', { name: 'common.discardChanges' });
    await act(() => router.navigate(-1));
    expect(screen.getAllByRole('button', { name: 'common.discardChanges' })).toHaveLength(1);
    fireEvent.click(screen.getByRole('button', { name: 'common.discardChanges' }));
    await waitFor(() => expect(router.state.location.search).toBe('?kind=realtime&previous=1'));
    expect(controller.cancel).not.toHaveBeenCalled();
    await waitFor(() =>
      expect(screen.queryByRole('button', { name: 'common.discardChanges' })).not.toBeInTheDocument()
    );
  });

  it('keeps successful save PUSH navigation outside the history guard', async () => {
    controller.state = buildState({ dirty: true });
    const { router } = render(<AlertRuleEditorPage mode="new" />);
    await router.navigate('/rules');
    await waitFor(() => expect(router.state.location.pathname).toBe('/rules'));
    expect(screen.queryByRole('button', { name: 'common.discardChanges' })).not.toBeInTheDocument();
  });

  it('allows clean history without confirmation', async () => {
    const { router } = render(<AlertRuleEditorPage mode="new" />);
    await act(() => router.navigate(-1));
    await waitFor(() => expect(router.state.location.pathname).toBe('/rules'));
    expect(screen.queryByRole('button', { name: 'common.discardChanges' })).not.toBeInTheDocument();
  });

  it('recreates the master authoring dialog over the rule list instead of a full-page card', () => {
    expect(editorStyles).toMatch(/\.editorDialogBody\s*\{[^}]*display:\s*grid/s);
    expect(editorStyles).not.toMatch(/\.editorDialogBody\s*\{[^}]*max-height:/s);
    expect(editorStyles).not.toMatch(/\.editorDialogBody\s*\{[^}]*overflow-y:/s);
    expect(editorStyles).not.toMatch(/\.editorSurface\s*\{[^}]*border:\s*1px solid/s);

    render(<AlertRuleEditorPage mode="new" />);
    expect(screen.getByTestId('alert-rule-list-background')).toBeInTheDocument();
    expect(screen.getByRole('dialog', { name: 'alertRules.newRealtime' })).toHaveStyle({ width: '70%' });
    expect(screen.queryByRole('region', { name: 'alertRules.typeChoice.title' })).not.toBeInTheDocument();
    expect(screen.getByLabelText('alertRules.name')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'alertRules.confirm' }).closest('.ant-modal-footer')).not.toBeNull();
  });

  it.each([
    ['alertRules.severity.label', true],
    ['alertRules.mode.label', true],
    ['alertRules.severity.label', false],
    ['alertRules.mode.label', false]
  ] as const)('closes only the open %s Select on Escape (dirty=%s)', async (label, dirty) => {
    controller.state = buildState({ draft: { ...createAlertRuleDraft(), dataType: 'log' }, dirty });
    render(<AlertRuleEditorPage mode="new" />);
    const select = screen.getByRole('combobox', { name: label });
    fireEvent.mouseDown(select);
    await waitFor(() => expect(select).toHaveAttribute('aria-expanded', 'true'));
    fireEvent.keyDown(select, { key: 'Escape', keyCode: 27 });
    await waitFor(() => expect(select).toHaveAttribute('aria-expanded', 'false'));
    expect(controller.cancel).not.toHaveBeenCalled();
    expect(screen.queryByRole('button', { name: 'common.discardChanges' })).not.toBeInTheDocument();
    fireEvent.keyDown(select, { key: 'Escape', keyCode: 27 });
    if (dirty) {
      expect(await screen.findByRole('button', { name: 'common.discardChanges' })).toBeInTheDocument();
      expect(controller.cancel).not.toHaveBeenCalled();
    } else {
      expect(controller.cancel).toHaveBeenCalledTimes(1);
    }
  });

  it.each(['Escape', 'Close', 'Cancel'])('protects a changed draft when closing via %s', async action => {
    controller.state = buildState({ dirty: true });
    render(<AlertRuleEditorPage mode="new" />);
    const close = () =>
      action === 'Escape'
        ? fireEvent.keyDown(screen.getByLabelText('alertRules.name'), { key: 'Escape' })
        : fireEvent.click(screen.getByRole('button', { name: action === 'Close' ? 'Close' : 'common.cancel' }));
    close();
    const confirmation = (await screen.findByRole('button', { name: 'common.discardChanges' })).closest(
      '.ant-modal-confirm'
    )!;
    fireEvent.click(confirmation.querySelector('.ant-btn-default')!);
    await waitFor(() =>
      expect(screen.queryByRole('button', { name: 'common.discardChanges' })).not.toBeInTheDocument()
    );
    expect(controller.cancel).not.toHaveBeenCalled();
    close();
    fireEvent.click(await screen.findByRole('button', { name: 'common.discardChanges' }));
    expect(controller.cancel).toHaveBeenCalledTimes(1);
    expect(controller.save).not.toHaveBeenCalled();
    expect(controller.preview).not.toHaveBeenCalled();
  });

  it.each(['Close', 'common.cancel'])('closes an untouched form via %s without prompting', name => {
    render(<AlertRuleEditorPage mode="new" />);
    fireEvent.click(screen.getByRole('button', { name }));
    expect(controller.cancel).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('button', { name: 'common.discardChanges' })).not.toBeInTheDocument();
  });

  it('lets the SQL editor consume Escape before the dialog closes', () => {
    controller.state = buildState({
      requestedKind: 'periodic',
      draft: { ...createAlertRuleDraft(), kind: 'periodic', dataType: 'log' }
    });
    render(<AlertRuleEditorPage mode="new" />);
    const editor = screen.getByLabelText('alertRules.expression');
    const editorHost = editor.closest('[data-hb-alert-sql-editor="codemirror"]');
    const completion = document.createElement('div');
    completion.className = 'cm-tooltip-autocomplete';
    editorHost?.append(completion);

    fireEvent.keyDown(editor, { key: 'Escape' });
    expect(controller.cancel).not.toHaveBeenCalled();

    completion.remove();
    fireEvent.keyDown(editor, { key: 'Escape' });
    expect(controller.cancel).toHaveBeenCalledOnce();
  });

  it('leaves Escape from a nested modal to that modal instead of closing the rule editor', () => {
    render(<AlertRuleEditorPage mode="new" />);
    const nestedModalControl = document.createElement('button');
    document.body.append(nestedModalControl);

    fireEvent.keyDown(nestedModalControl, { key: 'Escape' });

    expect(controller.cancel).not.toHaveBeenCalled();
    nestedModalControl.remove();
  });

  it('enters new authoring with the strategy already selected by the list modal', () => {
    render(<AlertRuleEditorPage mode="new" />);

    expect(screen.getByLabelText('alertRules.name')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'alertRules.kind.realtime' })).not.toBeInTheDocument();
  });

  it('retires direct new-rule routes that do not carry a selected strategy', async () => {
    controller.state = buildState({ requestedKind: null });
    render(<AlertRuleEditorPage mode="new" />);

    expect(screen.queryByLabelText('alertRules.name')).not.toBeInTheDocument();
    await waitFor(() => expect(controller.cancel).toHaveBeenCalledOnce());
  });

  it.each([
    ['loading', 'loading'],
    ['missing', 'common.notFound.description'],
    ['permission', 'common.permission.roleRequiredDescription'],
    ['unavailable', 'common.unavailable'],
    ['error', 'common.routeError.description']
  ])('renders detail state %s honestly', (kind, evidence) => {
    controller.state = buildState({ detail: { kind } });
    render(<AlertRuleEditorPage mode="edit" />);
    if (evidence === 'loading') expect(document.querySelector('.ant-spin-spinning')).not.toBeNull();
    else expect(screen.getByText(evidence)).toBeInTheDocument();
  });

  it.each([
    ['loading', 'alertRules.previewLoading'],
    ['empty', 'alertRules.previewEmpty'],
    ['input', 'alertRules.previewInputInvalid'],
    ['invalid', 'alertRules.previewInvalid'],
    ['unavailable', 'common.unavailable'],
    ['error', 'alertRules.previewFailed'],
    ['ready', 'alertRules.previewSuccess']
  ])('keeps periodic preview %s next to its action and preserves expression', (kind, message) => {
    const expr = 'codex_sqlite_logs_write_count_total >';
    controller.state = buildState({
      requestedKind: 'periodic',
      draft: { ...createAlertRuleDraft(), kind: 'periodic', expr },
      preview: kind === 'ready' ? { kind, rowCount: 1, rows: [{ value: 1 }] } : { kind }
    });
    render(<AlertRuleEditorPage mode="new" />);
    const action = screen.getByRole('button', { name: /alertRules.preview$/ });
    const feedback = screen.getByText(message);
    expect(action.parentElement).toContainElement(feedback);
    expect(screen.getByLabelText('alertRules.expression')).toHaveValue(expr);
    expect(screen.getAllByText(message)).toHaveLength(1);
    if (kind === 'error') {
      expect(feedback.closest('[role="alert"]')).not.toBeNull();
      expect(screen.queryByText('alertRules.previewEmpty')).not.toBeInTheDocument();
    }
    if (kind === 'loading') expect(feedback.closest('[role="status"]')).not.toBeNull();
  });

  it.each([
    ['empty', 'alertRules.previewEmpty'],
    ['input', 'alertRules.previewInputInvalid'],
    ['permission', 'common.permission.roleRequiredDescription'],
    ['invalid', 'alertRules.previewInvalid'],
    ['unavailable', 'common.unavailable'],
    ['error', 'alertRules.previewFailed']
  ])('renders preview state %s distinctly', (kind, evidence) => {
    controller.state = buildState({ preview: { kind } });
    render(<AlertRuleEditorPage mode="edit" />);
    expect(screen.getByText(evidence)).toBeInTheDocument();
  });

  it.each([
    ['permission', 'common.permission.roleRequiredDescription'],
    ['unavailable', 'common.unavailable'],
    ['error', 'alertRules.saveFailed'],
    ['validation', 'alertRules.validation']
  ])('renders save failure %s distinctly', (failure, evidence) => {
    controller.state = buildState({ saveFailure: failure });
    render(<AlertRuleEditorPage mode="edit" />);
    expect(screen.getByText(evidence)).toBeInTheDocument();
  });

  it('offers retry only for recoverable proof and keeps commit uncertainty write-locked', () => {
    controller.state = buildState({
      recovery: { phase: 'proof', failure: 'unavailable', retryable: true }
    });
    render(<AlertRuleEditorPage mode="edit" />);
    fireEvent.click(screen.getByRole('button', { name: 'common.retry' }));
    expect(controller.retrySave).toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'alertRules.confirm' })).toBeDisabled();
    expect(screen.getByLabelText('alertRules.name')).toBeDisabled();

    cleanup();
    controller.state = buildState({
      recovery: { phase: 'commit-uncertain', failure: 'unavailable', retryable: false }
    });
    render(<AlertRuleEditorPage mode="edit" />);
    expect(screen.queryByRole('button', { name: 'common.retry' })).toBeNull();
    expect(screen.getByRole('button', { name: 'alertRules.confirm' })).toBeDisabled();
  });

  it('preserves cleared period and times as null for validation', () => {
    controller.state = buildState({ draft: { ...createAlertRuleDraft(), kind: 'periodic' } });
    render(<AlertRuleEditorPage mode="edit" />);
    fireEvent.change(screen.getByLabelText('alertRules.period'), { target: { value: '' } });
    fireEvent.change(screen.getByLabelText('alertRules.times'), { target: { value: '' } });
    expect(controller.updateDraft).toHaveBeenCalledWith({ period: null });
    expect(controller.updateDraft).toHaveBeenCalledWith({ times: null });
  });

  it.each([
    [{ kind: 'loading' }, 'alertRules.datasource.checking'],
    [{ kind: 'ready', status: { hasPromqlExecutor: false, hasSqlExecutor: false } }, 'alertRules.datasource.none'],
    [{ kind: 'ready', status: { hasPromqlExecutor: true, hasSqlExecutor: false } }, 'alertRules.datasource.promqlOnly'],
    [{ kind: 'ready', status: { hasPromqlExecutor: false, hasSqlExecutor: true } }, 'alertRules.datasource.sqlOnly']
  ])('renders datasource capability state %#', (datasource, message) => {
    controller.state = buildState({ datasource });
    render(<AlertRuleEditorPage mode="edit" />);
    expect(screen.getByText(message)).toBeInTheDocument();
  });

  it.each([
    ['unavailable', 'common.unavailable'],
    ['error', 'common.routeError.description']
  ])('renders and retries datasource %s without retrying rule detail', (kind, message) => {
    controller.state = buildState({ datasource: { kind } });
    render(<AlertRuleEditorPage mode="edit" />);

    expect(screen.getByText(message)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'common.retry' }));

    expect(controller.retryDatasource).toHaveBeenCalledOnce();
    expect(controller.retryDetail).not.toHaveBeenCalled();
  });

  it('renders ready preview and delegates draft, preview, save, and cancel', () => {
    controller.state = buildState({
      preview: {
        kind: 'ready',
        rowCount: 1,
        rows: [{ metric: 'cpu_usage', value: 92.5, __value__: null, labels: { service: 'checkout' } }]
      }
    });
    render(<AlertRuleEditorPage mode="edit" />);
    expect(screen.getByText('alertRules.previewSuccess')).toBeInTheDocument();
    expect(screen.getAllByText('metric').length).toBeGreaterThan(0);
    expect(screen.getByText('cpu_usage')).toBeInTheDocument();
    expect(screen.getByText('92.5')).toBeInTheDocument();
    expect(screen.getByText('null')).toBeInTheDocument();
    expect(screen.getByText('{"service":"checkout"}')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('alertRules.name'), { target: { value: 'New' } });
    fireEvent.click(screen.getByRole('button', { name: 'alertRules.confirm' }));
    fireEvent.click(screen.getByRole('button', { name: 'common.cancel' }));
    expect(controller.updateDraft).toHaveBeenCalledWith({ name: 'New' });
    expect(controller.save).toHaveBeenCalled();
    expect(controller.cancel).toHaveBeenCalled();
  });

  it('marks source-required fields inline after an invalid submit attempt', () => {
    controller.state = buildState({ draft: { ...createAlertRuleDraft(), labelsText: '' } });
    render(<AlertRuleEditorPage mode="new" />);

    fireEvent.click(screen.getByRole('button', { name: 'alertRules.confirm' }));

    expect(screen.getByLabelText('alertRules.name')).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByRole('combobox', { name: 'alertRules.severity.label' })).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getAllByText('alertRules.required')).toHaveLength(3);
    expect(controller.save).toHaveBeenCalledOnce();
  });

  it('denies a read-only session before the editor controller can load protected dependencies', () => {
    actionCapabilities.canWrite = false;
    render(<AlertRuleEditorPage mode="new" />);

    expect(screen.getByText('common.permission.roleRequiredTitle')).toBeInTheDocument();
    expect(screen.getByText('common.permission.roleRequiredDescription')).toBeInTheDocument();
    expect(useAlertRuleEditorController).not.toHaveBeenCalled();
    expect(screen.queryByLabelText('alertRules.name')).toBeNull();
  });

  it('disables every mutable field while save owns the operation gate', () => {
    controller.state = buildState({
      command: 'saving',
      draft: { ...createAlertRuleDraft(), kind: 'periodic' }
    });
    render(<AlertRuleEditorPage mode="edit" />);

    for (const label of [
      'alertRules.name',
      'alertRules.expression',
      'alertRules.template',
      'alertRules.period',
      'alertRules.times'
    ]) {
      expect(screen.getByLabelText(label)).toBeDisabled();
    }
    for (const select of screen.getAllByRole('combobox')) expect(select).toBeDisabled();
    expect(screen.getByRole('switch')).toBeDisabled();
    expect(screen.getByRole('button', { name: 'common.cancel' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'alertRules.preview' })).toBeDisabled();
    const savingButton = screen.getAllByRole('button').find(button => button.classList.contains('ant-btn-loading'));
    expect(savingButton).toHaveTextContent('alertRules.confirm');
  });
});

function buildState(override: Record<string, unknown> = {}) {
  return {
    dirty: false,
    canSave: true,
    command: 'idle',
    datasource: {
      kind: 'ready',
      status: { hasPromqlExecutor: true, hasSqlExecutor: true }
    },
    detail: { kind: 'ready' },
    draft: createAlertRuleDraft(),
    labelSuggestions: { kind: 'received', keys: [], catalog: { keys: [], valuesByKey: {} } },
    metricBindings: {
      eligible: false,
      open: false,
      evidence: { kind: 'idle' },
      selectedMonitorIds: [],
      selectedLabels: []
    },
    metricTarget: { apps: { kind: 'ready', apps: [] }, hierarchy: { kind: 'idle' } },
    preview: { kind: 'idle' },
    recovery: undefined,
    requestedKind: 'realtime',
    saveFailure: undefined,
    ...override
  };
}
