/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { MonitorRealtimeTable } from './monitor-realtime-table';

const clipboardWrite = vi.fn();

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, values?: Record<string, string>) => (values?.field == null ? key : `${key}:${values.field}`)
  })
}));

afterEach(cleanup);

describe('MonitorRealtimeTable', () => {
  beforeEach(() => {
    clipboardWrite.mockReset();
    clipboardWrite.mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: clipboardWrite }
    });
  });

  it('shows a tooltip and compact copy popover only when the value overflows', async () => {
    const value = '/opt/homebrew/var/mysql/a-very-long-runtime-directory-that-does-not-fit-in-the-cell';
    render(
      <MonitorRealtimeTable
        rows={[{ key: '0:datadir', labels: {}, field: 'datadir', unit: null, value, time: null, collectedAt: null }]}
        pending={false}
      />
    );

    const renderedValue = screen.getByText(value);
    Object.defineProperties(renderedValue, {
      clientWidth: { configurable: true, value: 90 },
      scrollWidth: { configurable: true, value: 320 }
    });

    fireEvent.mouseEnter(renderedValue);
    await waitFor(() => expect(document.querySelector('.ant-tooltip')).toHaveTextContent(value));
    expect(renderedValue).toHaveAttribute('aria-label', 'monitorMetrics.value.open:datadir');

    fireEvent.click(renderedValue);
    const dialog = await screen.findByRole('dialog', { name: 'monitorMetrics.value.title:datadir' });
    expect(dialog).toHaveTextContent(value);
    fireEvent.click(screen.getByRole('button', { name: 'monitorMetrics.value.copy' }));
    await waitFor(() => expect(clipboardWrite).toHaveBeenCalledWith(value));
    expect(await screen.findByRole('button', { name: 'monitorMetrics.value.copied' })).toBeInTheDocument();
    fireEvent.click(renderedValue);
    await waitFor(() => expect(renderedValue).toHaveAttribute('aria-expanded', 'false'));
  });

  it('keeps a fitting value as plain non-focusable table text', () => {
    render(
      <MonitorRealtimeTable
        rows={[{ key: '0:port', labels: {}, field: 'port', unit: null, value: '3306', time: null, collectedAt: null }]}
        pending={false}
      />
    );

    const renderedValue = screen.getByText('3306');
    fireEvent.mouseEnter(renderedValue);
    expect(renderedValue).not.toHaveAttribute('tabindex');
    expect(renderedValue).not.toHaveAttribute('aria-label');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('opens and dismisses the compact value popover from the keyboard', async () => {
    const value = '/opt/homebrew/var/mysql/a-very-long-runtime-directory';
    render(
      <MonitorRealtimeTable
        rows={[{ key: '0:datadir', labels: {}, field: 'datadir', unit: null, value, time: null, collectedAt: null }]}
        pending={false}
      />
    );

    const renderedValue = screen.getByText(value);
    Object.defineProperties(renderedValue, {
      clientWidth: { configurable: true, value: 80 },
      scrollWidth: { configurable: true, value: 240 }
    });
    fireEvent.focus(renderedValue);
    await waitFor(() => expect(renderedValue).toHaveAttribute('tabindex', '0'));
    expect(await screen.findByRole('tooltip')).toHaveTextContent(value);

    fireEvent.keyDown(renderedValue, { key: 'Enter' });
    expect(await screen.findByRole('dialog', { name: 'monitorMetrics.value.title:datadir' })).toBeInTheDocument();
    fireEvent.keyDown(renderedValue, { key: 'Escape' });
    await waitFor(() => expect(renderedValue).toHaveAttribute('aria-expanded', 'false'));
  });
});
