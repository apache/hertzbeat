/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { AlertCapabilities } from '../model/alert-capability-model';
import type { AlertGroup } from '../model/alert-model';
import { AlertCenterBulkActions } from './alert-center-actions';
import { AlertCenterRecovery } from './alert-center-recovery';
import { AlertCenterResults } from './alert-center-results';
import { AlertCenterToolbar } from './alert-center-toolbar';

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));

const group: AlertGroup = {
  id: 7,
  status: 'firing',
  groupLabels: { alertname: 'Latency' },
  commonLabels: null,
  commonAnnotations: null,
  alertFingerprints: null,
  alerts: [
    {
      id: 70,
      labels: { instance: 'checkout-1' },
      annotations: { summary: 'Latency evidence' },
      content: 'Checkout latency is above threshold.',
      status: 'firing',
      triggerTimes: 1,
      startAt: 1,
      activeAt: 2,
      endAt: null
    }
  ],
  gmtUpdate: null
};
const guest = { canUpdateStatus: false, canDeleteGroups: false, canSelect: false };
const user = { canUpdateStatus: true, canDeleteGroups: false, canSelect: true };
const admin = { canUpdateStatus: true, canDeleteGroups: true, canSelect: true };

describe('Alert Center presentation action access', () => {
  afterEach(cleanup);

  it.each([
    ['guest', guest],
    ['user', user],
    ['administrator', admin]
  ] as const)('shows only admitted row actions and selection for %s', (_role, capabilities) => {
    renderResults(capabilities);

    expect(screen.getByText('Latency')).toBeInTheDocument();
    expect(screen.queryByRole('checkbox', { name: 'Select all' }) !== null).toBe(capabilities.canSelect);
    expect(screen.queryByRole('button', { name: 'alert.acknowledge' }) !== null).toBe(capabilities.canUpdateStatus);
    expect(screen.queryByRole('button', { name: 'alert.delete' }) !== null).toBe(capabilities.canDeleteGroups);
  });

  it('keeps row-action admission independent from selection admission', () => {
    renderResults({ ...user, canSelect: false });

    expect(screen.queryByRole('checkbox', { name: 'Select all' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'alert.acknowledge' })).toBeInTheDocument();
  });

  it.each([
    ['guest', guest],
    ['user', user],
    ['administrator', admin]
  ] as const)('shows only admitted bulk actions for %s', (_role, capabilities) => {
    render(
      <AlertCenterBulkActions
        busy={false}
        actionPolicy={capabilities}
        selectedGroups={[group]}
        actions={{
          acknowledge: vi.fn(),
          clear: vi.fn(),
          remove: vi.fn(),
          reopen: vi.fn(),
          resolve: vi.fn(),
          unacknowledge: vi.fn()
        }}
      />
    );

    expect(screen.queryByRole('button', { name: 'alert.acknowledgeSelected' }) !== null).toBe(
      capabilities.canUpdateStatus
    );
    expect(screen.queryByRole('button', { name: 'alert.deleteSelected' }) !== null).toBe(capabilities.canDeleteGroups);
    expect(screen.queryByRole('button', { name: 'common.clear' }) !== null).toBe(capabilities.canSelect);
  });

  it('hides recovery retry when the current role cannot recover that operation kind', () => {
    const view = render(
      <AlertCenterRecovery
        canRetry={false}
        recovery={{ kind: 'delete', ids: [7], phase: 'proof', failure: 'unavailable' }}
        retrying={false}
        retry={vi.fn()}
      />
    );
    expect(screen.getByText('common.unavailable')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'common.retry' })).not.toBeInTheDocument();

    view.rerender(
      <AlertCenterRecovery
        canRetry
        recovery={{ kind: 'status', action: 'resolve', ids: [7], status: 'resolved', phase: 'proof', failure: 'error' }}
        retrying={false}
        retry={vi.fn()}
      />
    );
    expect(screen.getByRole('button', { name: 'common.retry' })).toBeInTheDocument();
  });

  it('keeps guest list details and filtering available without action admission', () => {
    renderResults(guest);
    fireEvent.click(screen.getByRole('button', { name: 'Expand row' }));
    expect(screen.getByText('Checkout latency is above threshold.')).toBeInTheDocument();

    const toolbar = render(
      <AlertCenterToolbar
        disabled={false}
        draft={{ search: '', serviceName: '', serviceNamespace: '', environment: '' }}
        query={{
          search: '',
          status: '',
          severity: '',
          serviceName: '',
          serviceNamespace: '',
          environment: '',
          pageIndex: 0,
          pageSize: 8
        }}
        refreshing={false}
        onDraftChange={vi.fn()}
        onSubmit={vi.fn()}
        onStatusChange={vi.fn()}
        onSeverityChange={vi.fn()}
        onRefresh={vi.fn()}
      />
    );
    expect(screen.getByPlaceholderText('alert.search')).toBeInTheDocument();
    expect(within(toolbar.container).getAllByRole('combobox')).toHaveLength(2);
  });
});

function renderResults(capabilities: AlertCapabilities) {
  return render(
    <AlertCenterResults
      actionPolicy={capabilities}
      onAcknowledge={vi.fn()}
      busy={false}
      state={{ kind: 'ready', records: [group], total: 1 }}
      pageIndex={0}
      pageSize={8}
      selectedIds={[]}
      onPageChange={vi.fn()}
      onRemove={vi.fn()}
      onReopen={vi.fn()}
      onResolve={vi.fn()}
      onUnacknowledge={vi.fn()}
      onSelectIds={vi.fn()}
      retry={vi.fn()}
    />
  );
}
