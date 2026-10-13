/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License.  You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

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
