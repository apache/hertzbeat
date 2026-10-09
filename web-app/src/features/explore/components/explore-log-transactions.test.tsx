/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import type { TFunction } from 'i18next';
import { ExploreLogTransactions } from './explore-log-transactions';
const rail = vi.hoisted(() => vi.fn());
const t = ((key: string) => key) as TFunction;
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});
it('quotes whitespace IDs visibly while preserving the exact native identity for detail', () => {
  const config = { version: 1 as const, field: 'attribute:requestId', limit: 20, order: 'related-count-desc' as const };
  const item = {
    identity: ' \t',
    seedCount: 1,
    relatedCount: 1,
    firstTimeUnixNano: '1000000000',
    lastTimeUnixNano: '1000000000',
    durationNanos: '0',
    maximumSeverity: 'ERROR' as const
  };
  const data = {
    window: { start: 1000, end: 2000 },
    request: { ...config, field: { id: config.field, source: 'attribute' as const, key: 'requestId' } },
    seedLogCount: 1,
    usableSeedLogCount: 1,
    oversizedSeedLogCount: 0,
    otherExcludedSeedLogCount: 0,
    transactionCount: 1,
    relatedLogCount: 1,
    truncated: false,
    items: [item]
  };
  render(
    <ExploreLogTransactions
      t={t}
      selected={undefined}
      onSelect={rail}
      buttons={{ current: new Map() }}
      load={{
        state: 'ready',
        owner: 'owner',
        data,
        config,
        window: { from: 1000, to: 2000 },
        retry: vi.fn(),
        invalidFilterReason: undefined,
        syntaxDiagnostic: undefined
      }}
    />
  );
  fireEvent.click(screen.getByRole('button', { name: JSON.stringify(item.identity) }));
  expect(rail).toHaveBeenCalledWith(' \t');
  expect(screen.getByText('0 ms')).toBeVisible();
});
