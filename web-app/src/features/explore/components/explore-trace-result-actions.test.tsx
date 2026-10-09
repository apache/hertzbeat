/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
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
