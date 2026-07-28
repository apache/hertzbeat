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

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import en from '@/assets/i18n/en-us.json';

import type { AlertGroup, AlertSummary, ServerLocalDateTime } from '../model/alert-model';
import { AlertCenterPage } from './alert-center-page';

const controller = vi.hoisted(() => ({
  acknowledge: vi.fn(),
  acknowledgeSelected: vi.fn(),
  changePage: vi.fn(),
  changeSeverity: vi.fn(),
  changeStatus: vi.fn(),
  clearSelection: vi.fn(),
  manageRules: vi.fn(),
  remove: vi.fn(),
  removeSelected: vi.fn(),
  reopen: vi.fn(),
  reopenSelected: vi.fn(),
  resolve: vi.fn(),
  resolveSelected: vi.fn(),
  refresh: vi.fn(),
  retryList: vi.fn(),
  retryOperation: vi.fn(),
  retrySummary: vi.fn(),
  selectIds: vi.fn(),
  setDraft: vi.fn(),
  state: {},
  submitFilters: vi.fn(),
  unacknowledge: vi.fn(),
  unacknowledgeSelected: vi.fn()
}));

vi.mock('../controller/use-alert-center-controller', () => ({ useAlertCenterController: () => controller }));
vi.mock('../components/alert-management-nav', () => ({ AlertManagementNav: () => <nav data-testid="alert-nav" /> }));
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, values?: Record<string, unknown>) =>
      key === 'alert.deleteConfirm'
        ? `${key}:${String(values?.target)}`
        : ({
            'instrumentation.field.serviceName': en.instrumentation.field.serviceName,
            'instrumentation.field.serviceNamespace': en.instrumentation.field.serviceNamespace,
            'instrumentation.field.serviceEnvironment': en.instrumentation.field.serviceEnvironment
          }[key] ?? key)
  })
}));

const summary: AlertSummary = {
  total: 2,
  dealNum: 1,
  rate: 50,
  priorityWarningNum: 1,
  priorityCriticalNum: 0,
  priorityEmergencyNum: 0
};
const record: AlertGroup = {
  id: 1,
  status: 'pending',
  groupLabels: { alertname: 'Latency' },
  commonLabels: { severity: 'info', serviceName: 'checkout' },
  commonAnnotations: null,
  alertFingerprints: null,
  alerts: [
    {
      id: 11,
      labels: { alertname: 'Latency', instance: 'checkout-1' },
      annotations: { summary: 'Checkout latency exceeded the threshold.' },
      content: 'Checkout latency is above 500 ms.',
      status: 'firing',
      triggerTimes: 3,
      startAt: 1784250000000,
      activeAt: 1784250060000,
      endAt: null
    }
  ],
  gmtUpdate: '2026-07-17 08:09:10' as ServerLocalDateTime
};
const selectedRecords: AlertGroup[] = [
  { ...record, status: 'firing' },
  { ...record, id: 2, status: 'acknowledged' },
  { ...record, id: 3, status: 'resolved' }
];

