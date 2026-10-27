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

import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { useState } from 'react';
import { I18nextProvider } from 'react-i18next';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { i18n, initializeI18n, loadLocale } from '@/core/i18n/i18n';
import type { MonitorHistoryChart } from '../model/monitor-detail-model';
import { HistoryChartEvidence, type HistoryChartImage } from './monitor-history-chart';
import { MonitorHistoryImageButton } from './monitor-history-image-button';

const mocks = vi.hoisted(() => ({
  update: vi.fn(),
  dispose: vi.fn(),
  exportPng: vi.fn(),
  create: vi.fn(),
  save: vi.fn(),
  error: vi.fn()
}));
vi.mock('./monitor-history-chart-runtime', () => ({ createMonitorHistoryChart: mocks.create }));
vi.mock('../model/monitor-history-image-download', () => ({ saveMonitorHistoryImage: mocks.save }));
vi.mock('antd', async importOriginal => {
  const original = await importOriginal<typeof import('antd')>();
  return { ...original, App: { useApp: () => ({ message: { error: mocks.error } }) } };
});

const chart: MonitorHistoryChart = {
  metric: { key: 'summary.responseTime', group: 'summary', field: 'responseTime', unit: 'ms' },
  history: '30m',
  interval: false,
  result: { kind: 'ready', rows: [{ name: 'origin', points: [[1000, 12]] }] }
};
function Harness({ value, title = value.metric.key }: { value: MonitorHistoryChart; title?: string }) {
  const [image, setImage] = useState<HistoryChartImage>();
  return (
    <I18nextProvider i18n={i18n}>
      <MonitorHistoryImageButton chart={value} image={image} />
      <HistoryChartEvidence chart={value} title={title} onImageReady={setImage} />
    </I18nextProvider>
  );
}
function button() {
  return screen.getByRole('button', { name: i18n.t('monitorMetrics.saveImage') });
}

describe('monitor history image action', () => {
  beforeAll(async () => {
    await initializeI18n();
    await loadLocale('en-US');
  });
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.create.mockImplementation(() => ({
      update: mocks.update,
      dispose: mocks.dispose,
      exportPng: mocks.exportPng
    }));
    mocks.exportPng.mockReturnValue('data:image/png;base64,iVBORw0KGgo=');
  });
  afterEach(() => cleanup());

  it('waits for the actual runtime and captures it without an extra render or backend call', async () => {
    render(<Harness value={chart} />);
    expect(button()).toBeDisabled();
    await waitFor(() => expect(button()).toBeEnabled());
    mocks.update.mockClear();
    fireEvent.click(button());
    expect(mocks.save).toHaveBeenCalledWith('data:image/png;base64,iVBORw0KGgo=', chart);
    expect(mocks.exportPng).toHaveBeenCalledOnce();
    expect(mocks.update).not.toHaveBeenCalled();
    expect(mocks.create).toHaveBeenCalledOnce();
  });
  it('updates current series, range and mode before enabling a new download', async () => {
    const view = render(<Harness value={chart} />);
    await waitFor(() => expect(button()).toBeEnabled());
    const next: MonitorHistoryChart = {
      ...chart,
      history: '6h',
      interval: true,
      result: { kind: 'ready', rows: [{ name: 'Mean', points: [[2000, 99]] }] }
    };
    view.rerender(<Harness value={next} />);
    expect(mocks.update).toHaveBeenLastCalledWith(expect.objectContaining({ series: next.result.rows }));
    fireEvent.click(button());
    expect(mocks.save).toHaveBeenLastCalledWith(expect.any(String), next);
    view.rerender(<Harness value={{ ...next, result: { kind: 'loading', rows: [] } }} />);
    expect(button()).toBeDisabled();
    expect(mocks.dispose).toHaveBeenCalledOnce();
  });
  it('updates a translated chart title while retaining the original download identity', async () => {
    const view = render(<Harness value={chart} title="First response-time label" />);
    await waitFor(() => expect(button()).toBeEnabled());
    expect(mocks.create).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ title: 'First response-time label' })
    );
    view.rerender(<Harness value={chart} title="Updated response-time label" />);
    expect(screen.getByRole('img', { name: 'Updated response-time label' })).toHaveAttribute(
      'title',
      'summary.responseTime'
    );
    expect(mocks.update).toHaveBeenLastCalledWith(expect.objectContaining({ title: 'Updated response-time label' }));
    fireEvent.click(button());
    expect(mocks.save).toHaveBeenCalledWith(expect.any(String), chart);
    expect(mocks.create).toHaveBeenCalledOnce();
  });
  it.each(['loading', 'empty', 'error', 'unavailable', 'unsupported'] as const)('does not export %s evidence', kind => {
    render(<Harness value={{ ...chart, result: { kind, rows: [] } }} />);
    fireEvent.click(button());
    expect(button()).toBeDisabled();
    expect(mocks.save).not.toHaveBeenCalled();
    expect(mocks.create).not.toHaveBeenCalled();
  });
  it('does not export a ready result without finite plotted points', async () => {
    render(<Harness value={{ ...chart, result: { kind: 'ready', rows: [{ name: 'origin', points: [] }] } }} />);
    await waitFor(() => expect(mocks.create).toHaveBeenCalledOnce());
    expect(button()).toBeDisabled();
  });
  it('reports a localized sanitized capture error and allows a later retry', async () => {
    render(<Harness value={chart} />);
    await waitFor(() => expect(button()).toBeEnabled());
    mocks.exportPng.mockImplementationOnce(() => {
      throw new Error('private diagnostic');
    });
    fireEvent.click(button());
    expect(mocks.error).toHaveBeenCalledWith(i18n.t('monitorMetrics.saveImageError'));
    expect(mocks.save).not.toHaveBeenCalled();
    fireEvent.click(button());
    expect(mocks.save).toHaveBeenCalledOnce();
  });
  it('does not attach a late runtime after the chart unmounts', async () => {
    const view = render(<Harness value={chart} />);
    view.unmount();
    await act(async () => {
      await Promise.resolve();
    });
    expect(mocks.create).not.toHaveBeenCalled();
  });
});
