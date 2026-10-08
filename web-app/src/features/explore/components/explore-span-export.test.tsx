/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { saveBrowserDownload } from '@/shared/browser-download';
import type { TraceSpanRow } from '../model/explore-trace-analytics';
import { ExploreSpanExport } from './explore-span-export';
vi.mock('@/shared/browser-download', async original => ({
  ...(await original<typeof import('@/shared/browser-download')>()),
  saveBrowserDownload: vi.fn()
}));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});
it('exports only the supplied current page and disables stale or empty exports', () => {
  const row: TraceSpanRow = {
    traceId: 'a'.repeat(32),
    spanId: 'b'.repeat(16),
    parentSpanId: null,
    serviceName: 'checkout',
    serviceNamespace: null,
    environment: null,
    operationName: 'GET /',
    spanKind: 'SERVER',
    status: 'ERROR',
    startTimeUnixNano: '1000000001',
    durationNanos: '2'
  };
  const view = render(<ExploreSpanExport rows={[row]} pageIndex={2} current />);
  fireEvent.click(screen.getByRole('button'));
  expect(saveBrowserDownload).toHaveBeenCalledWith({ filename: 'hertzbeat-spans-page-3.csv', data: expect.any(Blob) });
  view.rerender(<ExploreSpanExport rows={[row]} pageIndex={2} current={false} />);
  expect(screen.getByRole('button')).toBeDisabled();
  view.rerender(<ExploreSpanExport rows={[]} pageIndex={0} current />);
  expect(screen.getByRole('button')).toBeDisabled();
});
