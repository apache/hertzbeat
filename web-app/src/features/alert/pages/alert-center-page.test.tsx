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

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import en from '@/assets/i18n/en-us.json';

import type { AlertGroup, AlertSummary, ServerLocalDateTime } from '../model/alert-model';
import { AlertCenterPage } from './alert-center-page';

const controller = vi.hoisted(() => ({
  acknowledge: vi.fn(),
  acknowledgeSelected: vi.fn(),
  changePage: vi.fn(),
  clearSelection: vi.fn(),
  manageRules: vi.fn(),
  remove: vi.fn(),
  removeIds: vi.fn(),
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
const download = vi.hoisted(() => ({ save: vi.fn() }));
const alertApi = vi.hoisted(() => ({ loadGroups: vi.fn() }));

vi.mock('../controller/use-alert-center-controller', () => ({ useAlertCenterController: () => controller }));
vi.mock('@/shared/browser-download', () => ({ saveBrowserDownload: download.save }));
vi.mock('../api/alert-api', () => ({ loadAlertGroups: alertApi.loadGroups }));
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
    alertApi.loadGroups.mockResolvedValue({
      content: [record],
      totalElements: 1,
      totalPages: 1,
      number: 0,
      size: 25
    });
  });
  afterEach(() => {
    cleanup();
    window.history.replaceState({}, '', '/');
  });

  it('renders server-local time and translated persisted values without browser date parsing', () => {
    const parse = vi.spyOn(Date, 'parse');
    render(<AlertCenterPage />);

    expect(screen.getByText('2026-07-17 08:09:10')).toBeInTheDocument();
    expect(parse).not.toHaveBeenCalled();
    expect(screen.getByText('alert.status.pending')).toBeInTheDocument();
    expect(screen.getByText('alert.severity.info')).toBeInTheDocument();
    expect(screen.getByText('alert.summary.handled')).toBeInTheDocument();
    const summaryRegion = screen.getByRole('region', { name: 'alert.summary.workspaceScope' });
    expect(summaryRegion).toHaveAttribute('data-summary-layout', 'inline');
    expect(screen.getByText('alert.summary.workspaceScope')).toBeInTheDocument();
    expect(summaryRegion.querySelectorAll('[data-summary-family]')).toHaveLength(2);
    expect(screen.getByText('alert.status.firing')).toBeInTheDocument();
    expect(screen.getByTestId('alert-summary-firing')).toHaveTextContent('1');
    expect(screen.queryByText('pending')).not.toBeInTheDocument();
    expect(screen.queryByText('info')).not.toBeInTheDocument();
    expect(screen.queryByText('severity=info')).not.toBeInTheDocument();
  });

  it('uses HertzBeat alert workbench semantics instead of raw Ant status tags', () => {
    render(<AlertCenterPage />);

    expect(document.querySelector('[data-alert-filter-workbench]')).toBeInTheDocument();
    expect(document.querySelector('[data-alert-workbench]')).toBeInTheDocument();
    const status = screen.getByText('alert.status.pending').closest('[data-alert-status]');
    const severity = screen.getByText('alert.severity.info').closest('[data-alert-severity]');
    expect(status).toHaveAttribute('data-alert-status', 'pending');
    expect(status?.children).toHaveLength(0);
    expect(severity).toHaveAttribute('data-alert-severity', 'info');
    expect(severity?.children).toHaveLength(0);
    expect(document.querySelector('.ant-tag')).not.toBeInTheDocument();
  });

  it('prioritizes alert meaning and scope over raw label syntax in each result row', () => {
    controller.state = buildState({
      list: {
        kind: 'ready',
        records: [
          {
            ...record,
            commonLabels: {
              severity: 'info',
              'service.name': 'checkout-api',
              'deployment.environment.name': 'prod'
            },
            commonAnnotations: { summary: 'Checkout latency exceeded the threshold.' }
          }
        ],
        total: 1
      }
    });
    render(<AlertCenterPage />);

    expect(screen.getByText('Checkout latency exceeded the threshold.')).toBeInTheDocument();
    expect(screen.getByText('checkout-api')).toBeInTheDocument();
    expect(screen.getByText('prod')).toBeInTheDocument();
    expect(screen.queryByText('service.name=checkout-api')).not.toBeInTheDocument();
  });

  it('resolves every scope placeholder from the locale catalog', () => {
    render(<AlertCenterPage />);

    expect(screen.getByPlaceholderText(en.instrumentation.field.serviceName)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(en.instrumentation.field.serviceNamespace)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(en.instrumentation.field.serviceEnvironment)).toBeInTheDocument();
    expect(screen.queryByPlaceholderText(/instrumentation\.field\./)).not.toBeInTheDocument();
  });

  it('uses the shared operational frame and a compact empty result', () => {
    controller.state = buildState({ list: { kind: 'empty' } });
    render(<AlertCenterPage />);

    expect(document.querySelector('[data-hb-operational-page]')).toHaveAttribute('data-mode', 'data');
    expect(screen.queryByRole('tablist')).not.toBeInTheDocument();
    expect(document.querySelector('[data-hb-operational-command-bar]')).toBeInTheDocument();
    expect(document.querySelector('[data-hb-operational-result-region]')).toBeInTheDocument();
    expect(screen.getByRole('status', { name: 'alert.empty' })).toBeVisible();
    expect(document.querySelector('.ant-empty-image')).not.toBeInTheDocument();
  });

  it('expands a group into the operator-facing child alert evidence from Angular', async () => {
    window.history.replaceState({}, '', '/alerts?password=secret&status=firing');
    render(<AlertCenterPage />);

    expect(screen.queryByRole('link', { name: 'alert.investigate' })).not.toBeInTheDocument();

    const expandDetails = screen.getByRole('button', { name: 'alert.expandDetails' });
    expect(expandDetails).toHaveAttribute('aria-expanded', 'false');
    expect(expandDetails.querySelector('.anticon-right')).toBeInTheDocument();
    fireEvent.click(expandDetails);
    expect(expandDetails).toHaveAccessibleName('alert.collapseDetails');
    expect(expandDetails).toHaveAttribute('aria-expanded', 'true');
    expect(screen.queryByRole('button', { name: 'alert.viewDetails' })).not.toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'alert.collapseDetails' })).toHaveLength(1);

    fireEvent.click(screen.getByText('Checkout latency is above 500 ms.'));

    expect(screen.getByText('Checkout latency exceeded the threshold.')).toBeInTheDocument();
    expect(screen.getByText('instance=checkout-1')).toBeInTheDocument();
    expect(screen.getByText('alert.details.triggerTimes')).toBeInTheDocument();
    expect(screen.getByText('alert.details.startAt')).toBeInTheDocument();
    expect(screen.getByText('alert.details.activeAt')).toBeInTheDocument();
    const investigate = screen.getByRole('link', { name: 'alert.investigate' });
    expect(investigate).toHaveAttribute('href', expect.stringContaining('/ai?source=singleAlert&alertId=11'));
    expect(investigate).toHaveAttribute('href', expect.stringContaining('returnTo=%2Falerts%3Fstatus%3Dfiring'));
    expect(investigate.getAttribute('href')).not.toContain('password');
    expect(screen.getByRole('group', { name: 'alert.diagnosticActions' })).toContainElement(investigate);

    fireEvent.click(expandDetails);
    expect(expandDetails).toHaveAccessibleName('alert.expandDetails');
    expect(expandDetails).toHaveAttribute('aria-expanded', 'false');
    await waitFor(() => expect(screen.getByText('Checkout latency exceeded the threshold.')).not.toBeVisible());
  });

  it('does not expose an expansion control when a group has no child alert evidence', () => {
    controller.state = buildState({
      list: { kind: 'ready', records: [{ ...record, alerts: [] }], total: 1 }
    });
    render(<AlertCenterPage />);

    expect(screen.queryByRole('button', { name: 'alert.expandDetails' })).not.toBeInTheDocument();
  });

  it('hands an exact telemetry-scoped alert window to every related Explore signal', () => {
    const telemetryAlert = {
      ...record.alerts[0],
      labels: {
        ...record.alerts[0]?.labels,
        'service.name': 'checkout-api',
        'service.namespace': 'commerce',
        'deployment.environment.name': 'prod'
      },
      startAt: 1_784_250_000_000,
      activeAt: 1_784_250_060_000,
      endAt: 1_784_250_120_000
    };
    controller.state = buildState({
      list: {
        kind: 'ready',
        records: [{ ...record, alerts: [telemetryAlert] }],
        total: 1
      }
    });
    render(<AlertCenterPage />);

    fireEvent.click(screen.getByRole('button', { name: 'alert.expandDetails' }));
    fireEvent.click(screen.getByText('Checkout latency is above 500 ms.'));

    for (const signal of ['metrics', 'logs', 'traces'] as const) {
      const link = screen.getByRole('link', { name: `explore.signals.${signal}` });
      expect(link).toHaveAttribute(
        'href',
        `/explore?signal=${signal}&timeRange=last-30m&start=1784249100000&end=1784251020000` +
          '&serviceName=checkout-api&serviceNamespace=commerce&environment=prod'
      );
    }
  });

  it('hands trusted monitor and entity authority to exact resource routes without losing alert context', () => {
    window.history.replaceState({}, '', '/alerts?status=firing');
    const resourceAlert = {
      ...record.alerts[0],
      labels: {
        ...record.alerts[0]?.labels,
        'hertzbeat.monitor.id': '42',
        'hertzbeat.entity.id': '7'
      }
    };
    controller.state = buildState({
      list: { kind: 'ready', records: [{ ...record, alerts: [resourceAlert] }], total: 1 }
    });
    render(<AlertCenterPage />);

    fireEvent.click(screen.getByRole('button', { name: 'alert.expandDetails' }));
    fireEvent.click(screen.getByText('Checkout latency is above 500 ms.'));

    expect(screen.getByRole('link', { name: 'alert.openMonitor' })).toHaveAttribute(
      'href',
      '/monitors/42?returnTo=%2Falerts%3Fstatus%3Dfiring'
    );
    expect(screen.getByRole('link', { name: 'alert.openEntity' })).toHaveAttribute(
      'href',
      '/entities/7?returnTo=%2Falerts%3Fstatus%3Dfiring'
    );
  });

  it('confirms deletion before delegating the selected alert group', async () => {
    render(<AlertCenterPage />);

    fireEvent.click(screen.getByRole('button', { name: 'alert.moreActions' }));
    fireEvent.click(screen.getByRole('menuitem', { name: 'alert.delete' }));
    expect(await screen.findByText('alert.deleteConfirm:Latency (#1)')).toBeInTheDocument();
    fireEvent.click(await screen.findByRole('button', { name: 'alert.confirmDelete' }));

    expect(controller.remove).toHaveBeenCalledWith(record);
  });

  it('restores Angular row selection for the visible alert group', () => {
    render(<AlertCenterPage />);

    fireEvent.click(screen.getByRole('checkbox', { name: 'common.tableSelection.selectAll' }));
    expect(controller.selectIds).toHaveBeenCalledWith([1]);
  });

  it('offers the four work-order export scopes while keeping selected export selection-aware', async () => {
    render(<AlertCenterPage />);

    fireEvent.click(screen.getByRole('button', { name: 'alert.export.label' }));

    expect(await screen.findByRole('menuitem', { name: 'alert.export.selected' })).toHaveAttribute(
      'aria-disabled',
      'true'
    );
    expect(screen.getByRole('menuitem', { name: 'alert.export.timeRange' })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'alert.export.filtered' })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'alert.export.all' })).toBeInTheDocument();
  });

  it('exports only selected alert groups and omits lifecycle mutations from the bulk toolbar', async () => {
    controller.state = buildState({
      list: { kind: 'ready', records: selectedRecords, total: selectedRecords.length },
      selectedIds: [1, 3]
    });
    render(<AlertCenterPage />);

    expect(screen.queryByRole('button', { name: 'alert.acknowledgeSelected' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'alert.resolveSelected' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'alert.reopenSelected' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'alert.export.label' }));
    fireEvent.click(await screen.findByRole('menuitem', { name: 'alert.export.selected' }));

    await waitFor(() => expect(download.save).toHaveBeenCalledOnce());
    expect(download.save.mock.calls[0]?.[0]).toMatchObject({
      data: expect.any(Blob),
      filename: expect.stringMatching(/^hertzbeat-alerts-\d{4}-\d{2}-\d{2}\.csv$/)
    });
    const exported = download.save.mock.calls[0]?.[0] as { data: Blob };
    const csv = await exported.data.text();
    expect(csv).toContain('"1","Latency","firing"');
    expect(csv).toContain('"3","Latency","resolved"');
    expect(csv).not.toContain('"2","Latency","acknowledged"');
  });

  it('exports every page in the submitted filter scope rather than the unsaved draft', async () => {
    controller.state = buildState({
      draft: {
        search: 'unsaved',
        serviceName: '',
        serviceNamespace: '',
        environment: '',
        status: '',
        severity: ''
      },
      query: {
        search: 'submitted',
        status: 'firing',
        severity: 'critical',
        serviceName: 'checkout',
        serviceNamespace: 'commerce',
        environment: 'production',
        pageIndex: 2,
        pageSize: 8
      }
    });
    render(<AlertCenterPage />);

    fireEvent.click(screen.getByRole('button', { name: 'alert.export.label' }));
    fireEvent.click(await screen.findByRole('menuitem', { name: 'alert.export.filtered' }));

    await waitFor(() => expect(download.save).toHaveBeenCalledOnce());
    expect(alertApi.loadGroups).toHaveBeenCalledWith(
      {
        search: 'submitted',
        status: 'firing',
        severity: 'critical',
        serviceName: 'checkout',
        serviceNamespace: 'commerce',
        environment: 'production',
        pageIndex: 0,
        pageSize: 25
      },
      expect.any(AbortSignal)
    );
  });

  it('opens an explicit alert-update time range dialog before exporting by time', async () => {
    render(<AlertCenterPage />);

    fireEvent.click(screen.getByRole('button', { name: 'alert.export.label' }));
    fireEvent.click(await screen.findByRole('menuitem', { name: 'alert.export.timeRange' }));

    expect(await screen.findByRole('dialog', { name: 'alert.export.timeRangeTitle' })).toBeInTheDocument();
    expect(screen.getByText('alert.export.updatedTime')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'alert.export.confirm' })).toBeDisabled();
  });

  it('keeps selected deletion behind the existing bulk-delete entry and one explicit confirmation', async () => {
    controller.state = buildState({
      list: { kind: 'ready', records: [selectedRecords[0]], total: 1 },
      selectedIds: [1]
    });
    render(<AlertCenterPage />);

    fireEvent.click(screen.getByRole('button', { name: 'alert.deleteSelected' }));
    expect(await screen.findByRole('dialog', { name: 'alert.deleteScope.title' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'alert.deleteScope.confirmSelected' }));

    expect(controller.removeSelected).toHaveBeenCalledOnce();
  });

  it('reviews the exact submitted-filter snapshot before deleting across pages', async () => {
    const secondRecord = { ...selectedRecords[0], id: 2 };
    controller.state = buildState({
      draft: {
        search: 'unsaved',
        serviceName: '',
        serviceNamespace: '',
        environment: '',
        status: '',
        severity: ''
      },
      list: { kind: 'ready', records: [selectedRecords[0]], total: 2 },
      query: {
        search: 'submitted',
        status: 'firing',
        severity: 'critical',
        serviceName: 'checkout',
        serviceNamespace: 'commerce',
        environment: 'production',
        pageIndex: 2,
        pageSize: 8
      },
      selectedIds: [1]
    });
    alertApi.loadGroups.mockResolvedValue({
      content: [selectedRecords[0], secondRecord],
      totalElements: 2,
      totalPages: 1,
      number: 0,
      size: 25
    });
    render(<AlertCenterPage />);

    fireEvent.click(screen.getByRole('button', { name: 'alert.deleteSelected' }));
    fireEvent.click(await screen.findByRole('radio', { name: /alert\.deleteScope\.filteredTitle/ }));
    fireEvent.click(screen.getByRole('button', { name: 'alert.deleteScope.review' }));

    expect(controller.removeIds).not.toHaveBeenCalled();
    expect(await screen.findByText('alert.deleteScope.reviewTitle')).toBeInTheDocument();
    expect(alertApi.loadGroups).toHaveBeenCalledWith(
      {
        search: 'submitted',
        status: 'firing',
        severity: 'critical',
        serviceName: 'checkout',
        serviceNamespace: 'commerce',
        environment: 'production',
        pageIndex: 0,
        pageSize: 25
      },
      expect.any(AbortSignal)
    );

    fireEvent.click(screen.getByRole('button', { name: 'alert.deleteScope.confirmFiltered' }));
    expect(controller.removeIds).toHaveBeenCalledWith([1, 2]);
    expect(controller.removeSelected).not.toHaveBeenCalled();
  });

  it('requires narrower filters instead of splitting an unverifiable delete into partial batches', async () => {
    controller.state = buildState({
      list: { kind: 'ready', records: [selectedRecords[0]], total: 101 },
      selectedIds: [1]
    });
    render(<AlertCenterPage />);

    fireEvent.click(screen.getByRole('button', { name: 'alert.deleteSelected' }));
    fireEvent.click(await screen.findByRole('radio', { name: /alert\.deleteScope\.filteredTitle/ }));

    expect(screen.getByText('alert.deleteScope.limitDescription')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'alert.deleteScope.review' })).toBeDisabled();
    expect(alertApi.loadGroups).not.toHaveBeenCalled();
  });

  it('retires an in-flight scope preparation when the dialog closes', async () => {
    let resolvePage!: (value: {
      content: AlertGroup[];
      totalElements: number;
      totalPages: number;
      number: number;
      size: number;
    }) => void;
    alertApi.loadGroups.mockReturnValue(
      new Promise(resolve => {
        resolvePage = resolve;
      })
    );
    controller.state = buildState({
      list: { kind: 'ready', records: [record], total: 2 },
      selectedIds: [1]
    });
    render(<AlertCenterPage />);

    fireEvent.click(screen.getByRole('button', { name: 'alert.deleteSelected' }));
    fireEvent.click(await screen.findByRole('radio', { name: /alert\.deleteScope\.filteredTitle/ }));
    fireEvent.click(screen.getByRole('button', { name: 'alert.deleteScope.review' }));
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    resolvePage({
      content: [record, { ...record, id: 2 }],
      totalElements: 2,
      totalPages: 1,
      number: 0,
      size: 25
    });
    await Promise.resolve();

    fireEvent.click(screen.getByRole('button', { name: 'alert.deleteSelected' }));
    expect(await screen.findByRole('dialog', { name: 'alert.deleteScope.title' })).toBeInTheDocument();
    expect(screen.queryByText('alert.deleteScope.reviewTitle')).not.toBeInTheDocument();
    expect(screen.queryByText('alert.deleteScope.prepareFailure')).not.toBeInTheDocument();
  });

  it('offers resolve for active rows and reopen for resolved rows', async () => {
    controller.state = buildState({
      list: { kind: 'ready', records: [{ ...record, status: 'firing' }], total: 1 }
    });
    const view = render(<AlertCenterPage />);

    fireEvent.click(screen.getByRole('button', { name: 'alert.moreActions' }));
    fireEvent.click(screen.getByRole('menuitem', { name: 'alert.resolve' }));
    fireEvent.click(await screen.findByRole('button', { name: 'alert.confirmResolve' }));
    expect(controller.resolve).toHaveBeenCalledWith({ ...record, status: 'firing' });
    view.unmount();

    controller.state = buildState({
      list: { kind: 'ready', records: [{ ...record, status: 'resolved' }], total: 1 }
    });
    render(<AlertCenterPage />);
    fireEvent.click(screen.getByRole('button', { name: 'alert.moreActions' }));
    fireEvent.click(screen.getByRole('menuitem', { name: 'alert.reopen' }));
    fireEvent.click(await screen.findByRole('button', { name: 'alert.confirmReopen' }));
    expect(controller.reopen).toHaveBeenCalledWith({ ...record, status: 'resolved' });
  });

  it('restores acknowledge and unacknowledge for their exact alert states', async () => {
    const firing = { ...record, status: 'firing' as const };
    controller.state = buildState({ list: { kind: 'ready', records: [firing], total: 1 } });
    const view = render(<AlertCenterPage />);

    fireEvent.click(screen.getByRole('button', { name: 'alert.moreActions' }));
    fireEvent.click(screen.getByRole('menuitem', { name: 'alert.acknowledge' }));
    fireEvent.click(await screen.findByRole('button', { name: 'alert.confirmAcknowledge' }));
    expect(controller.acknowledge).toHaveBeenCalledWith(firing);
    view.unmount();

    const acknowledged = { ...record, status: 'acknowledged' as const };
    controller.state = buildState({ list: { kind: 'ready', records: [acknowledged], total: 1 } });
    render(<AlertCenterPage />);

    fireEvent.click(screen.getByRole('button', { name: 'alert.moreActions' }));
    expect(screen.getByRole('menuitem', { name: 'alert.resolve' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('menuitem', { name: 'alert.unacknowledge' }));
    fireEvent.click(await screen.findByRole('button', { name: 'alert.confirmUnacknowledge' }));
    expect(controller.unacknowledge).toHaveBeenCalledWith(acknowledged);
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
    expect(screen.getByRole('button', { name: 'alert.moreActions' })).toBeDisabled();
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
    draft: {
      search: '',
      serviceName: '',
      serviceNamespace: '',
      environment: '',
      status: '',
      severity: ''
    },
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