describe('AlertCenterPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    controller.state = buildState();
  });
  afterEach(cleanup);

  it('renders server-local time and translated persisted values without browser date parsing', () => {
    const parse = vi.spyOn(Date, 'parse');
    render(<AlertCenterPage />);

    expect(screen.getByText('2026-07-17 08:09:10')).toBeInTheDocument();
    expect(parse).not.toHaveBeenCalled();
    expect(screen.getByText('alert.status.pending')).toBeInTheDocument();
    expect(screen.getByText('alert.severity.info')).toBeInTheDocument();
    expect(screen.getByText('alert.summary.nonFiring')).toBeInTheDocument();
    expect(screen.getByText('alert.summary.scope')).toBeInTheDocument();
    expect(screen.queryByText('pending')).not.toBeInTheDocument();
    expect(screen.queryByText('info')).not.toBeInTheDocument();
    expect(screen.queryByText('severity=info')).not.toBeInTheDocument();
  });

  it('resolves every scope placeholder from the locale catalog', () => {
    render(<AlertCenterPage />);

    expect(screen.getByPlaceholderText(en.instrumentation.field.serviceName)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(en.instrumentation.field.serviceNamespace)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(en.instrumentation.field.serviceEnvironment)).toBeInTheDocument();
    expect(screen.queryByPlaceholderText(/instrumentation\.field\./)).not.toBeInTheDocument();
  });

  it('expands a group into the operator-facing child alert evidence from Angular', () => {
    render(<AlertCenterPage />);

    fireEvent.click(screen.getByRole('button', { name: 'Expand row' }));

    fireEvent.click(screen.getByText('Checkout latency is above 500 ms.'));

    expect(screen.getByText('Checkout latency exceeded the threshold.')).toBeInTheDocument();
    expect(screen.getByText('instance=checkout-1')).toBeInTheDocument();
    expect(screen.getByText('alert.details.triggerTimes')).toBeInTheDocument();
    expect(screen.getByText('alert.details.startAt')).toBeInTheDocument();
    expect(screen.getByText('alert.details.activeAt')).toBeInTheDocument();
  });

  it('confirms deletion before delegating the selected alert group', async () => {
    render(<AlertCenterPage />);

    fireEvent.click(screen.getByRole('button', { name: 'alert.delete' }));
    expect(await screen.findByText('alert.deleteConfirm:Latency (#1)')).toBeInTheDocument();
    fireEvent.click(await screen.findByRole('button', { name: 'alert.confirmDelete' }));

    expect(controller.remove).toHaveBeenCalledWith(record);
  });

  it('restores Angular row selection for the visible alert group', () => {
    render(<AlertCenterPage />);

    fireEvent.click(screen.getByRole('checkbox', { name: 'Select all' }));
    expect(controller.selectIds).toHaveBeenCalledWith([1]);
  });

  it.each([
    ['acknowledge', 'alert.acknowledgeSelected', 'alert.confirmAcknowledge', controller.acknowledgeSelected],
    ['resolve', 'alert.resolveSelected', 'alert.confirmResolve', controller.resolveSelected],
    ['reopen', 'alert.reopenSelected', 'alert.confirmReopen', controller.reopenSelected],
    ['unacknowledge', 'alert.unacknowledgeSelected', 'alert.confirmUnacknowledge', controller.unacknowledgeSelected],
    ['delete', 'alert.deleteSelected', 'alert.confirmDelete', controller.removeSelected]
  ])('confirms the Angular bulk %s operation in isolation', async (_operation, actionLabel, confirmLabel, command) => {
    controller.state = buildState({
      list: { kind: 'ready', records: selectedRecords, total: selectedRecords.length },
      selectedIds: [1, 2, 3]
    });
    render(<AlertCenterPage />);

    fireEvent.click(screen.getByRole('button', { name: actionLabel }));
    fireEvent.click(await screen.findByRole('button', { name: confirmLabel }));
    expect(command).toHaveBeenCalledOnce();
    expect(command.mock.calls[0]).toEqual([]);
  });

  it('allows an acknowledged-only selection to advance to resolved', async () => {
    controller.state = buildState({
      list: { kind: 'ready', records: [selectedRecords[1]], total: 1 },
      selectedIds: [2]
    });
    render(<AlertCenterPage />);

    fireEvent.click(screen.getByRole('button', { name: 'alert.resolveSelected' }));
    fireEvent.click(await screen.findByRole('button', { name: 'alert.confirmResolve' }));

    expect(controller.resolveSelected).toHaveBeenCalledOnce();
  });

  it('offers resolve for active rows and reopen for resolved rows', async () => {
    controller.state = buildState({
      list: { kind: 'ready', records: [{ ...record, status: 'firing' }], total: 1 }
    });
    const view = render(<AlertCenterPage />);

    fireEvent.click(screen.getByRole('button', { name: 'alert.resolve' }));
    fireEvent.click(await screen.findByRole('button', { name: 'alert.confirmResolve' }));
    expect(controller.resolve).toHaveBeenCalledWith({ ...record, status: 'firing' });
    view.unmount();

    controller.state = buildState({
      list: { kind: 'ready', records: [{ ...record, status: 'resolved' }], total: 1 }
    });
    render(<AlertCenterPage />);
    fireEvent.click(screen.getByRole('button', { name: 'alert.reopen' }));
    fireEvent.click(await screen.findByRole('button', { name: 'alert.confirmReopen' }));
    expect(controller.reopen).toHaveBeenCalledWith({ ...record, status: 'resolved' });
  });

  it('restores acknowledge and unacknowledge for their exact alert states', async () => {
    const firing = { ...record, status: 'firing' as const };
    controller.state = buildState({ list: { kind: 'ready', records: [firing], total: 1 } });
    const view = render(<AlertCenterPage />);

    fireEvent.click(screen.getByRole('button', { name: 'alert.acknowledge' }));
    fireEvent.click(await screen.findByRole('button', { name: 'alert.confirmAcknowledge' }));
    expect(controller.acknowledge).toHaveBeenCalledWith(firing);
    view.unmount();

    const acknowledged = { ...record, status: 'acknowledged' as const };
    controller.state = buildState({ list: { kind: 'ready', records: [acknowledged], total: 1 } });
    render(<AlertCenterPage />);

    fireEvent.click(screen.getByRole('button', { name: 'alert.unacknowledge' }));
    fireEvent.click(await screen.findByRole('button', { name: 'alert.confirmUnacknowledge' }));
    expect(controller.unacknowledge).toHaveBeenCalledWith(acknowledged);
    expect(screen.getByRole('button', { name: 'alert.resolve' })).toBeInTheDocument();
  });

  it.each([
    ['permission', 'common.permission.roleRequiredDescription'],
    ['unavailable', 'alert.listUnavailable'],
    ['error', 'alert.listLoadFailed']
  ])('renders distinct list %s state and delegates retry', (kind, evidence) => {
    controller.state = buildState({ list: { kind } });
    render(<AlertCenterPage />);

    expect(screen.getByText(evidence)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'common.retry' }));
    expect(controller.retryList).toHaveBeenCalledTimes(1);
  });

  it('keeps uncertain delete proof visible and retries without another UI write', () => {
    controller.state = buildState({
      command: 'idle',
      recovery: { kind: 'delete', ids: [1], phase: 'proof', failure: 'unavailable' }
    });
    render(<AlertCenterPage />);

    expect(screen.getByText('common.unavailable')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'common.retry' }));
    expect(controller.retryOperation).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('button', { name: 'alert.delete' })).toBeDisabled();
  });

  it('keeps unacknowledge recovery distinct from reopening a resolved alert', () => {
    controller.state = buildState({
      command: 'idle',
      recovery: {
        kind: 'status',
        action: 'unacknowledge',
        ids: [1],
        status: 'firing',
        phase: 'proof',
        failure: 'error'
      }
    });
    render(<AlertCenterPage />);

    expect(screen.getByText('alert.unacknowledgeFailed')).toBeInTheDocument();
    expect(screen.queryByText('alert.reopenFailed')).not.toBeInTheDocument();
  });

  it('keeps an out-of-range ready page as a table instead of an empty result', () => {
    controller.state = buildState({ list: { kind: 'ready', records: [], total: 5 } });
    render(<AlertCenterPage />);

    expect(screen.queryByText('alert.empty')).not.toBeInTheDocument();
    expect(screen.getByRole('table')).toBeInTheDocument();
  });

  it('renders summary unavailable and contract-error states independently', () => {
    controller.state = buildState({ summary: { kind: 'unavailable' } });
    const view = render(<AlertCenterPage />);
    expect(screen.getByText('alert.summaryUnavailable')).toBeInTheDocument();
    view.unmount();

    controller.state = buildState({ summary: { kind: 'error' } });
    render(<AlertCenterPage />);
    expect(screen.getByText('alert.summaryLoadFailed')).toBeInTheDocument();
    expect(screen.queryByText('alert.summary.total')).not.toBeInTheDocument();
  });

  it('renders summary permission rejection without presenting stale totals', () => {
    controller.state = buildState({ summary: { kind: 'permission' } });
    render(<AlertCenterPage />);

    expect(screen.getByText('common.permission.roleRequiredDescription')).toBeInTheDocument();
    expect(screen.queryByText('alert.summary.total')).not.toBeInTheDocument();
  });
});

function buildState(override: Record<string, unknown> = {}) {
  return {
    capabilities: { canUpdateStatus: true, canDeleteGroups: true, canSelect: true },
    draft: { search: '', serviceName: '', serviceNamespace: '', environment: '' },
    list: { kind: 'ready', records: [record], total: 1 },
    query: {
      search: '',
      status: '',
      severity: '',
      serviceName: '',
      serviceNamespace: '',
      environment: '',
      pageIndex: 0,
      pageSize: 8
    },
    refreshing: false,
    command: 'idle',
    recovery: null,
    selectedIds: [],
    summary: { kind: 'ready', summary },
    ...override
  };
}
