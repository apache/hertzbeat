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
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { AlertFilterDraft } from '../model/alert-center-view-model';
import { AlertCenterToolbar } from './alert-center-toolbar';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key })
}));

const draft: AlertFilterDraft = {
  search: 'latency',
  serviceName: 'checkout',
  serviceNamespace: 'shop',
  environment: 'production',
  status: 'firing',
  severity: 'warning'
};
describe('AlertCenterToolbar', () => {
  afterEach(cleanup);

  it('delegates all scope drafts and submits each field on Enter', () => {
    const callbacks = renderToolbar();
    const fields = [
      ['alert.search', 'search', 'latency', 'updated search'],
      ['instrumentation.field.serviceName', 'serviceName', 'checkout', 'billing'],
      ['instrumentation.field.serviceNamespace', 'serviceNamespace', 'shop', 'payments'],
      ['instrumentation.field.serviceEnvironment', 'environment', 'production', 'staging']
    ] as const;

    fields.forEach(([placeholder, field, initialValue, nextValue]) => {
      const input = screen.getByPlaceholderText(placeholder);
      expect(input).toHaveValue(initialValue);
      fireEvent.change(input, { target: { value: nextValue } });
      expect(callbacks.onDraftChange).toHaveBeenLastCalledWith(field, nextValue);
      fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });
    });

    expect(screen.getAllByRole('button', { name: 'close-circle' })).toHaveLength(fields.length);
    expect(callbacks.onSubmit).toHaveBeenCalledTimes(fields.length);
  });

  it('delegates status, severity, and explicit query actions', async () => {
    const callbacks = renderToolbar();
    const [statusFilter, severityFilter] = screen.getAllByRole('combobox');
    if (!statusFilter || !severityFilter) throw new Error('Expected status and severity filters');

    fireEvent.mouseDown(statusFilter);
    fireEvent.click(await screen.findByText('alert.status.resolved'));
    expect(callbacks.onDraftChange).toHaveBeenLastCalledWith('status', 'resolved');
    fireEvent.mouseDown(statusFilter);
    fireEvent.click(await screen.findByText('alert.status.all'));
    expect(callbacks.onDraftChange).toHaveBeenLastCalledWith('status', '');

    fireEvent.mouseDown(severityFilter);
    fireEvent.click(await screen.findByText('alert.severity.critical'));
    expect(callbacks.onDraftChange).toHaveBeenLastCalledWith('severity', 'critical');
    fireEvent.mouseDown(severityFilter);
    fireEvent.click(await screen.findByText('alert.severity.all'));
    expect(callbacks.onDraftChange).toHaveBeenLastCalledWith('severity', '');

    fireEvent.click(screen.getByRole('button', { name: 'common.query' }));
    expect(callbacks.onSubmit).toHaveBeenCalledTimes(1);
  });

  it('keeps service scope behind an accessible disclosure when no advanced filter is active', () => {
    renderToolbar({ ...draft, serviceName: '', serviceNamespace: '', environment: '' });

    expect(screen.getByTestId('alert-advanced-filters')).toHaveAttribute('aria-hidden', 'true');
    const disclosure = screen.getByRole('button', { name: 'alert.filters.more' });
    expect(disclosure).toHaveAttribute('aria-expanded', 'false');

    fireEvent.click(disclosure);

    expect(screen.getByTestId('alert-advanced-filters')).toHaveAttribute('aria-hidden', 'false');
    expect(screen.getByPlaceholderText('instrumentation.field.serviceName')).toBeVisible();
    expect(screen.getByPlaceholderText('instrumentation.field.serviceNamespace')).toBeVisible();
    expect(screen.getByPlaceholderText('instrumentation.field.serviceEnvironment')).toBeVisible();
  });

  it('delegates refresh without awaiting it and reflects loading state', () => {
    const callbacks = createCallbacks();
    callbacks.onRefresh.mockReturnValue(new Promise<void>(() => undefined));
    const view = render(<AlertCenterToolbar draft={draft} refreshing={false} {...callbacks} />);

    fireEvent.click(screen.getByRole('button', { name: 'common.refresh' }));
    expect(callbacks.onRefresh).toHaveBeenCalledTimes(1);

    view.rerender(<AlertCenterToolbar draft={draft} refreshing {...callbacks} />);
    const loadingRefresh = screen.getByRole('button', { name: /common\.refresh/ });
    expect(within(loadingRefresh).getByRole('img', { name: 'loading' })).toBeInTheDocument();
  });
});

function renderToolbar(nextDraft = draft) {
  const callbacks = createCallbacks();
  render(<AlertCenterToolbar draft={nextDraft} refreshing={false} {...callbacks} />);
  return callbacks;
}

function createCallbacks() {
  return {
    disabled: false,
    onDraftChange: vi.fn(),
    onSubmit: vi.fn(),
    onRefresh: vi.fn()
  };
}
