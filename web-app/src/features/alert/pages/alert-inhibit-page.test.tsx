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

import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { AlertInhibitPage } from './alert-inhibit-page';

const controller = vi.hoisted(() => ({
  capabilities: { canWrite: true, canDelete: true },
  changePage: vi.fn(),
  closeDraft: vi.fn(),
  create: vi.fn(),
  edit: vi.fn(),
  refresh: vi.fn(),
  remove: vi.fn(),
  removeMany: vi.fn(),
  retry: vi.fn(),
  retryDetail: vi.fn(),
  setSearch: vi.fn(),
  selectIds: vi.fn(),
  state: {},
  submit: vi.fn(),
  submitSearch: vi.fn(),
  toggle: vi.fn(),
  updateDraft: vi.fn(),
  viewAllRules: vi.fn(),
  viewMatchedRules: vi.fn(),
  returnToEntity: vi.fn()
}));
vi.mock('../controller/use-alert-inhibit-controller', () => ({ useAlertInhibitController: () => controller }));
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, values?: Record<string, unknown>) =>
      key.startsWith('alertInhibits.logicPreview.') && values
        ? `${key}|${Object.values(values).map(String).join('|')}`
        : key
  })
}));

const record = {
  id: 7,
  name: 'Policy',
  sourceLabels: { severity: 'critical' },
  targetLabels: { severity: 'warning' },
  equalLabels: ['service'],
  enable: true,
  gmtUpdate: '2026-07-17T09:00:00'
};

