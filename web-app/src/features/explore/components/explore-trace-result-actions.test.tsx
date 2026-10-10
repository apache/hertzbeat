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
import { afterEach, describe, expect, it, vi } from 'vitest';
import { traceEvidenceFixture } from '@/test/trace-evidence-fixtures';
import { saveBrowserDownload } from '@/shared/browser-download';
import { ExploreTraceResultActions } from './explore-trace-result-actions';
vi.mock('@/shared/browser-download', async original => ({
  ...(await original<typeof import('@/shared/browser-download')>()),
  saveBrowserDownload: vi.fn()
}));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});
describe('current-page trace export action', () => {
  it('names the current page and disables export while stale or empty', () => {
    const data = { content: [traceEvidenceFixture()], number: 2, size: 20, totalElements: 100, totalPages: 5 };
    const view = render(<ExploreTraceResultActions data={data} evidenceCurrent />);
    fireEvent.click(screen.getByRole('button', { name: 'exploreTrace.exportCurrentPage' }));
    expect(saveBrowserDownload).toHaveBeenCalledWith({
      filename: 'hertzbeat-traces-page-3.csv',
      data: expect.any(Blob)
    });
    view.rerender(<ExploreTraceResultActions data={data} evidenceCurrent={false} />);
    expect(screen.getByRole('button')).toBeDisabled();
    view.rerender(<ExploreTraceResultActions data={{ ...data, content: [] }} evidenceCurrent />);
    expect(screen.getByRole('button')).toBeDisabled();
  });
});
