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

import { cleanup, fireEvent, render as renderComponent, screen } from '@testing-library/react';
import type { PropsWithChildren, ReactElement } from 'react';
import { I18nextProvider } from 'react-i18next';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';

import { i18n, initializeI18n, loadLocale } from '@/core/i18n/i18n';

import type { monitorRealtimeRows } from '../model/monitor-detail-model';
import { MonitorRealtimeTable } from './monitor-realtime-table';

afterEach(cleanup);

beforeAll(async () => {
  await initializeI18n();
  await loadLocale('en-US');
});

function render(component: ReactElement) {
  return renderComponent(component, { wrapper: TestLocale });
}

function TestLocale({ children }: PropsWithChildren) {
  return <I18nextProvider i18n={i18n}>{children}</I18nextProvider>;
}

function samples(count: number, suffix = ''): ReturnType<typeof monitorRealtimeRows> {
  return Array.from({ length: count }, (_, index) =>
    ['cpu', 'requests'].map(field => ({
      key: `${index}:${field}`,
      labels: { instance: `node-${index + 1}` },
      field,
      unit: null,
      value: `${field}${suffix}-${index + 1}`,
      time: 1,
      collectedAt: 1
    }))
  ).flat();
}

describe('monitor realtime sample pagination', () => {
  it('paginates samples rather than individual metric fields and reaches the last page', () => {
    render(<MonitorRealtimeTable rows={samples(23)} pending={false} group="processes" />);
    expect(screen.getAllByText(/^cpu-\d+$/)).toHaveLength(10);
    expect(screen.getByText('requests-10')).toBeVisible();
    expect(screen.queryByText('cpu-11')).not.toBeInTheDocument();
    fireEvent.click(screen.getByTitle('3'));
    expect(screen.getAllByText(/^cpu-\d+$/)).toHaveLength(3);
    expect(screen.getByText('cpu-23')).toBeVisible();
    expect(screen.getByText('requests-23')).toBeVisible();
  });

  it.each([0, 1, 10])('does not show paging controls for %i samples', count => {
    const view = render(<MonitorRealtimeTable rows={samples(count)} pending={false} />);
    expect(view.container.querySelector('.ant-pagination')).toBeNull();
    if (count) expect(screen.getByText('cpu-1')).toBeVisible();
  });

  it('keeps the current page when a realtime refresh replaces values', () => {
    const view = render(<MonitorRealtimeTable rows={samples(23)} pending={false} group="processes" />);
    fireEvent.click(screen.getByTitle('2'));
    view.rerender(<MonitorRealtimeTable rows={samples(23, '-new')} pending={false} group="processes" />);
    expect(screen.getByText('cpu-new-11')).toBeVisible();
    expect(screen.queryByText('cpu-new-1')).not.toBeInTheDocument();
  });

  it('corrects an invalid page when rows shrink and does not resurrect it when rows return', () => {
    const view = render(<MonitorRealtimeTable rows={samples(23)} pending={false} group="processes" />);
    fireEvent.click(screen.getByTitle('3'));
    view.rerender(<MonitorRealtimeTable rows={samples(12)} pending={false} group="processes" />);
    expect(screen.getByText('cpu-11')).toBeVisible();
    expect(screen.getAllByText(/^cpu-\d+$/)).toHaveLength(2);
    view.rerender(<MonitorRealtimeTable rows={samples(23)} pending={false} group="processes" />);
    expect(screen.getByText('cpu-11')).toBeVisible();
    expect(screen.queryByText('cpu-21')).not.toBeInTheDocument();
  });

  it('resets paging when the metric group changes', () => {
    const view = render(<MonitorRealtimeTable rows={samples(23)} pending={false} group="first" />);
    fireEvent.click(screen.getByTitle('2'));
    view.rerender(<MonitorRealtimeTable rows={samples(23)} pending={false} group="second" />);
    expect(screen.getByText('cpu-1')).toBeVisible();
    expect(screen.queryByText('cpu-11')).not.toBeInTheDocument();
  });

  it('returns to page one when the page size changes', async () => {
    render(<MonitorRealtimeTable rows={samples(75)} pending={false} group="processes" />);
    fireEvent.click(screen.getByTitle('3'));
    fireEvent.mouseDown(screen.getByRole('combobox'));
    fireEvent.click(await screen.findByTitle('20 / page'));
    expect(screen.getAllByText(/^cpu-\d+$/)).toHaveLength(20);
    expect(screen.getByText('cpu-1')).toBeVisible();
    expect(screen.queryByText('cpu-21')).not.toBeInTheDocument();
  });

  it('keeps the size changer available when the selected size fits every sample', async () => {
    render(<MonitorRealtimeTable rows={samples(23)} pending={false} group="processes" />);
    fireEvent.mouseDown(screen.getByRole('combobox'));
    fireEvent.click(await screen.findByTitle('50 / page'));
    expect(screen.getAllByText(/^cpu-\d+$/)).toHaveLength(23);
    fireEvent.mouseDown(screen.getByRole('combobox'));
    fireEvent.click(await screen.findByTitle('10 / page'));
    expect(screen.getAllByText(/^cpu-\d+$/)).toHaveLength(10);
  });

  it('disables paging controls while realtime data is refreshing', () => {
    render(<MonitorRealtimeTable rows={samples(23)} pending group="processes" />);
    fireEvent.click(screen.getByTitle('Next Page'));
    expect(screen.getByRole('combobox')).toBeDisabled();
    expect(screen.getByText('cpu-1')).toBeVisible();
    expect(screen.queryByText('cpu-11')).not.toBeInTheDocument();
  });
});
