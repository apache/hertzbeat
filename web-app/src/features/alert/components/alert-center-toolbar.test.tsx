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

import type { AlertQuery } from '../model/alert-model';
import type { AlertFilterDraft } from '../model/alert-center-view-model';
import { AlertCenterToolbar } from './alert-center-toolbar';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key })
}));

const draft: AlertFilterDraft = {
  search: 'latency',
  serviceName: 'checkout',
  serviceNamespace: 'shop',
  environment: 'production'
};
const query: AlertQuery = {
  ...draft,
  status: 'firing',
  severity: 'warning',
  pageIndex: 0,
  pageSize: 8
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
    expect(callbacks.onStatusChange.mock.calls[0]?.[0]).toBe('resolved');
    fireEvent.mouseDown(statusFilter);
    fireEvent.click(await screen.findByText('alert.status.all'));
    expect(callbacks.onStatusChange.mock.calls[1]?.[0]).toBe('');

    fireEvent.mouseDown(severityFilter);
    fireEvent.click(await screen.findByText('alert.severity.critical'));
    expect(callbacks.onSeverityChange.mock.calls[0]?.[0]).toBe('critical');
    fireEvent.mouseDown(severityFilter);
    fireEvent.click(await screen.findByText('alert.severity.all'));
    expect(callbacks.onSeverityChange.mock.calls[1]?.[0]).toBe('');

    fireEvent.click(screen.getByRole('button', { name: 'common.query' }));
    expect(callbacks.onSubmit).toHaveBeenCalledTimes(1);
  });

  it('delegates refresh without awaiting it and reflects loading state', () => {
    const callbacks = createCallbacks();
    callbacks.onRefresh.mockReturnValue(new Promise<void>(() => undefined));
    const view = render(<AlertCenterToolbar draft={draft} query={query} refreshing={false} {...callbacks} />);

    fireEvent.click(screen.getByRole('button', { name: 'common.refresh' }));
    expect(callbacks.onRefresh).toHaveBeenCalledTimes(1);

    view.rerender(<AlertCenterToolbar draft={draft} query={query} refreshing {...callbacks} />);
    const loadingRefresh = screen.getByRole('button', { name: /common\.refresh/ });
    expect(within(loadingRefresh).getByRole('img', { name: 'loading' })).toBeInTheDocument();
  });
});

function renderToolbar() {
  const callbacks = createCallbacks();
  render(<AlertCenterToolbar draft={draft} query={query} refreshing={false} {...callbacks} />);
  return callbacks;
}

function createCallbacks() {
  return {
    onDraftChange: vi.fn(),
    onSubmit: vi.fn(),
    onStatusChange: vi.fn(),
    onSeverityChange: vi.fn(),
    onRefresh: vi.fn()
  };
}
