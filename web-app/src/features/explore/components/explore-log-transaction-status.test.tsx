/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { TFunction } from 'i18next';
import { afterEach, expect, it, vi } from 'vitest';
import en from '@/assets/i18n/en-us.json';
import exploreEn from '@/assets/i18n/explore/en-us.json';
import { LogTransactionStatus } from './explore-log-transaction-status';

afterEach(cleanup);

it('shows a translated retry action when transaction storage is unavailable', () => {
  const retry = vi.fn();
  const t = ((key: string) =>
    key === 'common.retry'
      ? en.common.retry
      : key === 'explore.logAnalysis.unavailable'
        ? exploreEn.explore.logAnalysis.unavailable
        : key) as TFunction;
  render(<LogTransactionStatus state="unavailable" retry={retry} t={t} />);
  expect(screen.getByText(exploreEn.explore.logAnalysis.unavailable)).toBeVisible();
  fireEvent.click(screen.getByRole('button', { name: en.common.retry }));
  expect(retry).toHaveBeenCalledOnce();
});