describe('AlertInhibitPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    controller.capabilities = { canWrite: true, canDelete: true };
    controller.state = buildState();
  });
  afterEach(cleanup);

  it('renders server LocalDateTime verbatim without browser parsing', () => {
    const parse = vi.spyOn(Date, 'parse');
    render(<AlertInhibitPage />);
    expect(screen.getByText('2026-07-17T09:00:00')).toBeInTheDocument();
    expect(parse).not.toHaveBeenCalled();
  });

  it.each([
    ['empty', 'alertInhibits.empty'],
    ['unavailable', 'common.unavailable'],
    ['error', 'common.routeError.description']
  ])('renders list state %s honestly', (kind, evidence) => {
    controller.state = buildState({ list: { kind } });
    render(<AlertInhibitPage />);
    expect(screen.getByText(evidence)).toBeInTheDocument();
  });

  it('uses the shared operational frame and a compact empty result', () => {
    controller.state = buildState({ list: { kind: 'empty' } });
    render(<AlertInhibitPage />);

    expect(document.querySelector('[data-hb-operational-page]')).toHaveAttribute('data-mode', 'data');
    expect(document.querySelector('[data-hb-operational-command-bar]')).toBeInTheDocument();
    expect(document.querySelector('[data-hb-operational-result-region]')).toBeInTheDocument();
    expect(screen.getByRole('table')).toBeInTheDocument();
    expect(screen.getAllByText('alertInhibits.name').length).toBeGreaterThan(0);
    expect(screen.getAllByText('alertInhibits.sourceLabels').length).toBeGreaterThan(0);
    expect(screen.getAllByText('alertInhibits.targetLabels').length).toBeGreaterThan(0);
    expect(screen.getByRole('status', { name: 'alertInhibits.empty' })).toBeVisible();
    expect(document.querySelector('.ant-empty-image')).not.toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'common.actions' })).toHaveClass('ant-table-cell-fix-right');
    expect(screen.getByRole('table').closest('[data-table-overflow]')).toHaveAttribute('data-table-overflow', 'fit');
  });

  it.each([
    ['missing', 'common.notFound.description'],
    ['unavailable', 'common.unavailable'],
    ['error', 'alertInhibits.loadFailed']
  ])('renders retryable detail state %s', (kind, evidence) => {
    controller.state = buildState({ detail: { kind, id: 7 } });
    render(<AlertInhibitPage />);
    expect(screen.getByText(evidence)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'common.retry' }));
    expect(controller.retryDetail).toHaveBeenCalled();
  });

  it('does not invent nullable labels, enabled state, or time', () => {
    controller.state = buildState({
      list: {
        kind: 'ready',
        records: [
          { ...record, sourceLabels: null, targetLabels: null, equalLabels: null, enable: null, gmtUpdate: null }
        ],
        total: 1
      }
    });
    render(<AlertInhibitPage />);
    expect(screen.getAllByText('—').length).toBeGreaterThanOrEqual(4);
    expect(screen.getByRole('switch')).toBeDisabled();
  });

  it('delegates search, refresh, create, and edit', () => {
    render(<AlertInhibitPage />);
    fireEvent.change(screen.getByPlaceholderText('alertInhibits.search'), { target: { value: 'prod' } });
    fireEvent.click(screen.getByRole('button', { name: 'common.query' }));
    fireEvent.click(screen.getByRole('button', { name: 'common.refresh' }));
    fireEvent.click(screen.getByRole('button', { name: 'alertInhibits.new' }));
    fireEvent.click(screen.getByRole('button', { name: 'common.edit' }));
    expect(controller.setSearch).toHaveBeenCalledWith('prod');
    expect(controller.refresh).toHaveBeenCalled();
    expect(controller.create).toHaveBeenCalled();
    expect(controller.edit).toHaveBeenCalledWith(7);
  });

  it('renders GUEST as read-only without actionable mutation controls', () => {
    controller.capabilities = { canWrite: false, canDelete: false };
    render(<AlertInhibitPage />);

    expect(screen.queryByRole('button', { name: 'alertInhibits.new' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'common.edit' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'alertInhibits.delete' })).not.toBeInTheDocument();
    expect(screen.getByRole('switch')).toBeDisabled();
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
  });

  it('hides stale write state but keeps denied uncertain-write evidence visible and non-actionable', () => {
    controller.capabilities = { canWrite: false, canDelete: false };
    controller.state = buildState({
      command: 'recovering',
      detail: { kind: 'unavailable', id: 7 },
      draft: {
        name: 'Policy',
        sourceLabelsText: 'severity:critical',
        targetLabelsText: 'severity:warning',
        equalLabels: ['service'],
        enable: true
      },
      recovery: { kind: 'save', phase: 'proof', retryable: true },
      selectedIds: [7]
    });
    render(<AlertInhibitPage />);

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.queryByText('alertInhibits.loadFailed')).not.toBeInTheDocument();
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'common.retry' })).toBeDisabled();
  });

  it('keeps USER write controls while omitting ADMIN-only delete selection and actions', () => {
    controller.capabilities = { canWrite: true, canDelete: false };
    render(<AlertInhibitPage />);

    expect(screen.getByRole('button', { name: 'alertInhibits.new' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'common.edit' })).toBeEnabled();
    expect(screen.queryByRole('button', { name: 'alertInhibits.delete' })).not.toBeInTheDocument();
    expect(screen.getByRole('switch')).toBeEnabled();
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
  });

  it('localizes both current-page selection states', () => {
    const view = render(<AlertInhibitPage />);
    expect(screen.getByRole('checkbox', { name: 'common.tableSelection.selectAll' })).not.toBeChecked();

    controller.state = buildState({ selectedIds: [record.id] });
    view.rerender(<AlertInhibitPage />);
    expect(screen.getByRole('checkbox', { name: 'common.tableSelection.clearAll' })).toBeChecked();
  });

  it('keeps both source and target matcher editors interactive when suggestions are available', () => {
    controller.state = buildState({
      draft: {
        name: 'Policy',
        sourceLabelsText: '',
        targetLabelsText: '',
        equalLabels: [],
        enable: true
      }
    });
    render(<AlertInhibitPage />);
    const keyEditors = within(screen.getByRole('dialog')).getAllByRole('combobox', {
      name: 'alertInhibits.matcherKey'
    });
    expect(keyEditors).toHaveLength(2);
    keyEditors.forEach(editor => expect(editor).toBeEnabled());
  });

  it('states the resulting inhibition rule and refreshes the explanation with the draft', () => {
    controller.state = buildState({
      draft: {
        name: 'Policy',
        sourceLabelsText: 'severity:critical, :, service:checkout',
        targetLabelsText: 'severity:warning, service:checkout',
        equalLabels: ['service'],
        enable: true
      }
    });
    const view = render(<AlertInhibitPage />);

    const explanation = screen.getByRole('region', { name: 'alertInhibits.logicPreview.title' });
    expect(explanation).toHaveTextContent(
      'alertInhibits.logicPreview.triggerDetail|severity=critical, service=checkout'
    );
    expect(explanation).toHaveTextContent('alertInhibits.logicPreview.effectDetail|severity=warning, service=checkout');
    expect(explanation).toHaveTextContent('alertInhibits.logicPreview.conditionDetail|service');

    controller.state = buildState({
      draft: {
        name: 'Policy',
        sourceLabelsText: '',
        targetLabelsText: '',
        equalLabels: [],
        enable: true
      }
    });
    view.rerender(<AlertInhibitPage />);

    const emptyExplanation = screen.getByRole('region', { name: 'alertInhibits.logicPreview.title' });
    expect(emptyExplanation).toHaveTextContent('alertInhibits.logicPreview.sourceEmpty');
    expect(emptyExplanation).toHaveTextContent('alertInhibits.logicPreview.targetEmpty');
    expect(emptyExplanation).toHaveTextContent('alertInhibits.logicPreview.equalEmpty');
  });

  it('matches the source editor shell, label rows, and inline required feedback', () => {
    controller.state = buildState({
      draft: {
        name: '',
        sourceLabelsText: '',
        targetLabelsText: '',
        equalLabels: [],
        enable: true
      }
    });
    render(<AlertInhibitPage />);

    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveStyle({ width: '40%' });
    expect(within(dialog).getAllByRole('combobox', { name: 'alertInhibits.matcherKey' })).toHaveLength(2);
    expect(within(dialog).getAllByRole('combobox', { name: 'alertInhibits.matcherValue' })).toHaveLength(2);
    expect(within(dialog).getByText('alertInhibits.equalPlaceholder')).toBeInTheDocument();

    fireEvent.click(within(dialog).getByRole('button', { name: 'common.confirm' }));

    expect(within(dialog).getAllByText('alertInhibits.required')).toHaveLength(1);
    expect(within(dialog).getByRole('textbox', { name: 'alertInhibits.name' })).toHaveAttribute('aria-invalid', 'true');
    within(dialog)
      .getAllByRole('combobox', { name: /alertInhibits\.matcher(Key|Value)/ })
      .forEach(control => expect(control).toHaveAttribute('aria-invalid', 'true'));
    expect(within(dialog).getByRole('combobox', { name: 'alertInhibits.equalLabels' })).toHaveAttribute(
      'aria-invalid',
      'true'
    );
    expect(controller.submit).not.toHaveBeenCalled();
  });

  it('explains entity-matched mode and delegates all, matched, and return actions', () => {
    controller.state = buildState({
      management: {
        context: {
          entityId: 7,
          entityName: 'Checkout API',
          returnTo: '/entities/7',
          returnLabel: 'Checkout API',
          mode: 'matched',
          matchingRuleIds: [41, 43]
        },
        missingCount: 1
      }
    });
    render(<AlertInhibitPage />);

    expect(screen.getByRole('region', { name: 'alertInhibits.management.title' })).toHaveTextContent('Checkout API');
    expect(screen.getByText('alertInhibits.management.missing')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'alertInhibits.management.viewAll' }));
    fireEvent.click(screen.getByRole('button', { name: 'alertInhibits.management.return' }));
    expect(controller.viewAllRules).toHaveBeenCalled();
    expect(controller.returnToEntity).toHaveBeenCalled();
  });

  it('selects current-page policies and confirms one batch delete', () => {
    const view = render(<AlertInhibitPage />);
    const rowCheckbox = screen.getAllByRole('checkbox').at(1);
    expect(rowCheckbox).toBeDefined();
    fireEvent.click(rowCheckbox!);
    expect(controller.selectIds).toHaveBeenCalledWith([7]);

    controller.state = buildState({ selectedIds: [7] });
    view.rerender(<AlertInhibitPage />);
    fireEvent.click(screen.getByRole('button', { name: 'alertInhibits.deleteSelected' }));
    fireEvent.click(screen.getByRole('button', { name: 'common.delete' }));

    expect(controller.removeMany).toHaveBeenCalledWith([7]);
  });

  it.each(['saving', 'operating'] as const)('makes the editor explicitly non-interactive while %s', command => {
    controller.state = buildState({
      command,
      draft: {
        name: 'Policy',
        sourceLabelsText: 'severity:critical',
        targetLabelsText: 'severity:warning',
        equalLabels: ['service'],
        enable: true
      }
    });
    render(<AlertInhibitPage />);

    const editor = within(screen.getByRole('dialog'));
    editor.getAllByRole('textbox').forEach(input => expect(input).toBeDisabled());
    editor.getAllByRole('combobox').forEach(input => expect(input).toBeDisabled());
    expect(editor.getByRole('switch')).toBeDisabled();
    expect(editor.getByRole('button', { name: 'common.cancel' })).toBeDisabled();
    expect(editor.queryByRole('button', { name: 'Close' })).not.toBeInTheDocument();
  });

  it.each(['received', 'manual', 'unavailable', 'error'] as const)(
    'explains entity authoring prefill state %s',
    prefill => {
      controller.state = buildState({
        prefill,
        draft: {
          name: 'Policy',
          sourceLabelsText: '',
          targetLabelsText: '',
          equalLabels: [],
          enable: true
        }
      });
      render(<AlertInhibitPage />);
      expect(screen.getByText(`alertInhibits.entityPrefill.${prefill}`)).toBeInTheDocument();
    }
  );

  it.each(['saving', 'operating', 'recovering'] as const)('locks every route control while %s', command => {
    controller.state = buildState({
      command,
      detail: { kind: 'unavailable', id: 7 },
      list: { kind: 'ready', records: [record], total: 20 }
    });
    render(<AlertInhibitPage />);

    expect(screen.getByRole('button', { name: 'alertInhibits.new' })).toBeDisabled();
    expect(screen.getByPlaceholderText('alertInhibits.search')).toBeDisabled();
    expect(screen.getByRole('button', { name: 'common.query' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'common.refresh' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'common.edit' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'alertInhibits.delete' })).toBeDisabled();
    expect(screen.getByRole('switch')).toBeDisabled();
    expect(screen.getByRole('button', { name: 'common.retry' })).toBeDisabled();
    expect(document.querySelector('.ant-pagination')).toHaveClass('ant-pagination-disabled');
  });

  it('enables only proof recovery retry while idle between attempts', () => {
    controller.state = buildState({
      command: 'recovering',
      draft: {
        name: 'Policy',
        sourceLabelsText: 'severity:critical',
        targetLabelsText: 'severity:warning',
        equalLabels: ['service'],
        enable: true
      },
      recovery: { kind: 'save', phase: 'proof', retryable: true }
    });
    render(<AlertInhibitPage />);

    const retry = within(screen.getByRole('dialog')).getByRole('button', { name: 'common.retry' });
    expect(screen.getAllByRole('button', { name: 'common.retry' })).toHaveLength(1);
    expect(retry).toBeEnabled();
    fireEvent.click(retry);
    expect(controller.retry).toHaveBeenCalled();
  });

  it('disables recovery retry while its proof request is active', () => {
    controller.state = buildState({
      command: 'saving',
      draft: {
        name: 'Policy',
        sourceLabelsText: 'severity:critical',
        targetLabelsText: 'severity:warning',
        equalLabels: ['service'],
        enable: true
      },
      recovery: { kind: 'save', phase: 'proof', retryable: true }
    });
    render(<AlertInhibitPage />);

    expect(within(screen.getByRole('dialog')).getByRole('button', { name: 'common.retry' })).toBeDisabled();
  });

  it('keeps create-without-id recovery visible and proof-retryable', () => {
    controller.state = buildState({
      command: 'recovering',
      draft: {
        name: 'Policy',
        sourceLabelsText: 'severity:critical',
        targetLabelsText: 'severity:warning',
        equalLabels: ['service'],
        enable: true
      },
      recovery: { kind: 'save', phase: 'commit-uncertain', retryable: true }
    });
    render(<AlertInhibitPage />);

    expect(within(screen.getByRole('dialog')).getByText('common.unavailable')).toBeInTheDocument();
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'common.retry' }));
    expect(controller.retry).toHaveBeenCalled();
  });

  it('keeps toggle and delete recovery outside the editor', () => {
    controller.state = buildState({
      command: 'recovering',
      recovery: { kind: 'delete', phase: 'proof', retryable: true }
    });
    render(<AlertInhibitPage />);

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'common.retry' }));
    expect(controller.retry).toHaveBeenCalled();
  });
});

function buildState(override: Record<string, unknown> = {}) {
  return {
    command: 'idle',
    detail: { kind: 'idle' },
    draft: null,
    editorFailure: undefined,
    prefill: 'idle',
    recovery: undefined,
    list: { kind: 'ready', records: [record], total: 1 },
    labelSuggestions: {
      kind: 'received',
      keys: ['alertname', 'instance', 'job', 'severity', 'service', 'host', 'env', 'environment']
    },
    query: { search: '', pageIndex: 0, pageSize: 8 },
    refreshing: false,
    search: '',
    selectedIds: [],
    management: { context: null, missingCount: 0 },
    ...override
  };
}
