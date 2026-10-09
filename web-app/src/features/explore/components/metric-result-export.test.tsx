/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { TFunction } from 'i18next';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { MetricResultExport } from './metric-result-export';

const save = vi.hoisted(() => vi.fn());
vi.mock('@/shared/browser-download', async importOriginal => ({
  ...(await importOriginal<typeof import('@/shared/browser-download')>()),
  saveBrowserDownload: save
}));
const t = ((key: string) => key) as TFunction;
const window = { from: 1000, to: 2000 };

beforeEach(() => save.mockReset());
afterEach(cleanup);

it('downloads all returned samples, including rows beyond the table preview', async () => {
  render(
    <MetricResultExport
      series={[
        {
          key: 'a',
          refId: 'a',
          name: 'latency',
          labels: { host: 'one' },
          points: Array.from({ length: 101 }, (_, i) => [1000 + i, i])
        }
      ]}
      received={101}
      timeWindow={window}
      executedQuery={'latency{host="one"}'}
      t={t}
    />
  );
  fireEvent.click(screen.getByRole('button', { name: 'exploreMetric.exportCsv' }));
  expect(save).toHaveBeenCalledOnce();
  const artifact = save.mock.calls[0]![0] as { filename: string; data: Blob };
  expect(artifact.filename).toBe('hertzbeat-metrics-1000-2000.csv');
  expect((await artifact.data.text()).split('\r\n')).toHaveLength(102);
});

it('disables export for no returned samples', () => {
  render(<MetricResultExport series={[]} received={0} timeWindow={window} executedQuery={null} t={t} />);
  expect(screen.getByRole('button', { name: 'exploreMetric.exportCsv' })).toBeDisabled();
});

it('shows an explicit size error without starting a partial download', () => {
  render(
    <MetricResultExport
      series={[{ key: 'a', name: 'x'.repeat(8 * 1024 * 1024), labels: {}, points: [[1000, 1]] }]}
      received={1}
      timeWindow={window}
      executedQuery={null}
      t={t}
    />
  );
  fireEvent.click(screen.getByRole('button', { name: 'exploreMetric.exportCsv' }));
  expect(save).not.toHaveBeenCalled();
  expect(screen.getByRole('alert')).toHaveTextContent('exploreMetric.exportCsvTooLarge');
});
