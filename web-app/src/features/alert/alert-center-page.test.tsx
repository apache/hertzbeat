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

import type { AlertGroup, AlertSummary, ServerLocalDateTime } from './alert-model';
import { AlertCenterPage } from './alert-center-page';

const controller = vi.hoisted(() => ({
  changePage: vi.fn(),
  changeSeverity: vi.fn(),
  changeStatus: vi.fn(),
  manageRules: vi.fn(),
  refresh: vi.fn(),
  retryList: vi.fn(),
  retrySummary: vi.fn(),
  setDraft: vi.fn(),
  state: {},
  submitFilters: vi.fn()
}));

vi.mock('./controller/use-alert-center-controller', () => ({ useAlertCenterController: () => controller }));
vi.mock('./alert-management-nav', () => ({ AlertManagementNav: () => <nav data-testid="alert-nav" /> }));
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => ({
      'instrumentation.field.serviceName': en.instrumentation.field.serviceName,
      'instrumentation.field.serviceNamespace': en.instrumentation.field.serviceNamespace,
      'instrumentation.field.serviceEnvironment': en.instrumentation.field.serviceEnvironment
    })[key] ?? key
  })
}));

const summary: AlertSummary = {
  total: 2, dealNum: 1, rate: 50, priorityWarningNum: 1, priorityCriticalNum: 0, priorityEmergencyNum: 0
};
const record: AlertGroup = {
  id: 1,
  status: 'pending',
  groupLabels: { alertname: 'Latency' },
  commonLabels: { severity: 'info', serviceName: 'checkout' },
  commonAnnotations: null,
  alertFingerprints: null,
  gmtUpdate: '2026-07-17 08:09:10' as ServerLocalDateTime
};

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

  it.each([
    ['unavailable', 'alert.listUnavailable'],
    ['error', 'alert.listLoadFailed']
  ])('renders distinct list %s state and delegates retry', (kind, evidence) => {
    controller.state = buildState({ list: { kind } });
    render(<AlertCenterPage />);

    expect(screen.getByText(evidence)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'common.retry' }));
    expect(controller.retryList).toHaveBeenCalledTimes(1);
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
});

function buildState(override: Record<string, unknown> = {}) {
  return {
    draft: { search: '', serviceName: '', serviceNamespace: '', environment: '' },
    list: { kind: 'ready', records: [record], total: 1 },
    query: {
      search: '', status: '', severity: '', serviceName: '', serviceNamespace: '', environment: '', pageIndex: 0, pageSize: 8
    },
    refreshing: false,
    summary: { kind: 'ready', summary },
    ...override
  };
}
